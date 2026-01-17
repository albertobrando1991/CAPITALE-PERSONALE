import { Router, Request, Response } from 'express';
import { db } from './db';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { breathingSessions, hydrationLogs, nutritionLogs, reframingLogs, sleepLogs } from '../shared/schema';
import { cleanJson, generateWithFallback } from './services/ai';

console.log('✅ Benessere Routes module loaded');

const router = Router();

// =====================================================
// MIDDLEWARE: Verifica autenticazione
// =====================================================
function requireAuth(req: Request, res: Response, next: Function) {
  const userAny = req.user as any;
  const userId = userAny?.id || userAny?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  if (userAny && !userAny.id) {
    userAny.id = userId;
  }
  next();
}

// =====================================================
// 😌 BOX BREATHING SESSIONS
// =====================================================

// GET /api/benessere/breathing - Lista sessioni
router.get('/breathing', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate, context } = req.query;

    let query = db
      .select()
      .from(breathingSessions)
      .where(eq(breathingSessions.userId, userId))
      .orderBy(desc(breathingSessions.startedAt));

    if (startDate) {
      query = query.where(gte('started_at', new Date(startDate as string)));
    }

    if (endDate) {
      query = query.where(lte('started_at', new Date(endDate as string)));
    }

    if (context) {
      query = query.where(eq('context', context as string));
    }

    const sessions = await query;
    res.json(sessions);
  } catch (error) {
    console.error('❌ Errore GET /breathing:', error);
    res.status(500).json({ error: 'Errore nel recupero delle sessioni' });
  }
});

// POST /api/benessere/breathing - Crea nuova sessione
router.post('/breathing', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      concorsoId,
      startedAt,
      endedAt,
      cyclesCompleted,
      durationSeconds,
      context,
      heartRateBefore,
      heartRateAfter,
      notes
    } = req.body;

    // Validazione
    if (!startedAt || cyclesCompleted === undefined) {
      return res.status(400).json({
        error: 'Campi obbligatori: startedAt, cyclesCompleted'
      });
    }

    const [newSession] = await db
      .insert(breathingSessions)
      .values({
        userId: userId,
        concorsoId: concorsoId || null,
        startedAt: new Date(startedAt),
        endedAt: endedAt ? new Date(endedAt) : null,
        cyclesCompleted: cyclesCompleted,
        durationSeconds: durationSeconds || null,
        context: context || 'break',
        heartRateBefore: heartRateBefore || null,
        heartRateAfter: heartRateAfter || null,
        notes: notes || null
      })
      .returning();

    res.status(201).json(newSession);
  } catch (error) {
    console.error('❌ Errore POST /breathing:', error);
    res.status(500).json({ error: 'Errore nella creazione della sessione' });
  }
});

// GET /api/benessere/breathing/stats - Statistiche breathing
router.get('/breathing/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = 'week' } = req.query; // 'today', 'week', 'month'

    let dateCondition;
    const now = new Date();

    switch (period) {
      case 'today':
        dateCondition = sql`DATE(started_at) = CURRENT_DATE`;
        break;
      case 'week':
        dateCondition = sql`started_at >= NOW() - INTERVAL '7 days'`;
        break;
      case 'month':
        dateCondition = sql`started_at >= NOW() - INTERVAL '30 days'`;
        break;
      default:
        dateCondition = sql`TRUE`;
    }

    const [stats] = await db
      .select({
        total_sessions: sql<number>`COUNT(*)`,
        total_cycles: sql<number>`SUM(cycles_completed)`,
        total_minutes: sql<number>`SUM(duration_seconds) / 60`,
        avg_cycles_per_session: sql<number>`AVG(cycles_completed)`,
        most_common_context: sql<string>`MODE() WITHIN GROUP (ORDER BY context)`
      })
      .from('breathing_sessions')
      .where(and(
        eq('user_id', userId),
        dateCondition
      ));

    res.json(stats);
  } catch (error) {
    console.error('❌ Errore GET /breathing/stats:', error);
    res.status(500).json({ error: 'Errore nel calcolo delle statistiche' });
  }
});

// =====================================================
// 💬 REFRAMING COACH (AI-powered)
// =====================================================

