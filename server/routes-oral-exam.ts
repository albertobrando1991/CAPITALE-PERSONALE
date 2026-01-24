// ============================================================================
// ORAL EXAM AI: Premium Feature - API ROUTES
// File: server/routes-oral-exam.ts
// ============================================================================

import express, { Request, Response } from 'express';
import { pool } from './db';
import { isAuthenticatedHybrid } from './services/supabase-auth';
import { generateWithFallback, generateSpeech } from './services/ai';

const router = express.Router();

// Non-null assertion: pool should exist in production
const db = pool!;
import { userSubscriptions } from '../shared/schema';
import { isAlwaysPremium } from './utils/auth-helpers';
import { eq, sql } from 'drizzle-orm';
import { db as drizzleDb } from './db';
import multer from 'multer';
import pdf from 'pdf-parse';
import fs from 'fs';

// Multer setup for temporary file storage
const upload = multer({ dest: 'uploads/' });

// Helper to get userId from session or user object
const getUserId = (req: Request): string => {
    // @ts-ignore
    return req.session?.userId || (req as any).user?.id;
};

// ============================================================================
// PERSONA SYSTEM PROMPTS
// ============================================================================

const PERSONA_PROMPTS = {
    rigorous: `Sei il Professor Bianchi, un docente universitario estremamente rigoroso.
Conduci l'esame orale in modo formale e preciso. 
- Fai domande dirette e non accetti risposte vaghe.
- Se la risposta è incompleta, chiedi di approfondire.
- Sei giusto ma esigente. Non fai complimenti eccessivi.
- Usa un tono formale ma non ostile.
- La tua valutazione è severa ma equa.
Rispondi SOLO in italiano.`,

    empathetic: `Sei la Professoressa Verdi, una tutor universitaria empatica e incoraggiante.
Conduci l'esame orale come una conversazione guidata.
- Incoraggi lo studente e riconosci i progressi.
- Se la risposta è incompleta, guidi verso la risposta corretta con suggerimenti.
- Mantieni un tono cordiale e supportivo.
- Celebri le risposte corrette ma correggi gentilmente gli errori.
Rispondi SOLO in italiano.`
};

// ============================================================================
// HELPER: PREMIUM \u0026 LIMITS
// ============================================================================

async function checkPremiumStatus(userId: string, userEmail?: string): Promise<{ isPremium: boolean; limit: number }> {
    // 1. Admin Bypass
    if (isAlwaysPremium(userEmail)) {
        return { isPremium: true, limit: 100 };
    }

    // 2. Check Subscription
    const [sub] = await drizzleDb
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId));

    const isPremium = sub?.tier === 'premium' || sub?.tier === 'enterprise';

    // 3. Define Limits
    // Free: 0 sessions (Premium Feature)
    // Premium/Enterprise: 10 sessions/day
    const limit = isPremium ? 10 : 0;

    return { isPremium, limit };
}

async function checkDailyLimit(userId: string, limit: number): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const result = await db.query(`
    SELECT COUNT(*) as count 
    FROM oral_exam_sessions 
    WHERE user_id = $1 
    AND DATE(created_at) = $2
  `, [userId, today]);

    const count = parseInt(result.rows[0].count, 10);
    return count < limit;
}

// ============================================================================
// START SESSION
// ============================================================================

/**
 * POST /api/oral-exam/start
 * Inizia una nuova sessione di esame orale
 */
router.post('/start', isAuthenticatedHybrid, async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        const { concorsoId, persona, topics, difficulty, maxTurns } = req.body;

        if (!concorsoId || !persona || !topics?.length) {
            return res.status(400).json({ error: 'concorsoId, persona e topics sono obbligatori' });
        }

        // 1. Check Premium Status
        const userEmail = (req as any).user?.email;
        const { isPremium, limit } = await checkPremiumStatus(userId, userEmail);

        if (!isPremium) {
            return res.status(403).json({
                error: 'Questa funzione è riservata agli utenti Premium',
                code: 'PREMIUM_REQUIRED'
            });
        }

        // 2. Check Daily Limit
        const canStart = await checkDailyLimit(userId, limit);
        if (!canStart) {
            return res.status(429).json({
                error: `Hai raggiunto il limite giornaliero di ${limit} sessioni`,
                code: 'LIMIT_REACHED'
            });
        }

        // Create session
        const result = await db.query(`
      INSERT INTO oral_exam_sessions (user_id, concorso_id, persona, topics, difficulty, max_turns)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, concorsoId, persona, JSON.stringify(topics), difficulty || 'medium', maxTurns || 5]);

        const session = result.rows[0];

        // Generate first question
        const systemPrompt = PERSONA_PROMPTS[persona as keyof typeof PERSONA_PROMPTS] || PERSONA_PROMPTS.rigorous;
        const topicList = topics.join(', ');

        const firstQuestionPrompt = `
Stai iniziando un esame orale sugli argomenti: ${topicList}.
Difficoltà: ${difficulty || 'media'}.

Saluta brevemente lo studente (1 frase) e poni la PRIMA DOMANDA aperta per valutare la sua preparazione di base su uno degli argomenti.
La domanda deve essere chiara e richiedere una risposta articolata.
NON elencare opzioni, è un esame ORALE.
`;

        const firstQuestion = await generateWithFallback({
            task: 'oral_exam_question',
            systemPrompt,
            userPrompt: firstQuestionPrompt,
            temperature: 0.7,
            responseMode: 'text'
        });

        // Save first message
        const messages = [{
            role: 'instructor',
            content: firstQuestion,
            timestamp: new Date().toISOString()
        }];

        await db.query(`
      UPDATE oral_exam_sessions
      SET messages = $1, current_turn = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(messages), session.id]);

        res.status(201).json({
            sessionId: session.id,
            persona,
            topics,
            firstMessage: firstQuestion,
            currentTurn: 1,
            maxTurns: session.max_turns
        });

    } catch (error: any) {
        console.error('Errore avvio sessione orale:', error);
        res.status(500).json({ error: 'Errore avvio sessione', details: error.message });
    }
});

