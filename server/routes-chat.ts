
import { Router } from "express";
import { streamText, tool } from "ai";
import { getOpenRouterClient } from "./services/ai";
import { z } from "zod";
import { SITE_KNOWLEDGE, SUPPORT_OPTIONS } from "./services/site-knowledge";
import { db } from "./db";
import { chatSessions, chatMessages } from "../shared/schema";
import { eq, desc } from "drizzle-orm";
// We need to use the openai provider adapter for ai-sdk if we want to use the high-level `streamText`
// However, since we are using OpenRouter via the `openai` library directly in services/ai, 
// we might need to use the `createOpenAI` provider from `@ai-sdk/openai` to be compatible with `streamText`.
import { createOpenAI } from "@ai-sdk/openai";

const router = Router();

// Configure the OpenRouter provider for Vercel AI SDK
const openrouter = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPEN_ROUTER_API_KEY || "",
    baseURL: "https://openrouter.ai/api/v1",
});

router.post("/chat", async (req, res) => {
    try {
        const { messages, sessionId } = req.body;
        const userId = (req.user as any)?.id; // Assuming auth middleware is used

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        // 1. Get or Create Session (Optimization: Do this async or lazily if needed)
        let currentSessionId = sessionId;
        if (!currentSessionId) {
            const [newSession] = await db.insert(chatSessions)
                .values({ userId, title: "Supporto Capitale Personale" })
                .returning();
            currentSessionId = newSession.id;
        }

        // Capture the last user message to save it
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage && lastUserMessage.role === 'user') {
            // Fire and forget save
            db.insert(chatMessages).values({
                sessionId: currentSessionId,
                role: 'user',
                content: lastUserMessage.content
            }).catch(err => console.error("Error saving user msg:", err));
        }


        // 2. Stream Response
        const result = await streamText({
            model: openrouter("openai/gpt-4o-mini"), // Cost-effective model
            system: `Sei l'Assistente Virtuale di "Capitale Personale", la piattaforma di preparazione concorsi.
      
      IL TUO OBIETTIVO:
      Fornire supporto gentile, chiaro ed empatico agli utenti che usano la piattaforma. 
      Devi spiegare come funzionano le feature (Quiz, Flashcard, Simulazioni, Metodo SQ3R, etc.).
      
      LA TUA CONOSCENZA DEL SITO:
      ${SITE_KNOWLEDGE}
      
      GESTIONE PROBLEMI:
      Se l'utente segnala un bug, un errore bloccante, o chiede esplicitamente di parlare con una persona ("voglio assistenza umana", "contattare lo staff"), 
      DEVI usare il tool 'requestSupport'. NON fornire indirizzi email o numeri nel testo, usa il tool.
      
      TONO DI VOCE:
      Professionale, incoraggiante (sei un tutor), ma conciso. Usa elenchi puntati per le spiegazioni.`,
            messages,
            tools: {
                requestSupport: tool({
                    description: "Attiva le opzioni di contatto (WhatsApp/Email) quando l'utente vuole parlare con lo staff o segnala problemi gravi.",
                    parameters: z.object({
                        reason: z.string().describe("Motivo della richiesta (es. 'bug', 'info_commerciali', 'assistenza_umana')"),
                    }),
                    execute: async ({ reason }: { reason: string }) => {
                        // Log logic could go here
                        console.log(`Support requested by User ${userId} for: ${reason}`);
                        return {
                            shown: true,
                            options: SUPPORT_OPTIONS
                        };
                    },
                }),
            },
            onFinish: async ({ text, toolCalls, toolResults }) => {
                // Save assistant response
                let content = text;
                // Note: Logic to save tool invocations could be complex, for now we save the text content
                // or a placeholder if it was just a tool call.

                await db.insert(chatMessages).values({
                    sessionId: currentSessionId,
                    role: 'assistant',
                    content: content,
                    toolInvocations: toolCalls ? JSON.stringify(toolCalls) : null
                }).catch((err: any) => console.error("Error saving bot msg:", err));
            }
        });

        // Pipe the stream to the response
        // Vercel AI SDK adaptation for Express
        result.pipeDataStreamToResponse(res);

    } catch (error: any) {
        console.error("Chat API Error:", error);
        res.status(500).json({ error: "Errore nel servizio di chat" });
    }
});

// History endpoint
router.get("/chat/history", async (req, res) => {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Get latest session for now (simple version)
    const sessions = await db.select().from(chatSessions)
        .where(eq(chatSessions.userId, userId))
        .orderBy(desc(chatSessions.createdAt))
        .limit(1);

    if (sessions.length === 0) return res.json({ messages: [], sessionId: null });

    const recentSessionId = sessions[0].id;
    const messages = await db.select().from(chatMessages)
        .where(eq(chatMessages.sessionId, recentSessionId))
        .orderBy(chatMessages.createdAt);

    res.json({ sessionId: recentSessionId, messages });
});


export const chatRoutes = router;