// POST /api/benessere/reframing/generate - Genera reframe con AI
router.post('/reframing/generate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { anxiousThought } = req.body;

    if (!anxiousThought) {
      return res.status(400).json({ error: 'Campo obbligatorio: anxiousThought' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'Servizio AI non configurato' });
    }

    const prompt = `Sei un coach di psicologia cognitiva specializzato in ristrutturazione cognitiva (Cognitive Reframing) per studenti di concorsi pubblici.

**Pensiero Ansioso dello Studente:**
"${anxiousThought}"

**Il tuo compito:**
1. Trasforma questo pensiero ansioso in un pensiero potenziante usando il reframing cognitivo
2. Mantieni l'autenticità (non essere banalmente ottimista)
3. Riconosci l'attivazione fisiologica ma cambia l'interpretazione cognitiva
4. Usa la tecnica: "Ho paura di X" → "Sono eccitato di mettere alla prova Y"

**Formato risposta (JSON):**
{
  "reframed_thought": "Il pensiero ristrutturato (max 150 caratteri)",
  "explanation": "Breve spiegazione del meccanismo (max 300 caratteri)",
  "activation_type": "anxiety" o "excitement",
  "confidence": 0-100
}

Rispondi SOLO con JSON valido, senza markdown.`;

    const responseText = await generateWithFallback({
      task: "reframing_generate",
      userPrompt: prompt,
      temperature: 0.2,
      maxOutputTokens: 400,
      responseMode: "json",
      jsonRoot: "object",
    });

    const aiResponse = JSON.parse(cleanJson(responseText));

    // Mappa le chiavi da snake_case a camelCase per coerenza con il frontend e DB
    const formattedResponse = {
      reframedThought: aiResponse.reframed_thought,
      explanation: aiResponse.explanation,
      activationType: aiResponse.activation_type,
      confidence: aiResponse.confidence
    };

    res.json({
      originalThought: anxiousThought,
      ...formattedResponse,
      aiModel: 'openrouter'
    });

  } catch (error) {
    console.error('❌ Errore POST /reframing/generate:', error);
    res.status(500).json({
      error: 'Errore nella generazione del reframe',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/benessere/reframing - Salva reframe
router.post('/reframing', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      concorsoId,
      anxiousThought,
      reframedThought,
      aiSuggestion,
      aiModel,
      effectivenessRating,
      context,
      tags
    } = req.body;

    if (!anxiousThought || !reframedThought) {
      return res.status(400).json({
        error: 'Campi obbligatori: anxiousThought, reframedThought'
      });
    }

    const [newLog] = await db
      .insert(reframingLogs)
      .values({
        userId: userId,
        concorsoId: concorsoId || null,
        anxiousThought: anxiousThought,
        reframedThought: reframedThought,
        aiSuggestion: aiSuggestion || null,
        aiModel: aiModel || null,
        effectivenessRating: effectivenessRating || null,
        context: context || null,
        tags: tags || []
      })
      .returning();

    res.status(201).json(newLog);
  } catch (error) {
    console.error('❌ Errore POST /reframing:', error);
    res.status(500).json({ error: 'Errore nel salvataggio del reframe' });
  }
});

// GET /api/benessere/reframing - Lista reframes
router.get('/reframing', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = 20, context } = req.query;

    let query = db
      .select()
      .from(reframingLogs)
      .where(eq(reframingLogs.userId, userId))
      .orderBy(desc(reframingLogs.createdAt))
      .limit(Number(limit));

    if (context) {
      query = query.where(eq(reframingLogs.context, context as string));
    }

    const logs = await query;
    res.json(logs);
  } catch (error) {
    console.error('❌ Errore GET /reframing:', error);
    res.status(500).json({ error: 'Errore nel recupero dei reframes' });
  }
});

// DELETE /api/benessere/reframing/:id - Elimina reframe
router.delete('/reframing/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const logId = parseInt(req.params.id);

    if (isNaN(logId)) {
      return res.status(400).json({ error: 'ID non valido' });
    }

    const [deletedLog] = await db
      .delete(reframingLogs)
      .where(and(
        eq(reframingLogs.id, logId),
        eq(reframingLogs.userId, userId)
      ))
      .returning();

    if (!deletedLog) {
      return res.status(404).json({ error: 'Log non trovato' });
    }

    res.json({ message: 'Reframe eliminato con successo' });
  } catch (error) {
    console.error('❌ Errore DELETE /reframing/:id:', error);
    res.status(500).json({ error: 'Errore durante l\'eliminazione del reframe' });
  }
});

