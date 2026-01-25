import type { Express, Request } from "express";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { z } from "zod";
import multer from "multer";
import { isAuthenticated } from "./replitAuth";
import { generateWithFallback } from "./services/ai";
import { extractTextFromPDFRobust } from "./services/pdf-extraction";

// ============================================================================
// GOOGLE TTS CLIENT INITIALIZATION
// ============================================================================

let ttsClient: TextToSpeechClient;

try {
    // Method 1: Using credentials file (development)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        ttsClient = new TextToSpeechClient({
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        });
        console.log("[GOOGLE-TTS] Initialized with credentials file");
    }
    // Method 2: Using inline JSON (production - Vercel)
    else if (process.env.GOOGLE_TTS_CREDENTIALS) {
        const credentials = JSON.parse(process.env.GOOGLE_TTS_CREDENTIALS);
        ttsClient = new TextToSpeechClient({ credentials });
        console.log("[GOOGLE-TTS] Initialized with inline credentials");
    } else {
        console.warn("Google TTS credentials not configured - TTS features will be disabled");
    }
} catch (error: any) {
    console.error("[GOOGLE-TTS] Initialization failed:", error.message);
}

// ============================================================================
// ITALIAN VOICE CONFIGURATION
// ============================================================================

const ITALIAN_VOICES = {
    rigorous: {
        name: "Prof. Bianchi",
        voiceName: "it-IT-Neural2-C", // Male voice
        description: "Professore rigoroso e preciso",
    },
    empathetic: {
        name: "Prof.ssa Verdi",
        voiceName: "it-IT-Neural2-A", // Female voice
        description: "Professoressa empatica e incoraggiante",
    },
};

// ============================================================================
// IN-MEMORY SESSION STORAGE (Replace with database in production)
// ============================================================================

interface OralExamSession {
    id: string;
    userId: string;
    concorsoId: string;
    persona: "rigorous" | "empathetic";
    topics: string[];
    difficulty: "easy" | "medium" | "hard";
    maxTurns: number;
    currentTurn: number;
    messages: Array<{ role: "user" | "instructor"; content: string }>;
    context: string;
    status: "active" | "completed";
    createdAt: Date;
}

const sessions = new Map<string, OralExamSession>();

// ============================================================================
// REALISTIC EVALUATION SYSTEM
// ============================================================================

interface EvaluationCriteria {
    completeness: number; // 0-10: risposta completa?
    accuracy: number; // 0-10: risposta corretta?
    clarity: number; // 0-10: espressione chiara?
    depth: number; // 0-10: approfondimento?
}

function evaluateResponse(
    question: string,
    userAnswer: string,
    expectedTopics: string[]
): EvaluationCriteria {
    const answerLength = userAnswer.trim().split(/\s+/).length;

    // Penalizza risposte troppo brevi o troppo lunghe
    let completeness = 5;
    if (answerLength < 20) completeness = 3;
    else if (answerLength < 50) completeness = 5;
    else if (answerLength < 100) completeness = 7;
    else if (answerLength < 200) completeness = 9;
    else completeness = 10;

    // Valuta presenza di parole chiave
    const topicMentioned = expectedTopics.some((topic) =>
        userAnswer.toLowerCase().includes(topic.toLowerCase())
    );
    const accuracy = topicMentioned ? 7 : 4;

    // Valuta chiarezza (presenza di frasi strutturate)
    const hasPunctuation = /[.!?]/.test(userAnswer);
    const clarity = hasPunctuation ? 7 : 5;

    // Profondità (presenza di esempi o dettagli)
    const hasExamples = /ad esempio|per esempio|infatti|inoltre/i.test(userAnswer);
    const depth = hasExamples ? 8 : 5;

    return { completeness, accuracy, clarity, depth };
}

