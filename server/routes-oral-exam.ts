import type { Express, Request } from "express";
import { z } from "zod";
import multer from "multer";
import { isAuthenticated } from "./replitAuth";
import { generateWithFallback, generateSpeech } from "./services/ai"; // Import generateSpeech
import { extractTextFromPDFRobust } from "./services/pdf-extraction";

// ============================================================================
// VOICE CONFIGURATION (OpenAI TTS)
// ============================================================================

const ITALIAN_VOICES = {
    rigorous: {
        name: "Prof. Bianchi",
        voiceName: "onyx", // Deep male voice, authoritative
        description: "Professore universitario rigoroso, formale e preciso. Non tollera imprecisioni.",
    },
    empathetic: {
        name: "Prof.ssa Verdi",
        voiceName: "shimmer", // Clear female voice, warm
        description: "Professoressa empatica, incoraggiante ma esigente sui concetti fondamentali.",
    },
};

// ============================================================================
// SESSION STORAGE
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
    evaluations: EvaluationCriteria[]; // Store detailed AI evaluations
}

const sessions = new Map<string, OralExamSession>();

// ============================================================================
// AI-POWERED EVALUATION SYSTEM
// ============================================================================

interface EvaluationCriteria {
    completeness: number; // 0-10
    accuracy: number; // 0-10
    clarity: number; // 0-10
    depth: number; // 0-10
    comment: string; // Brief internal critique
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
            temperature: 0.1, // Deterministic
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
        // Fallback to basic length-based heuristic if AI fails
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

    // Map 0-10 to 18-30 scale
    // < 5.0 -> Fail (<18)
    // 5.0 -> 18
    // 10.0 -> 30
    // Linear interpolation for passing scores
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

            // Generate Context-Aware First Question
            const systemPrompt = `Sei ${voice.name}, ${voice.description}.
Stai esaminando uno studente universitario.

CONTESTO:
Argomenti: ${data.topics.join(", ")}
Difficoltà: ${data.difficulty}
Materiale Extra: ${data.context ? data.context.substring(0, 500) : "Nessuno"}

OBIETTIVO:
Inizia l'esame con una domanda specifica e pertinente su uno degli argomenti.
- Sii naturale, non robotico.
- NON salutare o presentarti ("Buongiorno, iniziamo..."). Vai DRITTO ALLA DOMANDA.
- Usa il "Lei" o il "Tu" in base al tuo personaggio (${data.persona === 'rigorous' ? 'Lei formale' : 'Tu informale'}).
- Domanda aperta ma focalizzata concettualmente.`;

            const firstQuestion = await generateWithFallback({
                task: "oral_exam_question",
                systemPrompt,
                userPrompt: "Fai la prima domanda allo studente.",
                temperature: 0.8,
            });