// =====================================================
// 💤 SLEEP TRACKING
// =====================================================

// GET /api/benessere/sleep - Lista sleep logs
router.get('/sleep', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    let query = db
      .select()
      .from(sleepLogs)
      .where(eq(sleepLogs.userId, userId))
      .orderBy(desc(sleepLogs.date));

    if (startDate) {
      // Usa TO_DATE per evitare errori di sintassi con parametri e casting
      query = query.where(sql`${sleepLogs.date} >= TO_DATE(${startDate}, 'YYYY-MM-DD')`);
    }

    if (endDate) {
      query = query.where(sql`${sleepLogs.date} <= TO_DATE(${endDate}, 'YYYY-MM-DD')`);
    }

    const logs = await query;
    res.json(logs);
  } catch (error) {
    console.error('❌ Errore GET /sleep:', error);
    res.status(500).json({ error: 'Errore nel recupero dei sleep logs' });
  }
});

// POST /api/benessere/sleep - Crea/aggiorna sleep log
router.post('/sleep', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      date,
      bedtime,
      wakeTime,
      totalHours,
      qualityRating,
      remSleepHours,
      deepSleepHours,
      interruptions,
      notes,
      moodOnWaking
    } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Campo obbligatorio: date' });
    }

    console.log(`[POST /sleep] User: ${userId}, Date: ${date}, Payload:`, req.body);

    // Gestione della data: assicuriamoci di confrontare solo la data (YYYY-MM-DD)
    // Il DB usa timestamp, quindi confrontiamo se il timestamp nel DB cade nello stesso giorno della data ricevuta.
    
    // Tentativo di recupero log esistente
    // Nota: "date" dal frontend è YYYY-MM-DD.
    // Usa TO_CHAR per confronto stringa sicuro ed evitare problemi di timezone/timestamp
    const [existingLog] = await db
      .select()
      .from(sleepLogs)
      .where(and(
        eq(sleepLogs.userId, userId),
        sql`TO_CHAR(${sleepLogs.date}, 'YYYY-MM-DD') = ${date}`
      ));

    let sleepLog;

    if (existingLog) {
      console.log(`[POST /sleep] Updating existing log ID: ${existingLog.id}`);
      // Update
      [sleepLog] = await db
        .update(sleepLogs)
        .set({
          bedtime: bedtime || null,
          wakeTime: wakeTime || null,
          totalHours: totalHours || null,
          qualityRating: qualityRating || null,
          remSleepHours: remSleepHours || null,
          deepSleepHours: deepSleepHours || null,
          interruptions: interruptions || 0,
          notes: notes || null,
          moodOnWaking: moodOnWaking || null,
          updatedAt: new Date()
        })
        .where(eq(sleepLogs.id, existingLog.id))
        .returning();
    } else {
      console.log(`[POST /sleep] Creating new log for date: ${date}`);
      // Insert
      [sleepLog] = await db
        .insert(sleepLogs)
        .values({
          userId: userId,
          date: new Date(date),
          bedtime: bedtime || null,
          wakeTime: wakeTime || null,
          totalHours: totalHours || null,
          qualityRating: qualityRating || null,
          remSleepHours: remSleepHours || null,
          deepSleepHours: deepSleepHours || null,
          interruptions: interruptions || 0,
          notes: notes || null,
          moodOnWaking: moodOnWaking || null
        })
        .returning();
    }

    console.log(`[POST /sleep] Success. Log ID: ${sleepLog?.id}`);
    res.status(201).json(sleepLog);
  } catch (error) {
    console.error('❌ Errore POST /sleep:', error);
    // Return detailed error only in dev mode ideally, but here for debugging:
    res.status(500).json({ 
      error: 'Errore nel salvataggio del sleep log',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// DELETE /api/benessere/sleep/:id - Elimina sleep log
router.delete('/sleep/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const logId = parseInt(req.params.id);

    if (isNaN(logId)) {
      return res.status(400).json({ error: 'ID non valido' });
    }

    const [deletedLog] = await db
      .delete(sleepLogs)
      .where(and(
        eq(sleepLogs.id, logId),
        eq(sleepLogs.userId, userId)
      ))
      .returning();

    if (!deletedLog) {
      console.log(`[DELETE NUTRITION] Log ${logId} not found or not owned by user ${userId}`);
      return res.status(404).json({ error: 'Log non trovato' });
    }

    console.log(`[DELETE NUTRITION] Successfully deleted log ${logId}`);
    res.json({ message: 'Log eliminato con successo' });
  } catch (error) {
    console.error('❌ Errore DELETE /sleep/:id:', error);
    res.status(500).json({ error: 'Errore durante l\'eliminazione del log' });
  }
});

// GET /api/benessere/sleep/stats - Statistiche sonno
router.get('/sleep/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = 'week' } = req.query;

    let dateCondition;
    switch (period) {
      case 'week':
        dateCondition = sql`date >= CURRENT_DATE - INTERVAL '7 days'`;
        break;
      case 'month':
        dateCondition = sql`date >= CURRENT_DATE - INTERVAL '30 days'`;
        break;
      default:
        dateCondition = sql`TRUE`;
    }

    const [stats] = await db
      .select({
        avg_hours: sql<number>`AVG(total_hours)`,
        avg_quality: sql<number>`AVG(quality_rating)`,
        total_nights: sql<number>`COUNT(*)`,
        nights_under_7h: sql<number>`COUNT(*) FILTER (WHERE total_hours < 7)`,
        nights_over_8h: sql<number>`COUNT(*) FILTER (WHERE total_hours >= 8)`
      })
      .from('sleep_logs')
      .where(and(
        eq('user_id', userId),
        dateCondition
      ));

    res.json(stats);
  } catch (error) {
    console.error('❌ Errore GET /sleep/stats:', error);
    res.status(500).json({ error: 'Errore nel calcolo delle statistiche' });
  }
});

