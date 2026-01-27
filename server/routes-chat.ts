
import { Router } from "express";
import { SITE_KNOWLEDGE, SUPPORT_OPTIONS } from "./services/site-knowledge";
import { generateWithFallback } from "./services/ai";
import { db } from "./db";
import { chatSessions, chatMessages } from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";

const router = Router();

const SYSTEM_PROMPT = `Sei l'Assistente Virtuale di "Capitale Personale", la piattaforma di preparazione concorsi.

IL TUO OBIETTIVO:
Fornire supporto gentile, chiaro ed empatico agli utenti che usano la piattaforma.
Devi spiegare come funzionano le feature (Quiz, Flashcard, Simulazioni, Metodo SQ3R, etc.).

LA TUA CONOSCENZA DEL SITO:
${SITE_KNOWLEDGE}

GESTIONE PROBLEMI:
Se l'utente segnala un bug, un errore bloccante, o chiede esplicitamente di parlare con una persona ("voglio assistenza umana", "contattare lo staff"),
aggiungi alla fine della tua risposta ESATTAMENTE il marker: [SUPPORT_NEEDED]

TONO DI VOCE:
Professionale, incoraggiante (sei un tutor), ma conciso. Usa elenchi puntati per le spiegazioni.`;

router.post("/chat", isAuthenticated, async (req, res) => {
    try {
        const { messages, sessionId } = req.body;
        const userId = (req.user as any)?.id;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "Messages are required" });
        }

        // 1. Get or Create Session
        let currentSessionId = sessionId;
        if (!currentSessionId) {
            const [newSession] = await db.insert(chatSessions)
                .values({ userId, title: "Supporto Capitale Personale" })
                .returning();
            currentSessionId = newSession.id;
        }

        // 2. Save user message
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage && lastUserMessage.role === 'user') {
            db.insert(chatMessages).values({
                sessionId: currentSessionId,
                role: 'user',
                content: lastUserMessage.content
            }).catch(err => console.error("Error saving user msg:", err));
        }

        // 3. Build conversation for AI (OpenAI message format)
        const aiMessages = messages.map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
            content: m.content || '',
        }));

        // 4. Generate response using battle-tested fallback system
        const rawReply = await generateWithFallback({
            task: "chat_assistant",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...aiMessages,
            ],
            temperature: 0.7,
        });

        // 5. Check for support request marker
        const supportRequested = rawReply.includes("[SUPPORT_NEEDED]");
        const reply = rawReply.replace("[SUPPORT_NEEDED]", "").trim();

        // 6. Save assistant response
        db.insert(chatMessages).values({
            sessionId: currentSessionId,
            role: 'assistant',
            content: reply,
        }).catch((err: any) => console.error("Error saving bot msg:", err));

        // 7. Return response
        res.json({
            reply,
            sessionId: currentSessionId,
            supportRequested,
            supportOptions: supportRequested ? SUPPORT_OPTIONS : undefined,
        });

    } catch (error: any) {
        console.error("Chat API Error:", error.message);
        res.status(500).json({ error: "Errore nel servizio di chat", details: error.message });
    }
});

// History endpoint
router.get("/chat/history", isAuthenticated, async (req, res) => {
    try {
        const userId = (req.user as any)?.id;
        if (!userId) return res.status(401).json({ error: "Unauthorized" });

        const sessions = await db.select().from(chatSessions)
            .where(eq(chatSessions.userId, userId))
            .orderBy(desc(chatSessions.createdAt))
            .limit(1);

        if (sessions.length === 0) return res.json({ messages: [], sessionId: null });

        const recentSessionId = sessions[0].id;
        const msgs = await db.select().from(chatMessages)
            .where(eq(chatMessages.sessionId, recentSessionId))
            .orderBy(chatMessages.createdAt);

        res.json({ sessionId: recentSessionId, messages: msgs });
    } catch (error: any) {
        console.error("Chat History Error:", error.message);
        res.status(500).json({ error: "Errore nel recupero della cronologia" });
    }
});


export const chatRoutes = router;