// ============================================================================
// SEND MESSAGE (User responds, AI replies)
// ============================================================================

/**
 * POST /api/oral-exam/:sessionId/message
 * Invia risposta utente e ricevi replica del docente
 */
router.post('/:sessionId/message', isAuthenticatedHybrid, async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const userId = getUserId(req);
        const { content } = req.body;

        if (!content?.trim()) {
            return res.status(400).json({ error: 'Contenuto risposta vuoto' });
        }

        // Fetch session
        const sessionResult = await db.query(`
      SELECT * FROM oral_exam_sessions WHERE id = $1 AND user_id = $2 AND status = 'active'
    `, [sessionId, userId]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sessione non trovata o già conclusa' });
        }

        const session = sessionResult.rows[0];
        const messages = session.messages || [];
        const currentTurn = session.current_turn || 1;
        const maxTurns = session.max_turns || 5;

        // Add user message
        messages.push({
            role: 'user',
            content: content.trim(),
            timestamp: new Date().toISOString()
        });

        // Check if this is the last turn
        const isLastTurn = currentTurn >= maxTurns;

        // Build conversation context for AI
        const systemPrompt = PERSONA_PROMPTS[session.persona as keyof typeof PERSONA_PROMPTS] || PERSONA_PROMPTS.rigorous;
        const topicList = (session.topics || []).join(', ');

        const conversationContext = messages
            .map((m: any) => `${m.role === 'instructor' ? 'Docente' : 'Studente'}: ${m.content}`)
            .join('\n\n');

        let userPrompt: string;

        if (isLastTurn) {
            userPrompt = `
Argomenti esame: ${topicList}

Conversazione finora:
${conversationContext}

Lo studente ha appena risposto. Questa è L'ULTIMA DOMANDA.
1. Commenta brevemente la risposta (corretta/parziale/errata).
2. Concludi l'esame con un breve commento di chiusura.
3. NON fare altre domande.
`;
        } else {
            userPrompt = `
Argomenti esame: ${topicList}
Turno ${currentTurn + 1} di ${maxTurns}.

Conversazione finora:
${conversationContext}

Lo studente ha appena risposto. 
1. Valuta brevemente la risposta (corretta, parziale, o errata).
2. Se errata/parziale, correggi in modo costruttivo.
3. Poni la PROSSIMA DOMANDA su un aspetto diverso degli argomenti.
`;
        }

        const aiReply = await generateWithFallback({
            task: 'oral_exam_question',
            systemPrompt,
            userPrompt,
            temperature: 0.7,
            responseMode: 'text'
        });

        // Add AI message
        messages.push({
            role: 'instructor',
            content: aiReply,
            timestamp: new Date().toISOString()
        });

        // Update session
        const newTurn = currentTurn + 1;
        const newStatus = isLastTurn ? 'completed' : 'active';

        await db.query(`
      UPDATE oral_exam_sessions
      SET messages = $1, current_turn = $2, status = $3, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [JSON.stringify(messages), newTurn, newStatus, sessionId]);

        res.json({
            message: aiReply,
            currentTurn: newTurn,
            maxTurns,
            isCompleted: isLastTurn
        });

    } catch (error: any) {
        console.error('Errore messaggio sessione:', error);
        res.status(500).json({ error: 'Errore elaborazione risposta', details: error.message });
    }
});

// ============================================================================
// END SESSION & GET FEEDBACK
// ============================================================================

/**
 * POST /api/oral-exam/:sessionId/end
 * Termina sessione e genera valutazione finale
 */
router.post('/:sessionId/end', isAuthenticatedHybrid, async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const userId = getUserId(req);

        // Fetch session
        const sessionResult = await db.query(`
      SELECT * FROM oral_exam_sessions WHERE id = $1 AND user_id = $2
    `, [sessionId, userId]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Sessione non trovata' });
        }

        const session = sessionResult.rows[0];
        const messages = session.messages || [];

        if (session.feedback) {
            // Already evaluated
            return res.json({ feedback: session.feedback, score: session.score });
        }

        // Build evaluation prompt
        const conversationText = messages
            .map((m: any) => `${m.role === 'instructor' ? 'Docente' : 'Studente'}: ${m.content}`)
            .join('\n\n');

        const evaluationPrompt = `
Sei un valutatore esperto di esami universitari.

Analizza questa sessione di esame orale:

${conversationText}

Genera una valutazione strutturata IN FORMATO JSON:
{
  "score": [numero da 18 a 30, scala universitaria italiana],
  "strengths": ["punto di forza 1", "punto di forza 2"],
  "weaknesses": ["area da migliorare 1", "area da migliorare 2"],
  "suggestions": ["suggerimento 1", "suggerimento 2"],
  "overallComment": "Commento complessivo di 2-3 frasi"
}

Criteri:
- 18-20: Sufficiente, conoscenze di base
- 21-24: Buono, argomentazioni discrete
- 25-27: Molto buono, padronanza della materia
- 28-30: Eccellente, approfondimento e collegamenti

Rispondi SOLO con il JSON, senza markdown.
`;

        const evaluationRaw = await generateWithFallback({
            task: 'oral_exam_evaluate',
            userPrompt: evaluationPrompt,
            temperature: 0.3,
            responseMode: 'json',
            jsonRoot: 'object'
        });

        let feedback;
        try {
            feedback = JSON.parse(evaluationRaw);
        } catch (e) {
            console.error('Failed to parse feedback JSON:', evaluationRaw);
            feedback = {
                score: 22,
                strengths: ['Partecipazione attiva'],
                weaknesses: ['Area da approfondire'],
                suggestions: ['Continua a esercitarti'],
                overallComment: 'Esame completato. Continua a studiare per migliorare.'
            };
        }

        // Calculate duration
        const startTime = new Date(session.started_at).getTime();
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        // Save feedback
        await db.query(`
      UPDATE oral_exam_sessions
      SET 
        feedback = $1,
        score = $2,
        status = 'completed',
        ended_at = CURRENT_TIMESTAMP,
        total_duration_seconds = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [JSON.stringify(feedback), feedback.score, durationSeconds, sessionId]);

        res.json({
            feedback,
            score: feedback.score,
            durationSeconds
        });

    } catch (error: any) {
        console.error('Errore valutazione finale:', error);
        res.status(500).json({ error: 'Errore generazione valutazione', details: error.message });
    }
});