// =====================================================
// 💧 HYDRATION TRACKING
// =====================================================

// GET /api/benessere/hydration/today - Hydration di oggi (Ultimo log attivo)
router.get('/hydration/today', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    // Usa la data fornita dal client se presente, altrimenti UTC
    const clientDate = req.query.date as string;
    const today = clientDate ? clientDate : new Date().toISOString().split('T')[0];

    // Prendi l'ultimo log di oggi
    const [hydration] = await db
      .select()
      .from(hydrationLogs)
      .where(and(
        eq(hydrationLogs.userId, userId),
        sql`TO_CHAR(${hydrationLogs.date}, 'YYYY-MM-DD') = ${today}`
      ))
      .orderBy(desc(hydrationLogs.createdAt))
      .limit(1);

    if (!hydration) {
      // Crea entry per oggi se non esiste
      // Cerca l'ultimo target usato dall'utente (anche giorni scorsi)
      const [lastLog] = await db
        .select()
        .from(hydrationLogs)
        .where(eq(hydrationLogs.userId, userId))
        .orderBy(desc(hydrationLogs.createdAt))
        .limit(1);

      const [newHydration] = await db
        .insert(hydrationLogs)
        .values({
          userId: userId,
          date: new Date(today),
          glassesCount: 0,
          targetGlasses: lastLog?.targetGlasses || 8
        })
        .returning();

      return res.json(newHydration);
    }

    // Se l'ultimo log è "pieno" (es. completato in precedenza ma non resettato, caso raro con la nuova logica),
    // ne creiamo uno nuovo? No, la logica di POST /drink gestirà il reset.
    // Qui restituiamo semplicemente lo stato attuale.
    res.json(hydration);
  } catch (error) {
    console.error('❌ Errore GET /hydration/today:', error);
    res.status(500).json({ error: 'Errore nel recupero dell\'hydration' });
  }
});