            const session: OralExamSession = {
                id: sessionId,
                userId,
                concorsoId: data.concorsoId,
                persona: data.persona,
                topics: data.topics,
                difficulty: data.difficulty,
                maxTurns: data.maxTurns,
                currentTurn: 1,
                messages: [{ role: "instructor", content: firstQuestion }],
                context: data.context || "",
                status: "active",
                createdAt: new Date(),
                evaluations: []
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
    // SEND MESSAGE & EVALUATE
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

            // 1. Store User Answer
            session.messages.push({ role: "user", content });

            // 2. AI Evaluation of the answer
            const lastQuestion = session.messages[session.messages.length - 2]?.content || "";
            const evaluation = await evaluateResponseWithAI(lastQuestion, content, session.topics.join(", "));
            session.evaluations.push(evaluation);

            console.log(`[ORAL-EXAM] Eval Turn ${session.currentTurn}:`, evaluation);

            // 3. Generate Next Question or Conclusion
            const isLastTurn = session.currentTurn >= session.maxTurns;
            const voice = ITALIAN_VOICES[session.persona];

            const systemPrompt = `Sei ${voice.name}, ${voice.description}.
Stai interrogando uno studente sugli argomenti: ${session.topics.join(", ")}.

STORIA ESAME:
${session.messages.map(m => `${m.role === 'instructor' ? 'DOCENTE' : 'STUDENTE'}: ${m.content}`).join("\n")}

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
- RISPONDI DIRETTAMENTE CON LA PROSSIMA DOMANDA.`}`;

            const aiResponse = await generateWithFallback({
                task: "oral_exam_question",
                systemPrompt,
                userPrompt: isLastTurn ? "Concludi esame." : "Fai la prossima domanda.",
                temperature: 0.7,
            });

            session.messages.push({ role: "instructor", content: aiResponse });
            session.currentTurn++;

            if (isLastTurn) {
                session.status = "completed";
            }

            res.json({
                message: aiResponse,
                currentTurn: session.currentTurn,
                isCompleted: session.status === "completed",
                // Debug info can be removed in prod
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

            const session = sessions.get(sessionId);
            if (!session || session.userId !== userId) {
                return res.status(404).json({ error: "Sessione non trovata" });
            }

            // Calculate Final Score
            const finalScore = calculateFinalScore(session.evaluations);

            // Generate Qualitative Feedback
            const systemPrompt = `Sei il Presidente della commissione d'esame.
Analizza l'andamento dell'esame orale e scrivi un report finale per lo studente.

ARGOMENTI: ${session.topics.join(", ")}
VOTO CALCOLATO: ${finalScore}/30
VALUTAZIONI PARZIALI: ${JSON.stringify(session.evaluations)}

CREA UN JSON CON:
- overallComment: Commento discorsivo generale (non menzionare numeri precisi, parla della preparazione).
- strengths: Array di 2-3 punti di forza emersi.
- weaknesses: Array di 2-3 lacune o aspetti da migliorare.

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

            session.status = "completed";
            res.json({ feedback, score: finalScore });

        } catch (error: any) {
            console.error("[ORAL-EXAM] End error:", error);
            res.status(500).json({ error: error.message });
        }
    });

    // ==========================================================================
    // TTS ENDPOINT (OpenAI)
    // ==========================================================================

    app.post("/api/oral-exam/tts", async (req, res) => {
        try {
            const { text, persona, speed = 1.0 } = req.body;

            if (!text) return res.status(400).json({ error: "Text required" });

            // Map persona to OpenAI voices
            // Prof. Bianchi (Rigorous) -> onyx
            // Prof.ssa Verdi (Empathetic) -> shimmer
            const openAIVoice = persona === 'rigorous' ? 'onyx' : 'shimmer';

            // OpenAI speed range is 0.25 to 4.0. 
            // 1.0 is default. 0.9 is slightly more articulate.
            const ttsSpeed = speed || 1.0;

            const audioBuffer = await generateSpeech(text, openAIVoice, {
                speed: ttsSpeed,
                useHD: true // Always use HD for quality
            });

            res.set({
                "Content-Type": "audio/mpeg",
                "Content-Length": audioBuffer.length,
            });

            res.send(audioBuffer);

        } catch (error: any) {
            console.error("[OPENAI-TTS] Error:", error);
            res.status(500).json({ error: "TTS generation failed", details: error.message });
        }
    });

    // ==========================================================================
    // WHISPER TRANSCRIPTION (Existing)
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

                const formData = new FormData();
                const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype });
                formData.append("file", audioBlob, "audio.webm");
                formData.append("model", "whisper-1");
                formData.append("language", "it");
                formData.append("response_format", "verbose_json");
                formData.append("temperature", "0");

                const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
                if (!apiKey) throw new Error("OpenAI API key not configured");

                const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${apiKey}` },
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
                });
            } catch (error: any) {
                console.error("[WHISPER] Transcription error:", error);
                res.status(500).json({ error: "Transcription failed", details: error.message });
            }
        }
    );

    // ==========================================================================
    // PDF UPLOAD (Existing)
    // ==========================================================================

    app.post(
        "/api/oral-exam/upload-pdf",
        isAuthenticated,
        pdfUpload.single("file"),
        async (req: any, res) => {
            try {
                if (!req.file) return res.status(400).json({ error: "No file uploaded" });

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

    console.log("[ORAL-EXAM] Routes registered successfully (OpenAI Powered)");
}
