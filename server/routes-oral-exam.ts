import type { Express, Request } from "express";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { z } from "zod";
import multer from "multer";
import { isAuthenticated } from "./replitAuth";
import { generateWithFallback } from "./services/ai";
import { extractTextFromPDFRobust } from "./services/pdf-extraction";
import { storageOralExam } from "./storage-oral-exam";

// ============================================================================
// ITALIAN VOICE CONFIGURATION (Google Neural2)
// ============================================================================

const ITALIAN_VOICES = {
    rigorous: {
        name: "Prof. Bianchi",
        voiceName: "it-IT-Neural2-C", // Male voice (Deep)
        description: "Professore rigoroso e preciso",
    },
    empathetic: {
        name: "Prof.ssa Verdi",
        voiceName: "it-IT-Neural2-A", // Female voice (Warm)
        description: "Professoressa empatica e incoraggiante",
    },
};

// ============================================================================
// SESSION STORAGE (Database-backed via storageOralExam)
// ============================================================================

// ============================================================================
// AI-POWERED EVALUATION SYSTEM
// ============================================================================

interface EvaluationCriteria {
    completeness: number; // 0-10
    accuracy: number; // 0-10
    clarity: number; // 0-10
    depth: number; // 0-10
    comment: string;
}

async function evaluateResponseWithAI(
    question: string,
    userAnswer: string,
    context: string
): Promise<EvaluationCriteria> {
    try {
        const systemPrompt = `Sei un esperto valutatore di esami universitari.
Il tuo compito è analizzare la risposta di uno studente e assegnare voti oggettivi (0-10).

CRITERI DI VALUTAZIONE:
- Accuracy (0-10): Correttezza fattuale. 0=errato, 10=perfetto.
- Completeness (0-10): Completezza rispetto alla domanda.
- Clarity (0-10): Proprietà di linguaggio ed esposizione.
- Depth (0-10): Livello di approfondimento e collegamenti.

INPUT:
Domanda Docente: "${question}"
Risposta Studente: "${userAnswer}"
Contesto Esame: "${context.substring(0, 300)}..."

OUTPUT RICHIESTO:
Rispondi SOLO con un JSON valido nel seguente formato:
{
  "accuracy": number,
  "completeness": number,
  "clarity": number,
  "depth": number,
  "comment": "breve commento tecnico (max 1 frasi) sugli errori o pregi principali"
}`;

        const jsonResponse = await generateWithFallback({
            task: "oral_exam_evaluate",
            systemPrompt,
            userPrompt: "Valuta la risposta dello studente.",
            temperature: 0.1,
            responseMode: "json",
            jsonRoot: "object"
        });

        const parsed = JSON.parse(jsonResponse);
        return {
            accuracy: Number(parsed.accuracy) || 5,
            completeness: Number(parsed.completeness) || 5,
            clarity: Number(parsed.clarity) || 5,
            depth: Number(parsed.depth) || 5,
            comment: parsed.comment || "Nessun commento specifico."
        };
    } catch (error) {
        console.error("[ORAL-EXAM] AI Evaluation failed, using fallback:", error);
        const length = userAnswer.length;
        const score = Math.min(10, Math.floor(length / 20));
        return {
            accuracy: score,
            completeness: score,
            clarity: 6,
            depth: score > 7 ? 6 : 4,
            comment: "Valutazione automatica (fallback attivo)."
        };
    }
}

function calculateFinalScore(evaluations: EvaluationCriteria[]): number {
    if (evaluations.length === 0) return 18;

    const avg = (key: keyof EvaluationCriteria) =>
        evaluations.reduce((sum, e) => sum + (e[key] as number), 0) / evaluations.length;

    const accuracy = avg("accuracy");
    const completeness = avg("completeness");
    const clarity = avg("clarity");
    const depth = avg("depth");

    // Weighted average: Accuracy is king
    const rawScore0to10 = (accuracy * 0.45) + (completeness * 0.3) + (clarity * 0.15) + (depth * 0.1);

    let finalScore;
    if (rawScore0to10 < 5) {
        finalScore = 17; // Insufficient
    } else {
        finalScore = 18 + ((rawScore0to10 - 5) / 5) * 12;
    }

    return Math.round(Math.min(30, Math.max(10, finalScore)));
}


// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function cleanAIResponse(text: string): string {
    if (!text) return "";
    // Remove prefixes like "DOCENTE:", "Prof. Bianchi:", "RISPOSTA:", etc.
    return text
        .replace(/^(DOCENTE|PROFESSORE|PROF\.|INTERVISTATORE|TUTOR|BIANCHI|VERDI|MODERATORE)(\s*:|\s+-|\s+)/i, '')
        .replace(/^["']|["']$/g, '')
        .trim();
}

function getUserId(req: Request): string {
    const user = req.user as any;
    return user?.id || user?.claims?.sub;
}

function generateSessionId(): string {
    return `oral-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// ============================================================================
// MULTER SETUP
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

const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// ============================================================================
// ROUTES
// ============================================================================

export function registerOralExamRoutes(app: Express) {

    // ==========================================================================
    // START SESSION
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

            const voice = ITALIAN_VOICES[data.persona];

            const systemPrompt = `Sei ${voice.name}, ${voice.description}.
Stai esaminando uno studente universitario.

CONTESTO:
Argomenti: ${data.topics.join(", ")}
Difficoltà: ${data.difficulty}
Materiale Extra: ${data.context ? data.context.substring(0, 500) : "Nessuno"}

OBIETTIVO:
Inizia l'esame con una domanda specifica e pertinente su uno degli argomenti.

REGOLE DI TONO (CRITICHE):
1. **NON iniziare MAI la frase con "DOCENTE:", "PROFESSORE:" o il tuo nome.**
2. Parla DIRETTAMENTE allo studente.
3. Usa un tono parlato naturale, con pause (virgole) e intonazione adatta.
4. Sii colloquiale ma professionale. Evita "Buongiorno" o saluti standard. Vai DRITTO ALLA DOMANDA.
5. Usa il "Lei" o il "Tu" in base al tuo personaggio (${data.persona === 'rigorous' ? 'Lei formale' : 'Tu informale'}).
6. Domanda aperta ma focalizzata concettualmente.`;

            const rawFirstQuestion = await generateWithFallback({
                task: "oral_exam_question",
                systemPrompt,
                userPrompt: "Fai la prima domanda allo studente.",
                temperature: 0.8,
            });

            const firstQuestion = cleanAIResponse(rawFirstQuestion); // Apply cleaning

            // Persist session to database
            await storageOralExam.createSession({
                id: sessionId,
                userId,
                concorsoId: data.concorsoId,
                persona: data.persona,
                topics: data.topics,
                difficulty: data.difficulty,
                maxTurns: data.maxTurns,
                currentTurn: 1,
                messages: [{ role: "instructor", content: firstQuestion }] as any,
                status: "active",
            });

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
    // SEND MESSAGE & EVALUATE
    // ==========================================================================

    app.post("/api/oral-exam/:sessionId/message", isAuthenticated, async (req, res) => {
        try {
            const { sessionId } = req.params;
            const { content } = req.body;
            const userId = getUserId(req);

            const session = await storageOralExam.getSessionByUser(sessionId, userId);
            if (!session) {
                return res.status(404).json({ error: "Sessione non trovata" });
            }

            if (session.status === "completed") {
                return res.status(400).json({ error: "Esame già completato" });
            }

            // Cast jsonb fields
            const messages = (session.messages as any[]) || [];
            const evaluations = (session.evaluations as EvaluationCriteria[]) || [];
            const topics = (session.topics as string[]) || [];

            // 1. Store User Answer
            messages.push({ role: "user", content });

            // 2. AI Evaluation
            const lastQuestion = messages[messages.length - 2]?.content || "";
            const evaluation = await evaluateResponseWithAI(lastQuestion, content, topics.join(", "));
            evaluations.push(evaluation);

            console.log(`[ORAL-EXAM] Eval Turn ${session.currentTurn}:`, evaluation);

            // 3. Generate Next Question
            const isLastTurn = (session.currentTurn || 0) >= (session.maxTurns || 5);
            const voice = ITALIAN_VOICES[session.persona as keyof typeof ITALIAN_VOICES];

            const systemPrompt = `Sei ${voice.name}, ${voice.description}.
Stai interrogando uno studente sugli argomenti: ${topics.join(", ")}.

STORIA ESAME:
${messages.map((m: any) => `${m.role === 'instructor' ? 'DOCENTE' : 'STUDENTE'}: ${m.content}`).join("\n")}

ULTIMA VALUTAZIONE (NASCOSTA ALLO STUDENTE):
Accuratezza: ${evaluation.accuracy}/10
Critica: ${evaluation.comment}

ISTRUZIONI:
${isLastTurn
                    ? "L'esame è finito. Congeda lo studente con un commento secco e professionale (senza dare il voto numerico ora)."
                    : `Continua l'esame.
- Se l'accuratezza è BASSA (<6): Incalza lo studente sullo stesso punto o chiedi chiarimenti. Sii severo.
- Se l'accuratezza è ALTA (>8): Passa a un altro argomento o fai una domanda più difficile per testare l'eccellenza.
- Stile: Naturale, fluido, incalzante. Evita ripetizioni ("Bene", "Ok").
- REGOLE CRITICHE:
  1. **NON scrivere "DOCENTE:" all'inizio.**
  2. Parla come una persona reale, non un robot.
  3. RISPONDI DIRETTAMENTE CON LA PROSSIMA DOMANDA.
  4. **CONTROLLO NOVITÀ GENERALE**: Analizza la STORIA ESAME. Se una domanda concettualmente simile è già stata fatta, DEVI SCARTARLA e chiederne una completamente diversa.
  5. **VARIAZIONE**: Se l'argomento è lo stesso, cambia angolo (es. dalla teoria passa alla pratica/esempi). NON chiedere la stessa definizione due volte.`}`;

            const rawAiResponse = await generateWithFallback({
                task: "oral_exam_question",
                systemPrompt,
                userPrompt: isLastTurn ? "Concludi esame." : "Fai la prossima domanda.",
                temperature: 0.7,
            });

            const aiResponse = cleanAIResponse(rawAiResponse); // Apply cleaning

            messages.push({ role: "instructor", content: aiResponse });
            const newTurn = (session.currentTurn || 0) + 1;
            const newStatus = isLastTurn ? "completed" : session.status;

            // Persist updated session to database
            await storageOralExam.updateSession(sessionId, userId, {
                messages: messages as any,
                evaluations: evaluations as any,
                currentTurn: newTurn,
                status: newStatus,
            });

            res.json({
                message: aiResponse,
                currentTurn: newTurn,
                isCompleted: newStatus === "completed",
                debugEval: evaluation
            });

        } catch (error: any) {
            console.error("[ORAL-EXAM] Message error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // ==========================================================================
    // END SESSION & FEEDBACK
    // ==========================================================================

    app.post("/api/oral-exam/:sessionId/end", isAuthenticated, async (req, res) => {
        try {
            const { sessionId } = req.params;
            const userId = getUserId(req);

            const session = await storageOralExam.getSessionByUser(sessionId, userId);
            if (!session) {
                return res.status(404).json({ error: "Sessione non trovata" });
            }

            const evaluations = (session.evaluations as EvaluationCriteria[]) || [];
            const topics = (session.topics as string[]) || [];
            const finalScore = calculateFinalScore(evaluations);

            const systemPrompt = `Sei il Presidente della commissione d'esame.
Analizza l'andamento dell'esame orale e scrivi un report finale per lo studente.

ARGOMENTI: ${topics.join(", ")}
VOTO CALCOLATO: ${finalScore}/30
VALUTAZIONI PARZIALI: ${JSON.stringify(evaluations)}

CREA UN JSON CON:
- overallComment: Commento discorsivo generale.
- strengths: Array di 2-3 punti di forza.
- weaknesses: Array di 2-3 lacune.

Stile: Professionale, accademico, costruttivo.`;

            const feedbackJson = await generateWithFallback({
                task: "oral_exam_evaluate",
                systemPrompt,
                userPrompt: "Genera feedback esame.",
                responseMode: "json",
                jsonRoot: "object"
            });

            const feedbackData = JSON.parse(feedbackJson);

            const feedback = {
                score: finalScore,
                overallComment: feedbackData.overallComment,
                strengths: feedbackData.strengths || [],
                weaknesses: feedbackData.weaknesses || []
            };

            // Persist completion to database
            await storageOralExam.completeSession(sessionId, userId, feedback, finalScore);

            res.json({ feedback, score: finalScore });

        } catch (error: any) {
            console.error("[ORAL-EXAM] End error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // ============================================================================
    // GOOGLE TTS CLIENT INITIALIZATION
    // ============================================================================

    let ttsClient: TextToSpeechClient;

    try {
        console.log("[GOOGLE-TTS] Checking credentials...");
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            ttsClient = new TextToSpeechClient({
                keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            });
            console.log("[GOOGLE-TTS] Initialized with credentials file");
        }
        else if (process.env.GOOGLE_TTS_CREDENTIALS) {
            let credentialsString = process.env.GOOGLE_TTS_CREDENTIALS.trim();
            if (credentialsString.startsWith("'") && credentialsString.endsWith("'")) {
                credentialsString = credentialsString.slice(1, -1);
            } else if (credentialsString.startsWith('"') && credentialsString.endsWith('"')) {
                if (!credentialsString.startsWith('{') && !credentialsString.startsWith('[')) {
                    credentialsString = credentialsString.slice(1, -1);
                }
            }
            const credentials = JSON.parse(credentialsString);
            ttsClient = new TextToSpeechClient({ credentials });
            console.log("[GOOGLE-TTS] Initialized with inline credentials");
        } else {
            console.warn("[GOOGLE-TTS] WARNING: Credentials not configured");
        }
    } catch (error: any) {
        console.error("[GOOGLE-TTS] Initialization failed:", error);
    }

    // ==========================================================================
    // GOOGLE TTS ENDPOINT
    // ==========================================================================

    app.post("/api/oral-exam/tts", async (req, res) => {
        try {
            if (!ttsClient) {
                return res.status(503).json({ error: "Google TTS non configurato" });
            }

            const { text, persona, speed = 1.0 } = req.body;
            if (!text) return res.status(400).json({ error: "Text required" });

            const voiceConfig = ITALIAN_VOICES[persona as keyof typeof ITALIAN_VOICES] || ITALIAN_VOICES.rigorous;

            const [response] = await ttsClient.synthesizeSpeech({
                input: { text },
                voice: {
                    languageCode: "it-IT",
                    name: voiceConfig.voiceName,
                },
                audioConfig: {
                    audioEncoding: "MP3",
                    speakingRate: Math.max(0.25, Math.min(4.0, speed)),
                    pitch: 0,
                    volumeGainDb: 0,
                },
            });

            if (!response.audioContent) throw new Error("No audio generated");

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
    // WHISPER TRANSCRIPTION
    // ==========================================================================

    app.post("/api/oral-exam/transcribe", isAuthenticated, audioUpload.single("audio"), async (req: any, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: "No audio file provided" });

            const formData = new FormData();
            const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
            formData.append("file", audioBlob, "audio.webm");
            formData.append("model", "whisper-1");
            formData.append("language", "it");
            formData.append("response_format", "verbose_json");

            const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
            const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: { Authorization: `Bearer ${apiKey}` },
                body: formData,
            });

            if (!response.ok) throw new Error(await response.text());
            const result = await response.json();

            res.json({ text: result.text, language: result.language });
        } catch (error: any) {
            console.error("[WHISPER] Transcription error:", error);
            res.status(500).json({ error: "Transcription failed" });
        }
    });

    // ==========================================================================
    // PDF UPLOAD
    // ==========================================================================

    app.post("/api/oral-exam/upload-pdf", isAuthenticated, pdfUpload.single("file"), async (req: any, res) => {
        try {
            if (!req.file) return res.status(400).json({ error: "No file uploaded" });
            const result = await extractTextFromPDFRobust(req.file.buffer);
            res.json({ text: result.text, pages: result.pageCount, method: result.method });
        } catch (error: any) {
            console.error("[PDF-UPLOAD] Error:", error);
            res.status(500).json({ error: "PDF processing failed" });
        }
    });

    console.log("[ORAL-EXAM] Routes registered successfully (Realism v2.2)");
}