// PATCH /api/benessere/hydration/target - Aggiorna obiettivo giornaliero
router.patch('/hydration/target', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { target, date } = req.body;
    // Usa la data fornita dal client se presente, altrimenti UTC
    const today = date ? date : new Date().toISOString().split('T')[0];

    if (!target || typeof target !== 'number' || target < 1) {
      return res.status(400).json({ error: 'Target valido richiesto (minimo 1)' });
    }

    // Trova l'ultimo log di oggi
    const [currentLog] = await db
      .select()
      .from(hydrationLogs)
      .where(and(
        eq(hydrationLogs.userId, userId),
        sql`TO_CHAR(${hydrationLogs.date}, 'YYYY-MM-DD') = ${today}`
      ))
      .orderBy(desc(hydrationLogs.createdAt))
      .limit(1);

    if (currentLog) {
      const [updated] = await db
        .update(hydrationLogs)
        .set({ 
          targetGlasses: target,
          updatedAt: new Date()
        })
        .where(eq(hydrationLogs.id, currentLog.id))
        .returning();
      return res.json(updated);
    } else {
      // Crea nuovo log con target personalizzato
      const [newLog] = await db
        .insert(hydrationLogs)
        .values({
          userId: userId,
          date: new Date(today),
          glassesCount: 0,
          targetGlasses: target
        })
        .returning();
      return res.json(newLog);
    }
  } catch (error) {
    console.error('❌ Errore PATCH /hydration/target:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del target' });
  }
});

// PATCH /api/benessere/hydration/:id - Aggiorna log specifico (es. reset o modifica manuale)
router.patch('/hydration/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const logId = parseInt(req.params.id);
    const { glassesCount, targetGlasses } = req.body;

    console.log(`[PATCH HYDRATION] ID: ${logId}, Body:`, req.body);

    if (isNaN(logId)) {
      return res.status(400).json({ error: 'ID non valido' });
    }

    const updateData: any = { updatedAt: new Date() };
    
    // IMPORTANTE: Gestire esplicitamente lo 0 come valore valido
    if (glassesCount !== undefined && glassesCount !== null) {
      updateData.glassesCount = glassesCount;
    }
    
    if (targetGlasses !== undefined && targetGlasses !== null) {
      updateData.targetGlasses = targetGlasses;
    }

    console.log(`[PATCH HYDRATION] Updating with:`, updateData);

    const [updated] = await db
      .update(hydrationLogs)
      .set(updateData)
      .where(and(
        eq(hydrationLogs.id, logId),
        eq(hydrationLogs.userId, userId)
      ))
      .returning();

    if (!updated) {
      console.error(`[PATCH HYDRATION] Log not found or user mismatch. ID: ${logId}, User: ${userId}`);
      return res.status(404).json({ error: 'Log non trovato' });
    }

    console.log(`[PATCH HYDRATION] Success. New count: ${updated.glassesCount}`);
    res.json(updated);
  } catch (error) {
    console.error('❌ Errore PATCH /hydration/:id:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del log' });
  }
});

// POST /api/benessere/hydration/drink - Aggiungi bicchiere
router.post('/hydration/drink', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    // Usa la data fornita dal client se presente, altrimenti UTC
    const clientDate = req.body.date as string;
    const today = clientDate ? clientDate : new Date().toISOString().split('T')[0];

    // Trova l'ultimo log di oggi
    const [currentLog] = await db
      .select()
      .from(hydrationLogs)
      .where(and(
        eq(hydrationLogs.userId, userId),
        sql`TO_CHAR(${hydrationLogs.date}, 'YYYY-MM-DD') = ${today}`
      ))
      .orderBy(desc(hydrationLogs.createdAt))
      .limit(1);

    let logToUpdate = currentLog;

    // Se non esiste, crealo
    if (!logToUpdate) {
      const [newLog] = await db
        .insert(hydrationLogs)
        .values({
          userId: userId,
          date: new Date(today),
          glassesCount: 0,
          // targetGlasses usa il default del DB (8)
        })
        .returning();
      logToUpdate = newLog;
    }

    // Incrementa
    const [updated] = await db
      .update(hydrationLogs)
      .set({
        glassesCount: sql`${hydrationLogs.glassesCount} + 1`,
        lastDrinkAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(hydrationLogs.id, logToUpdate.id))
      .returning();

    // Controlla se obiettivo raggiunto
    if (updated.glassesCount >= (updated.targetGlasses || 8)) {
      // Crea SUBITO un nuovo log vuoto per il prossimo ciclo
      // Mantieni lo stesso target del log precedente
      const [nextLog] = await db
        .insert(hydrationLogs)
        .values({
          userId: userId,
          date: new Date(today),
          glassesCount: 0,
          targetGlasses: updated.targetGlasses || 8,
          createdAt: new Date(Date.now() + 1000) // Assicura che sia successivo
        })
        .returning();

      // Restituisci il NUOVO log, segnalando il completamento del precedente
      return res.json({
        ...nextLog,
        previousCompleted: true,
        previousLog: updated
      });
    }

    res.json(updated);
  } catch (error) {
    console.error('❌ Errore POST /hydration/drink:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento hydration' });
  }
});