function calculateRealisticScore(
    allEvaluations: EvaluationCriteria[]
): number {
    if (allEvaluations.length === 0) return 18; // Minimo sindacale

    const avgCompleteness =
        allEvaluations.reduce((sum, e) => sum + e.completeness, 0) /
        allEvaluations.length;
    const avgAccuracy =
        allEvaluations.reduce((sum, e) => sum + e.accuracy, 0) /
        allEvaluations.length;
    const avgClarity =
        allEvaluations.reduce((sum, e) => sum + e.clarity, 0) /
        allEvaluations.length;
    const avgDepth =
        allEvaluations.reduce((sum, e) => sum + e.depth, 0) / allEvaluations.length;

    // Formula realistica: peso maggiore su accuratezza e completezza
    const rawScore =
        avgAccuracy * 0.4 +
        avgCompleteness * 0.3 +
        avgClarity * 0.2 +
        avgDepth * 0.1;

    // Converti in scala 18-30
    const finalScore = Math.round(18 + (rawScore / 10) * 12);

    // Applica soglie realistiche
    if (avgAccuracy < 4 || avgCompleteness < 4) return 18; // Insufficiente grave
    if (avgAccuracy < 6) return Math.min(finalScore, 23); // Cap a 23 se impreciso
    if (avgAccuracy >= 9 && avgCompleteness >= 9) return Math.max(finalScore, 28); // Premio eccellenza

    return Math.max(18, Math.min(30, finalScore));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getUserId(req: Request): string {
    const user = req.user as any;
    return user?.id || user?.claims?.sub;
}

function generateSessionId(): string {
    return `oral-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// ============================================================================
// MULTER SETUP FOR PDF UPLOAD
// ============================================================================

const pdfUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Solo file PDF sono supportati"));
        }
    },
});

// ============================================================================
// AUDIO TRANSCRIPTION SETUP (Whisper)
// ============================================================================

const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// ============================================================================
// ROUTES
// ============================================================================

export function registerOralExamRoutes(app: Express) {

    // ==========================================================================
    // START ORAL EXAM SESSION
    // ==========================================================================

    app.post("/api/oral-exam/start", isAuthenticated, async (req, res) => {
        try {
            const userId = getUserId(req);
            const schema = z.object({
                concorsoId: z.string(),
                persona: z.enum(["rigorous", "empathetic"]),
                topics: z.array(z.string()).min(1),
                difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
                maxTurns: z.number().min(3).max(10).default(5),
                context: z.string().optional(),
            });

            const data = schema.parse(req.body);
            const sessionId = generateSessionId();

            // Generate first question with NATURAL, DIRECT tone
            const systemPrompt = `Sei ${ITALIAN_VOICES[data.persona].name}, ${ITALIAN_VOICES[data.persona].description}.

RUOLO: Stai conducendo un esame orale con uno STUDENTE seduto davanti a te.

TONO RICHIESTO:
- Parla DIRETTAMENTE allo studente usando "tu" o "lei" (formale)
- Sii NATURALE e COLLOQUIALE, come in un vero esame
- NON parlare in terza persona
- NON usare tono robotico o formale eccessivo

STILE CONVERSAZIONE:
${data.persona === "rigorous"
                    ? `- Diretto e professionale
- Vai dritto al punto
- Esempio: "Spiegami il principio di..."`
                    : `- Incoraggiante e supportivo
- Rassicurante ma competente
- Esempio: "Iniziamo con una domanda: puoi dirmi..."`
                }

CONTESTO ESAME:
Argomenti: ${data.topics.join(", ")}
${data.context ? `Materiale di riferimento: ${data.context.substring(0, 500)}` : ""}

COMPITO:
Genera LA PRIMA DOMANDA dell'esame orale.
- Domanda chiara e specifica su uno degli argomenti
- Linguaggio diretto rivolto allo studente
- NO introduzioni lunghe, vai alla domanda`;

            const firstQuestion = await generateWithFallback({
                // @ts-ignore - 'oral_exam_question' might not be in the Task type definition yet
                task: "oral_exam_question",
                systemPrompt,
                userPrompt: `Genera la prima domanda d'esame per lo studente.`,
                temperature: 0.7,
                responseMode: "text",
            });

            // Store session
            const session: OralExamSession = {
                id: sessionId,
                userId,
                concorsoId: data.concorsoId,
                persona: data.persona,
                topics: data.topics,
                difficulty: data.difficulty,
                maxTurns: data.maxTurns,
                currentTurn: 1,
                messages: [{ role: "instructor", content: firstQuestion || "Buongiorno, iniziamo l'esame. Mi parli del primo argomento in programma." }],
                context: data.context || "",
                status: "active",
                createdAt: new Date(),
            };

            sessions.set(sessionId, session);

            res.json({
                sessionId,
                firstMessage: firstQuestion,
                currentTurn: 1,
                maxTurns: data.maxTurns,
            });
        } catch (error: any) {
            console.error("[ORAL-EXAM] Start error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // ==========================================================================
    // SEND MESSAGE (Student Answer)
    // ==========================================================================

    app.post("/api/oral-exam/:sessionId/message", isAuthenticated, async (req, res) => {
        try {
            const { sessionId } = req.params;
            const { content } = req.body;
            const userId = getUserId(req);

            const session = sessions.get(sessionId);
            if (!session || session.userId !== userId) {
                return res.status(404).json({ error: "Sessione non trovata" });
            }

            if (session.status === "completed") {
                return res.status(400).json({ error: "Esame già completato" });
            }

            // Add user message
            session.messages.push({ role: "user", content });

            // Evaluate response
            const evaluation = evaluateResponse(
                session.messages[session.messages.length - 2]?.content || "",
                content,
                session.topics
            );

            // Generate next question or feedback with FULL CONTEXT
            const isLastTurn = session.currentTurn >= session.maxTurns;

            const systemPrompt = `Sei ${ITALIAN_VOICES[session.persona].name}, ${ITALIAN_VOICES[session.persona].description}.

CONTESTO COMPLETO CONVERSAZIONE:
${session.messages.map((m, i) => `${i % 2 === 0 ? "TU" : "STUDENTE"}: ${m.content}`).join("\n\n")}

ULTIMA RISPOSTA STUDENTE:
"${content}"

VALUTAZIONE AUTOMATICA:
- Completezza: ${evaluation.completeness}/10
- Accuratezza: ${evaluation.accuracy}/10
- Chiarezza: ${evaluation.clarity}/10
- Profondità: ${evaluation.depth}/10

COMPITO:
${isLastTurn
                    ? `Concludi l'esame con un commento finale breve e diretto sulle risposte dello studente.`
                    : `Genera la PROSSIMA domanda basandoti su:
1. La risposta appena data
2. Le domande precedenti
3. Gli argomenti ancora da coprire: ${session.topics.join(", ")}

STILE:
- Parla DIRETTAMENTE allo studente
- Sii NATURALE come in un vero esame
- Se la risposta era incompleta, fai una domanda di approfondimento
- Se la risposta era buona, passa ad un nuovo aspetto
- NO tono robotico`
                }`;

            const aiResponse = await generateWithFallback({
                // @ts-ignore
                task: "oral_exam_followup",
                systemPrompt,
                userPrompt: isLastTurn
                    ? "Concludi l'esame con feedback finale diretto"
                    : "Genera la prossima domanda basandoti sulla risposta dello studente",
                temperature: 0.8,
                responseMode: "text",
            });

            // Add AI response
            session.messages.push({ role: "instructor", content: aiResponse || "Grazie per la risposta. Proseguiamo." });
            session.currentTurn++;

            if (isLastTurn) {
                session.status = "completed";
            }

            res.json({
                message: aiResponse,
                currentTurn: session.currentTurn,
                isCompleted: session.status === "completed",
            });
        } catch (error: any) {
            console.error("[ORAL-EXAM] Message error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // ==========================================================================
    // END SESSION & GET FEEDBACK
    // ==========================================================================

    app.post("/api/oral-exam/:sessionId/end", isAuthenticated, async (req, res) => {
        try {
            const { sessionId } = req.params;
            const userId = getUserId(req);

            const session = sessions.get(sessionId);
            if (!session || session.userId !== userId) {
                return res.status(404).json({ error: "Sessione non trovata" });
            }

            // Evaluate all user responses
            const evaluations: EvaluationCriteria[] = [];
            for (let i = 1; i < session.messages.length; i += 2) {
                if (session.messages[i]?.role === "user") {
                    const question = session.messages[i - 1]?.content || "";
                    const answer = session.messages[i].content;
                    evaluations.push(evaluateResponse(question, answer, session.topics));
                }
            }

            // Calculate REALISTIC score
            const finalScore = calculateRealisticScore(evaluations);

            // Generate detailed feedback
            const avgEval = evaluations.reduce(
                (acc, e) => ({
                    completeness: acc.completeness + e.completeness,
                    accuracy: acc.accuracy + e.accuracy,
                    clarity: acc.clarity + e.clarity,
                    depth: acc.depth + e.depth,
                }),
                { completeness: 0, accuracy: 0, clarity: 0, depth: 0 }
            );

            Object.keys(avgEval).forEach((key) => {
                avgEval[key as keyof typeof avgEval] /= evaluations.length;
            });

            const strengths: string[] = [];
            const weaknesses: string[] = [];

            if (avgEval.completeness >= 7) strengths.push("Risposte complete e articolate");
            else weaknesses.push("Sviluppare risposte più complete");

            if (avgEval.accuracy >= 7) strengths.push("Contenuti corretti e pertinenti");
            else weaknesses.push("Rivedere accuratezza dei concetti");

            if (avgEval.clarity >= 7) strengths.push("Esposizione chiara e organizzata");
            else weaknesses.push("Migliorare chiarezza espositiva");

            if (avgEval.depth >= 7) strengths.push("Buon livello di approfondimento");
            else weaknesses.push("Approfondire maggiormente gli argomenti");

            const feedback = {
                score: finalScore,
                overallComment:
                    finalScore >= 27
                        ? "Ottima preparazione. Hai dimostrato padronanza degli argomenti."
                        : finalScore >= 24
                            ? "Buona preparazione. Alcuni aspetti possono essere migliorati."
                            : finalScore >= 21
                                ? "Preparazione discreta. Necessario maggiore studio su alcuni temi."
                                : "Preparazione insufficiente. Rivedere approfonditamente gli argomenti.",
                strengths,
                weaknesses,
            };

            session.status = "completed";

            res.json({ feedback, score: finalScore });
        } catch (error: any) {
            console.error("[ORAL-EXAM] End error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // ==========================================================================
    // GOOGLE TTS ENDPOINT (Italian Native Voice)
    // ==========================================================================

    app.post("/api/oral-exam/tts", async (req, res) => {
        try {
            if (!ttsClient) {
                return res.status(503).json({ error: "Google TTS non configurato" });
            }

            const { text, persona, speed = 1.0 } = req.body;

            if (!text) {
                return res.status(400).json({ error: "Text required" });
            }

            const voiceConfig = ITALIAN_VOICES[persona as keyof typeof ITALIAN_VOICES] || ITALIAN_VOICES.rigorous;

            const [response] = await ttsClient.synthesizeSpeech({
                input: { text },
                voice: {
                    languageCode: "it-IT",
                    name: voiceConfig.voiceName,
                },
                audioConfig: {
                    audioEncoding: "MP3",
                    speakingRate: Math.max(0.25, Math.min(4.0, speed)), // Clamp between 0.25 and 4.0
                    pitch: 0,
                    volumeGainDb: 0,
                },
            });

            if (!response.audioContent) {
                throw new Error("No audio generated");
            }

            res.set({
                "Content-Type": "audio/mpeg",
                "Content-Length": response.audioContent.length,
            });

            res.send(response.audioContent);
        } catch (error: any) {
            console.error("[GOOGLE-TTS] Error:", error);
            res.status(500).json({ error: "TTS generation failed", details: error.message });
        }
    });

    // ==========================================================================
    // WHISPER TRANSCRIPTION ENDPOINT
    // ==========================================================================

    app.post(
        "/api/oral-exam/transcribe",
        isAuthenticated,
        audioUpload.single("audio"),
        async (req: any, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: "No audio file provided" });
                }

                console.log(`[WHISPER] Transcribing audio: ${req.file.size} bytes`);

                // Call OpenAI Whisper API
                const formData = new FormData();
                const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
                formData.append("file", audioBlob, "audio.webm");
                formData.append("model", "whisper-1");
                formData.append("language", "it");
                formData.append("response_format", "verbose_json");
                formData.append("temperature", "0");

                const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
                if (!apiKey) {
                    throw new Error("OpenAI API key not configured");
                }

                const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: formData,
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Whisper API error: ${error}`);
                }

                const result = await response.json();

                console.log(`[WHISPER] Transcription: "${result.text}"`);

                res.json({
                    text: result.text,
                    language: result.language,
                    duration: result.duration,
                    segments: result.segments,
                });
            } catch (error: any) {
                console.error("[WHISPER] Transcription error:", error);
                res.status(500).json({ error: "Transcription failed", details: error.message });
            }
        }
    );

    // ==========================================================================
    // PDF UPLOAD ENDPOINT
    // ==========================================================================

    app.post(
        "/api/oral-exam/upload-pdf",
        isAuthenticated,
        pdfUpload.single("file"),
        async (req: any, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: "No file uploaded" });
                }

                const result = await extractTextFromPDFRobust(req.file.buffer);

                res.json({
                    text: result.text,
                    pages: result.pageCount,
                    method: result.method,
                });
            } catch (error: any) {
                console.error("[PDF-UPLOAD] Error:", error);
                res.status(500).json({ error: "PDF processing failed" });
            }
        }
    );

    console.log("[ORAL-EXAM] Routes registered successfully");
}