// ============================================================================
// GET SESSION (transcript)
// ============================================================================

/**
 * GET /api/oral-exam/:sessionId
 * Recupera sessione con trascrizione
 */
router.get('/:sessionId', isAuthenticatedHybrid, async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const userId = getUserId(req);

        const result = await db.query(`
      SELECT * FROM oral_exam_sessions WHERE id = $1 AND user_id = $2
    `, [sessionId, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sessione non trovata' });
        }

        res.json(result.rows[0]);

    } catch (error: any) {
        console.error('Errore recupero sessione:', error);
        res.status(500).json({ error: 'Errore recupero sessione' });
    }
});

// ============================================================================
// LIST SESSIONS
// ============================================================================

/**
 * GET /api/oral-exam/concorso/:concorsoId
 * Lista sessioni per un concorso
 */
router.get('/concorso/:concorsoId', isAuthenticatedHybrid, async (req: Request, res: Response) => {
    try {
        const { concorsoId } = req.params;
        const userId = getUserId(req);

        const result = await db.query(`
      SELECT id, persona, topics, difficulty, status, score, started_at, ended_at, total_duration_seconds
      FROM oral_exam_sessions
      WHERE user_id = $1 AND concorso_id = $2
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId, concorsoId]);

        res.json(result.rows);

    } catch (error: any) {
        console.error('Errore lista sessioni:', error);
        res.status(500).json({ error: 'Errore recupero lista sessioni' });
    }
});

// ============================================================================
// UPLOAD CONTENT (PDF)
// ============================================================================

router.post('/upload-pdf', isAuthenticatedHybrid, upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }

        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdf(dataBuffer);

        // Cleanup temp file
        fs.unlinkSync(req.file.path);

        // Limit text length if needed (e.g. 100k chars)
        const text = data.text.slice(0, 100000);

        res.json({
            success: true,
            text,
            pages: data.numpages,
            info: data.info
        });

    } catch (error: any) {
        console.error('Errore upload PDF:', error);
        res.status(500).json({ error: 'Errore processamento PDF', details: error.message });
    }

});

// ============================================================================
// TEXT TO SPEECH
// ============================================================================

router.post('/tts', isAuthenticatedHybrid, async (req: Request, res: Response) => {
    try {
        const { text, persona } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text required' });
        }

        // Map persona to voice
        // Rigorous (Male) -> onyx or echo
        // Empathetic (Female/Neutral) -> shimmer or nova or alloy
        let voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy";

        if (persona === 'rigorous') {
            voice = "onyx"; // Deep, authoritative male
        } else if (persona === 'empathetic') {
            voice = "nova"; // Warm, natural female/neutral
        }

        const audioBuffer = await generateSpeech(text, voice);

        res.set('Content-Type', 'audio/mpeg');
        res.send(audioBuffer);

    } catch (error: any) {
        console.error('TTS Error:', error);
        res.status(500).json({ error: 'TTS Failed', details: error.message });
    }
});

export default router;