// GET /api/benessere/hydration/history - Storico hydration
router.get('/hydration/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { days = 7 } = req.query;

    const history = await db
      .select()
      .from(hydrationLogs)
      .where(and(
        eq(hydrationLogs.userId, userId),
        sql`${hydrationLogs.date} >= CURRENT_DATE - INTERVAL '${sql.raw(String(Number(days)))} days'`
      ))
      .orderBy(desc(hydrationLogs.date));

    // Aggiungi esplicitamente il log di oggi se non è ancora presente nello storico
    // Questo serve per avere un feedback immediato nell'UI quando l'utente beve un bicchiere
    const today = new Date().toISOString().split('T')[0];
    const hasToday = history.some(log => {
        const logDate = new Date(log.date).toISOString().split('T')[0];
        return logDate === today;
    });

    if (!hasToday) {
        const [todayLog] = await db
            .select()
            .from(hydrationLogs)
            .where(and(
                eq(hydrationLogs.userId, userId),
                sql`TO_CHAR(${hydrationLogs.date}, 'YYYY-MM-DD') = ${today}`
            ));
        
        if (todayLog) {
            history.unshift(todayLog);
        }
    }

    res.json(history);
  } catch (error) {
    console.error('❌ Errore GET /hydration/history:', error);
    res.status(500).json({ error: 'Errore nel recupero dello storico' });
  }
});

// DELETE /api/benessere/hydration/:id - Elimina log idratazione (opzionale, ma richiesto)
router.delete('/hydration/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const logId = parseInt(req.params.id);

        if (isNaN(logId)) {
            return res.status(400).json({ error: 'ID non valido' });
        }

        const [deletedLog] = await db
            .delete(hydrationLogs)
            .where(and(
                eq(hydrationLogs.id, logId),
                eq(hydrationLogs.userId, userId)
            ))
            .returning();

        if (!deletedLog) {
            return res.status(404).json({ error: 'Log non trovato' });
        }

        res.json({ message: 'Log eliminato con successo' });
    } catch (error) {
        console.error('❌ Errore DELETE /hydration/:id:', error);
        res.status(500).json({ error: 'Errore durante l\'eliminazione del log' });
    }
});

// =====================================================
// 🥗 NUTRITION TRACKING
// =====================================================

// GET /api/benessere/nutrition - Lista nutrition logs
router.get('/nutrition', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    let query = db
      .select()
      .from(nutritionLogs)
      .where(eq(nutritionLogs.userId, userId))
      .orderBy(desc(nutritionLogs.mealTime));

    if (startDate) {
      query = query.where(gte('meal_time', new Date(startDate as string)));
    }

    if (endDate) {
      // Per includere tutta la giornata finale, aggiungiamo 1 giorno o impostiamo orario fine giornata
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      query = query.where(lte('meal_time', end));
    }

    const logs = await query;
    res.json(logs);
  } catch (error) {
    console.error('❌ Errore GET /nutrition:', error);
    res.status(500).json({ error: 'Errore nel recupero dei nutrition logs' });
  }
});

// POST /api/benessere/nutrition - Crea nutrition log
router.post('/nutrition', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const {
      concorsoId,
      mealTime,
      mealType,
      description,
      energyLevelBefore,
      energyLevelAfter,
      brainFog,
      glycemicSpike,
      notes
    } = req.body;

    if (!mealTime) {
      return res.status(400).json({ error: 'Campo obbligatorio: mealTime' });
    }

    const [newLog] = await db
      .insert(nutritionLogs)
      .values({
        userId: userId,
        mealTime: new Date(mealTime),
        mealType: mealType || 'snack',
        description: description || null,
        energyLevelBefore: energyLevelBefore || null,
        energyLevelAfter: energyLevelAfter || null,
        brainFog: brainFog || false,
        glycemicSpike: glycemicSpike || false,
        notes: notes || null
      })
      .returning();

    res.status(201).json(newLog);
  } catch (error) {
    console.error('❌ Errore POST /nutrition:', error);
    res.status(500).json({ 
      error: 'Errore nel salvataggio del nutrition log',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// DELETE /api/benessere/nutrition/:id - Elimina nutrition log
router.delete('/nutrition/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const logId = parseInt(req.params.id);

    if (isNaN(logId)) {
      return res.status(400).json({ error: 'ID non valido' });
    }

    const [deletedLog] = await db
      .delete(nutritionLogs)
      .where(and(
        eq(nutritionLogs.id, logId),
        eq(nutritionLogs.userId, userId)
      ))
      .returning();

    if (!deletedLog) {
      return res.status(404).json({ error: 'Log non trovato' });
    }

    res.json({ message: 'Log eliminato con successo' });
  } catch (error) {
    console.error('❌ Errore DELETE /nutrition/:id:', error);
    res.status(500).json({ error: 'Errore durante l\'eliminazione del log' });
  }
});

// GET /api/benessere/nutrition/stats - Statistiche nutrizione
router.get('/nutrition/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { period = 'week' } = req.query;

    let dateCondition;
    switch (period) {
      case 'today':
        dateCondition = sql`${nutritionLogs.mealTime}::date = CURRENT_DATE`;
        break;
      case 'week':
        dateCondition = sql`${nutritionLogs.mealTime} >= CURRENT_DATE - INTERVAL '7 days'`;
        break;
      case 'month':
        dateCondition = sql`${nutritionLogs.mealTime} >= CURRENT_DATE - INTERVAL '30 days'`;
        break;
      default:
        dateCondition = sql`TRUE`;
    }

    const [stats] = await db
      .select({
        total_meals: sql<number>`COUNT(*)`,
        avg_energy_after: sql<number>`AVG(${nutritionLogs.energyLevelAfter})`,
        brain_fog_episodes: sql<number>`COUNT(*) FILTER (WHERE ${nutritionLogs.brainFog} = true)`,
        glycemic_spikes: sql<number>`COUNT(*) FILTER (WHERE ${nutritionLogs.glycemicSpike} = true)`
      })
      .from(nutritionLogs)
      .where(and(
        eq(nutritionLogs.userId, userId),
        dateCondition
      ));

    res.json(stats);
  } catch (error) {
    console.error('❌ Errore GET /nutrition/stats:', error);
    res.status(500).json({ error: 'Errore nel calcolo delle statistiche nutrizione' });
  }
});

// =====================================================
// 📊 DASHBOARD GENERALE
// =====================================================

// GET /api/benessere/dashboard - Dashboard completa
router.get('/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    // Usa la data fornita dal client se presente, altrimenti UTC
    const clientDate = req.query.date as string;
    const today = clientDate ? clientDate : new Date().toISOString().split('T')[0];

    // Breathing oggi
    const [breathingToday] = await db
      .select({
        sessions: sql<number>`COUNT(*)`,
        total_cycles: sql<number>`SUM(cycles_completed)`
      })
      .from(breathingSessions)
      .where(and(
        eq(breathingSessions.userId, userId),
        sql`TO_CHAR(${breathingSessions.startedAt}, 'YYYY-MM-DD') = ${today}`
      ));

    // Hydration oggi
    const [hydrationToday] = await db
      .select()
      .from(hydrationLogs)
      .where(and(
        eq(hydrationLogs.userId, userId),
        sql`TO_CHAR(${hydrationLogs.date}, 'YYYY-MM-DD') = ${today}`
      ));

    // Sleep ieri (basato sulla data client)
    const todayDate = new Date(today);
    const yesterdayDate = new Date(todayDate.getTime() - 86400000);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    const [sleepYesterday] = await db
      .select()
      .from(sleepLogs)
      .where(and(
        eq(sleepLogs.userId, userId),
        sql`TO_CHAR(${sleepLogs.date}, 'YYYY-MM-DD') = ${yesterday}`
      ));

    // Reframes questa settimana
    const [reframingWeek] = await db
      .select({
        count: sql<number>`COUNT(*)`
      })
      .from(reframingLogs)
      .where(and(
        eq(reframingLogs.userId, userId),
        sql`${reframingLogs.createdAt} >= NOW() - INTERVAL '7 days'`
      ));

    // Nutrition oggi
    const [nutritionToday] = await db
      .select({
        total_meals: sql<number>`COUNT(*)`,
        avg_energy: sql<number>`AVG(energy_level_after)`
      })
      .from(nutritionLogs)
      .where(and(
        eq(nutritionLogs.userId, userId),
        sql`TO_CHAR(${nutritionLogs.mealTime}, 'YYYY-MM-DD') = ${today}`
      ));

    // --- Calcolo Achievements ---

    // 1. Hydration Streak (ultimi 30 giorni)
    const hydrationHistory = await db
      .select()
      .from(hydrationLogs)
      .where(and(
        eq(hydrationLogs.userId, userId),
        sql`${hydrationLogs.date} >= CURRENT_DATE - INTERVAL '35 days'`
      ))
      .orderBy(desc(hydrationLogs.date));

    const hydrationMap = new Map();
    hydrationHistory.forEach(log => {
      const d = new Date(log.date);
      const key = d.toISOString().split('T')[0];
      // Se abbiamo più log, consideriamo valido il giorno se ALMENO UNO raggiunge il target
      if (!hydrationMap.has(key) || log.glassesCount >= (log.targetGlasses || 8)) {
        hydrationMap.set(key, log);
      }
    });

    let hydrationStreak = 0;
    const todayDateObj = new Date(today);
    
    // Controlla a ritroso da oggi per 30 giorni
    for (let i = 0; i < 30; i++) {
      const d = new Date(todayDateObj);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const log = hydrationMap.get(dateStr);
      const isComplete = log && log.glassesCount >= (log.targetGlasses || 8);

      if (i === 0) {
        // Oggi: se completato aumenta streak, se no non interrompe (streak corrente salvato fino a ieri)
        if (isComplete) hydrationStreak++;
      } else {
        // Giorni passati: se completato aumenta, se no STOP
        if (isComplete) {
          hydrationStreak++;
        } else {
          break;
        }
      }
    }

    // 2. Total Breathing Sessions
    const [totalBreathing] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(breathingSessions)
      .where(eq(breathingSessions.userId, userId));

    // 3. Sleep Streak (8+ ore, ultimi 30 giorni)
    const sleepHistory = await db
      .select()
      .from(sleepLogs)
      .where(and(
        eq(sleepLogs.userId, userId),
        sql`${sleepLogs.date} >= CURRENT_DATE - INTERVAL '35 days'`
      ))
      .orderBy(desc(sleepLogs.date));

    const sleepMap = new Map();
    sleepHistory.forEach(log => {
      const d = new Date(log.date);
      const key = d.toISOString().split('T')[0];
      sleepMap.set(key, log);
    });

    let sleepStreak = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(todayDateObj);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const log = sleepMap.get(dateStr);
      const isComplete = log && (log.totalHours || 0) >= 8;

      if (i === 0) {
        if (isComplete) sleepStreak++;
      } else {
        if (isComplete) {
          sleepStreak++;
        } else {
          break;
        }
      }
    }

    // 4. Total Reframes
    const [totalReframes] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(reframingLogs)
      .where(eq(reframingLogs.userId, userId));

    res.json({
      breathing: {
        sessions_today: breathingToday?.sessions || 0,
        cycles_today: breathingToday?.total_cycles || 0
      },
      hydration: {
        glasses_today: hydrationToday?.glassesCount || 0,
        target_today: hydrationToday?.targetGlasses || 8,
        percentage: hydrationToday ? Math.round((hydrationToday.glassesCount / hydrationToday.targetGlasses) * 100) : 0
      },
      sleep: {
        hours_last_night: sleepYesterday?.totalHours || null,
        quality_last_night: sleepYesterday?.qualityRating || null
      },
      reframing: {
        count_this_week: reframingWeek?.count || 0
      },
      nutrition: {
        meals_today: nutritionToday?.total_meals || 0,
        avg_energy: nutritionToday?.avg_energy ? Math.round(nutritionToday.avg_energy) : null
      },
      achievements: {
        hydration_streak: hydrationStreak,
        total_breathing_sessions: Number(totalBreathing?.count || 0),
        sleep_streak: sleepStreak,
        total_reframes: Number(totalReframes?.count || 0)
      }
    });

  } catch (error) {
    console.error('❌ Errore GET /dashboard:', error);
    res.status(500).json({ error: 'Errore nel recupero della dashboard' });
  }
});

export default router;
