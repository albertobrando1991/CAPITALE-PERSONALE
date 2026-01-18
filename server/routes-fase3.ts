// ============================================================================
// FASE 3: CONSOLIDAMENTO & PRATICA INTENSA - API ROUTES
// File: server/routes-fase3.ts
// ============================================================================

import express, { Request, Response } from 'express';
import { pool as db } from './db';
import multer from 'multer';
import { join } from 'path';
import { readFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { generateWithFallback } from './services/ai';

const router = express.Router();

// Configura multer per file upload
const uploadsRoot = process.env.VERCEL ? join("/tmp", "uploads") : join(process.cwd(), "uploads");
const uploadDir = join(uploadsRoot, "temp_drill");
try {
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.error("[FASE3][MULTER] Impossibile creare uploadDir:", uploadDir, e);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = file.originalname.split(".").pop();
    cb(null, `${uniqueSuffix}.${ext}`);
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Helper functions (duplicated from routes.ts for isolation)
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParse = await import("pdf-parse");
  const pdfData = await pdfParse.default(buffer);
  return pdfData.text || "";
}

function cleanJson(text: string): string {
  if (!text) return "[]";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstOpenBracket = cleaned.indexOf("[");
  const lastCloseBracket = cleaned.lastIndexOf("]");
  if (firstOpenBracket !== -1 && lastCloseBracket !== -1) {
    cleaned = cleaned.substring(firstOpenBracket, lastCloseBracket + 1);
  }
  return cleaned;
}
// Remove duplicate genAI initialization later in the file
// Middleware autenticazione (da adattare al tuo sistema auth)
const requireAuth = (req: Request, res: Response, next: Function) => {
  // @ts-ignore - session type augmentation might be missing in this context
  if (!req.session?.userId && !(req as any).user?.id) {
    return res.status(401).json({ error: 'Non autenticato' });
  }
  next();
};

// Helper to get userId from session or user object
const getUserId = (req: Request): string => {
    // @ts-ignore
    return req.session?.userId || (req as any).user?.id;
}

// Inizializza Gemini AI (per Recovery Plans) - Removed duplicate
// const genAI = ...

// ============================================================================
// PROGRESS TRACKING
// ============================================================================

/**
 * GET /api/fase3/:concorsoId/progress
 * Ottieni stato consolidamento per concorso
 */
router.get('/:concorsoId/progress', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId } = req.params;
    const userId = getUserId(req);

    if (!userId) {
      console.error("GET /progress: userId is missing");
      return res.status(401).json({ error: "User ID missing" });
    }

    console.log(`[GET /progress] Fetching for user=${userId}, concorso=${concorsoId}`);

    // Gestione UUID vs Integer per concorsoId
    // Se concorsoId è un UUID, non facciamo parseInt e non lo usiamo direttamente nelle query che si aspettano un Integer.
    // Dobbiamo verificare se la tabella fase3_progress usa integer o uuid per concorso_id.
    // Assumiamo che concorsi.id sia UUID (dato che nel frontend vediamo UUID).
    // Se le tabelle fase3 usano integer per concorso_id, allora c'è un problema di design o dobbiamo fare una lookup.
    // Tuttavia, guardando le migration (che non vedo ma assumo), se concorsi.id è UUID, allora fase3_progress.concorso_id dovrebbe essere UUID o Text.
    // Se è integer, allora dobbiamo convertire UUID -> ID Integer (se esiste questa mappatura) o correggere il tipo.
    
    // Per ora, assumiamo che se è UUID, il DB lo supporti o che dobbiamo fare un cast.
    // Se il DB si aspetta Integer e noi passiamo UUID string, postgres darà errore "invalid input syntax for integer".
    
    // VERIFICA RAPIDA: Se concorsoId è stringa lunga (UUID), passiamolo come stringa.
    // Postgres farà il cast automatico se la colonna è UUID. Se è Integer, fallirà.
    
    // Inizializza record se non esiste
    // FIX: Sostituito ON CONFLICT che fallisce se manca il vincolo UNIQUE nel DB
    const checkExist = await db.query(
        'SELECT id FROM fase3_progress WHERE user_id = $1 AND concorso_id = $2 LIMIT 1',
        [userId, concorsoId]
    );

    if (checkExist.rows.length === 0) {
        try {
            await db.query(`
                INSERT INTO fase3_progress (user_id, concorso_id)
                VALUES ($1, $2)
            `, [userId, concorsoId]);
        } catch (insertError) {
             console.error("Error initializing progress record:", insertError);
             // Continue anyway, maybe it exists? Or maybe DB constraint issue.
        }
    }

    // AUTO-CLEANUP: Rimuovi bin vuoti (senza errori) per evitare "0 errori" nella UI
    try {
      await db.query(`
        DELETE FROM fase3_error_bins 
        WHERE user_id = $1 AND concorso_id = $2 
        AND id NOT IN (SELECT DISTINCT error_bin_id FROM fase3_errors WHERE error_bin_id IS NOT NULL)
      `, [userId, concorsoId]);
    } catch (cleanupError) {
       console.error("Error during auto-cleanup:", cleanupError);
    }

    // SYNC: Ricalcola statistiche reali per garantire coerenza Dashboard
    const statsResult = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM fase3_errors WHERE user_id = $1 AND concorso_id = $2) as total_errors,
        (SELECT COUNT(DISTINCT id) FROM fase3_error_bins WHERE user_id = $1 AND concorso_id = $2 AND is_resolved = false) as weak_areas_count,
        (SELECT COUNT(*) FROM fase3_drill_sessions WHERE user_id = $1 AND concorso_id = $2) as total_drill_sessions,
        (SELECT COALESCE(SUM(duration_seconds), 0) / 3600.0 FROM fase3_drill_sessions WHERE user_id = $1 AND concorso_id = $2 AND is_completed = true) as total_drill_hours,
        (SELECT COALESCE(AVG(score_percentage), 0) FROM fase3_drill_sessions WHERE user_id = $1 AND concorso_id = $2 AND is_completed = true) as retention_rate,
        (SELECT COUNT(*) FROM fase3_srs_items WHERE user_id = $1 AND concorso_id = $2 AND last_reviewed_at IS NOT NULL) as total_srs_reviews
    `, [userId, concorsoId]);
    
    const stats = statsResult.rows[0];

    // Aggiorna tabella progress con dati reali
    await db.query(`
        UPDATE fase3_progress
        SET 
            total_errors = $1,
            weak_areas_count = $2,
            total_drill_sessions = $3,
            total_drill_hours = $4,
            retention_rate = $5,
            total_srs_reviews = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $7 AND concorso_id = $8
    `, [
        stats.total_errors || 0, 
        stats.weak_areas_count || 0, 
        stats.total_drill_sessions || 0, 
        stats.total_drill_hours || 0, 
        stats.retention_rate || 0, 
        stats.total_srs_reviews || 0,
        userId, 
        concorsoId
    ]);

    // Recupera progresso aggiornato
    const result = await db.query(`
      SELECT
        fp.*,
        (SELECT COUNT(*) FROM fase3_error_bins WHERE user_id = $1 AND concorso_id = $2 AND is_resolved = false) as active_weak_areas,
        (SELECT COUNT(*) FROM fase3_srs_items WHERE user_id = $1 AND concorso_id = $2 AND next_review_date <= CURRENT_DATE) as items_due_today
      FROM fase3_progress fp
      WHERE fp.user_id = $1 AND fp.concorso_id = $2
    `, [userId, concorsoId]);

    if (result.rows.length === 0) {
        // Fallback if INSERT failed silently or something else
        return res.json({
            status: 'WEAK',
            total_errors: 0,
            weak_areas_count: 0,
            active_weak_areas: 0,
            items_due_today: 0,
            retention_rate: 0
        });
    }

    // Calcola stato dinamico
    const progress = result.rows[0];
    const status = calculateStatus(progress);

    // Update stato se cambiato
    if (status !== progress.status) {
      await db.query(`
        UPDATE fase3_progress
        SET status = $1, can_access_fase4 = $2
        WHERE user_id = $3 AND concorso_id = $4
      `, [status, status === 'SOLID', userId, concorsoId]);
      progress.status = status;
      progress.can_access_fase4 = status === 'SOLID';
    }

    res.json(progress);
  } catch (error) {
    console.error('Errore GET progress:', error);
    res.status(500).json({ error: 'Errore recupero progresso' });
  }
});

/**
 * Calcola stato Fase 3 basato su metriche
 */
function calculateStatus(progress: any): string {
  const weakAreas = parseInt(progress.active_weak_areas) || 0;
  const retention = parseFloat(progress.retention_rate) || 0;
  const drillHours = parseFloat(progress.total_drill_hours) || 0;

  if (weakAreas >= 5 || retention < 70 || drillHours < 10) {
    return 'WEAK';
  } else if (weakAreas >= 3 || retention < 85 || drillHours < 20) {
    return 'REVIEW';
  } else {
    return 'SOLID';
  }
}

// ============================================================================
// ERROR BINNING
// ============================================================================

/**
 * GET /api/fase3/:concorsoId/error-bins
 * Ottieni tutti gli Error Bins (raggruppamenti errori)
 */
router.get('/:concorsoId/error-bins', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId } = req.params;
    const userId = getUserId(req);
    const { resolved } = req.query; // ?resolved=true/false

    let query = `
      SELECT
        eb.*,
        m.nome_materia as materia_name,
        (SELECT COUNT(*) FROM fase3_errors WHERE error_bin_id = eb.id) as total_errors
      FROM fase3_error_bins eb
      LEFT JOIN materie_sq3r m ON eb.materia_id = m.id
      WHERE eb.user_id = $1 AND eb.concorso_id = $2
    `;

    const params: any[] = [userId, concorsoId];

    // AUTO-CLEANUP: Disabilitato temporaneamente per debug
    /*
    await db.query(`
      DELETE FROM fase3_error_bins 
      WHERE user_id = $1 AND concorso_id = $2 
      AND id NOT IN (SELECT DISTINCT error_bin_id FROM fase3_errors)
    `, [userId, concorsoId]);
    */

    if (resolved !== undefined) {
      query += ` AND eb.is_resolved = $3`;
      params.push(resolved === 'true');
    }

    query += ` ORDER BY eb.error_count DESC, eb.updated_at DESC`;

    const result = await db.query(query, params);
    
    // Prevent caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    
    res.json(result.rows);
  } catch (error) {
    console.error('Errore GET error-bins:', error);
    res.status(500).json({ error: 'Errore recupero error bins' });
  }
});

/**
 * GET /api/fase3/:concorsoId/error-bins/:binId
 * Dettaglio singolo Error Bin con errori associati
 */
router.get('/:concorsoId/error-bins/:binId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId, binId } = req.params;
    const userId = getUserId(req);

    // Recupera bin
    const binResult = await db.query(`
      SELECT eb.*, m.nome_materia as materia_name
      FROM fase3_error_bins eb
      LEFT JOIN materie_sq3r m ON eb.materia_id = m.id
      WHERE eb.id = $1 AND eb.user_id = $2 AND eb.concorso_id = $3
    `, [binId, userId, concorsoId]);

    if (binResult.rows.length === 0) {
      return res.status(404).json({ error: 'Error Bin non trovato' });
    }

    // Recupera errori associati
    const errorsResult = await db.query(`
      SELECT * FROM fase3_errors
      WHERE error_bin_id = $1
      ORDER BY occurred_at DESC
      LIMIT 50
    `, [binId]);

    res.json({
      ...binResult.rows[0],
      errors: errorsResult.rows
    });
  } catch (error) {
    console.error('Errore GET error-bin detail:', error);
    res.status(500).json({ error: 'Errore recupero dettaglio bin' });
  }
});

/**
 * POST /api/fase3/:concorsoId/errors
 * Registra nuovo errore (da Quiz, Flashcards, Drill)
 */
router.post('/:concorsoId/errors', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId } = req.params;
    const userId = getUserId(req);
    const {
      source_type,
      source_id,
      topic_name,
      materia_id,
      question_text,
      wrong_answer,
      correct_answer,
      explanation,
      mistake_type
    } = req.body;

    // Validazione
    if (!source_type || !topic_name) {
      return res.status(400).json({ error: 'source_type e topic_name sono obbligatori' });
    }

    // Se materia_id non è fornito, prova a trovarlo dal topic_name (che spesso è il nome della materia)
    let finalMateriaId = materia_id;
    if (!finalMateriaId && topic_name) {
        const materiaResult = await db.query(`
            SELECT id FROM materie_sq3r 
            WHERE user_id = $1 AND concorso_id = $2 
            AND TRIM(UPPER(nome_materia)) = TRIM(UPPER($3))
            LIMIT 1
        `, [userId, concorsoId, topic_name]);
        
        if (materiaResult.rows.length > 0) {
            finalMateriaId = materiaResult.rows[0].id;
        }
    }

    // Trova o crea Error Bin per questo topic
    const topic_slug = topic_name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');

    console.log(`[POST /errors] Registering error for topic: "${topic_name}" (slug: ${topic_slug})`);

    let binResult = await db.query(`
      SELECT id FROM fase3_error_bins
      WHERE user_id = $1 AND concorso_id = $2 AND topic_slug = $3
    `, [userId, concorsoId, topic_slug]);

    let errorBinId;

    if (binResult.rows.length === 0) {
      console.log(`[POST /errors] Creating NEW Error Bin for slug: ${topic_slug}`);
      // Crea nuovo bin
      const newBinResult = await db.query(`
        INSERT INTO fase3_error_bins (user_id, concorso_id, materia_id, topic_name, topic_slug)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [userId, concorsoId, finalMateriaId, topic_name, topic_slug]);
      errorBinId = newBinResult.rows[0].id;
    } else {
      console.log(`[POST /errors] Using EXISTING Error Bin ID: ${binResult.rows[0].id}`);
      errorBinId = binResult.rows[0].id;
    }

    // MAPPING MISTAKE TYPE (English Frontend -> Italian DB Constraint)
    const mistakeMap: Record<string, string> = {
        'knowledge_gap': 'confusione_concetti',
        'misinterpretation': 'comprensione', 
        'memory_slip': 'memoria',
        'distraction': 'distrazione',
        'time_pressure': 'tempo'
    };

    const validMistakeType = mistakeMap[mistake_type] || 'altro';

    // Inserisci errore
    const errorResult = await db.query(`
      INSERT INTO fase3_errors (
        user_id, concorso_id, error_bin_id, source_type, source_id,
        question_text, wrong_answer, correct_answer, explanation, mistake_type,
        occurred_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      userId, concorsoId, errorBinId, source_type, source_id,
      question_text, wrong_answer, correct_answer, explanation, 
      validMistakeType
    ]);

    // Force Update of the Error Bin timestamp to ensure it appears at the top
    await db.query(`
      UPDATE fase3_error_bins
      SET
        error_count = error_count + 1,
        total_attempts = total_attempts + 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [errorBinId]);

    // Aggiorna progresso generale
    await db.query(`
      UPDATE fase3_progress
      SET
        total_errors = total_errors + 1,
        weak_areas_count = (SELECT COUNT(DISTINCT id) FROM fase3_error_bins WHERE user_id = $1 AND concorso_id = $2 AND is_resolved = false),
        last_activity_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND concorso_id = $2
    `, [userId, concorsoId]);

    res.status(201).json(errorResult.rows[0]);
  } catch (error) {
    console.error('Errore POST error:', error);
    res.status(500).json({ error: 'Errore registrazione errore: ' + (error instanceof Error ? error.message : String(error)) });
  }
});

/**
 * POST /api/fase3/:concorsoId/sync
 * Ricalcola forzatamente tutte le statistiche e i collegamenti
 */
router.post('/:concorsoId/sync', requireAuth, async (req: Request, res: Response) => {
    try {
        const { concorsoId } = req.params;
        const userId = getUserId(req);

        console.log(`[SYNC] Starting full sync for user ${userId}, concorso ${concorsoId}`);

        // 1. Ricalcola totali errori per bin
        await db.query(`
            UPDATE fase3_error_bins b
            SET error_count = (
                SELECT COUNT(*) FROM fase3_errors e 
                WHERE e.error_bin_id = b.id
            ),
            updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $1 AND concorso_id = $2
        `, [userId, concorsoId]);

        // 2. Elimina bin vuoti (rimasti a 0 errori)
        await db.query(`
            DELETE FROM fase3_error_bins 
            WHERE user_id = $1 AND concorso_id = $2 AND error_count = 0
        `, [userId, concorsoId]);

        // 3. Aggiorna progresso generale
        const stats = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM fase3_errors WHERE user_id = $1 AND concorso_id = $2) as total_errors,
                (SELECT COUNT(*) FROM fase3_error_bins WHERE user_id = $1 AND concorso_id = $2 AND is_resolved = false) as weak_areas_count,
                (SELECT COUNT(*) FROM fase3_drill_sessions WHERE user_id = $1 AND concorso_id = $2) as total_drill_sessions,
                (SELECT COALESCE(SUM(duration_seconds), 0) / 3600.0 FROM fase3_drill_sessions WHERE user_id = $1 AND concorso_id = $2 AND is_completed = true) as total_drill_hours,
                (SELECT COALESCE(AVG(score_percentage), 0) FROM fase3_drill_sessions WHERE user_id = $1 AND concorso_id = $2 AND is_completed = true) as retention_rate
        `, [userId, concorsoId]);

        const s = stats.rows[0];

        await db.query(`
            UPDATE fase3_progress
            SET 
                total_errors = $1,
                weak_areas_count = $2,
                total_drill_sessions = $3,
                total_drill_hours = $4,
                retention_rate = $5,
                last_activity_at = CURRENT_TIMESTAMP
            WHERE user_id = $6 AND concorso_id = $7
        `, [s.total_errors, s.weak_areas_count, s.total_drill_sessions, s.total_drill_hours, s.retention_rate, userId, concorsoId]);

        // 4. Se ci sono errori orfani (senza bin o con bin cancellato), ricreiamo i bin
        // Questo risolve il problema: "Errori Totali: 48, Aree Deboli: 0"
        const orphanedErrors = await db.query(`
            SELECT topic_name, topic_slug, materia_id, COUNT(*) as count
            FROM fase3_errors e
            LEFT JOIN fase3_error_bins b ON e.error_bin_id = b.id
            WHERE e.user_id = $1 AND e.concorso_id = $2 AND b.id IS NULL
            GROUP BY topic_name, topic_slug, materia_id
        `, [userId, concorsoId]);

        if (orphanedErrors.rows.length > 0) {
            console.log(`[SYNC] Found ${orphanedErrors.rows.length} orphaned error groups. Recreating bins...`);
            
            for (const group of orphanedErrors.rows) {
                // Ricrea bin
                const newBin = await db.query(`
                    INSERT INTO fase3_error_bins (user_id, concorso_id, materia_id, topic_name, topic_slug, error_count)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                `, [userId, concorsoId, group.materia_id, group.topic_name, group.topic_slug, group.count]);
                
                const newBinId = newBin.rows[0].id;

                // Ricollega errori
                await db.query(`
                    UPDATE fase3_errors
                    SET error_bin_id = $1
                    WHERE user_id = $2 AND concorso_id = $3 AND topic_slug = $4 AND error_bin_id IS NULL OR error_bin_id NOT IN (SELECT id FROM fase3_error_bins)
                `, [newBinId, userId, concorsoId, group.topic_slug]);
            }
            
            // Rilancia sync per aggiornare i conteggi finali
            console.log(`[SYNC] Bins recreated. Triggering final stats update.`);
            // ... (la ricorsione qui sarebbe pericolosa, ci affidiamo al prossimo sync o aggiorniamo manualmente i contatori di progress)
             await db.query(`
                UPDATE fase3_progress
                SET weak_areas_count = (SELECT COUNT(*) FROM fase3_error_bins WHERE user_id = $1 AND concorso_id = $2 AND is_resolved = false)
                WHERE user_id = $1 AND concorso_id = $2
            `, [userId, concorsoId]);
        }

        console.log(`[SYNC] Completed. Stats updated.`);
        res.json({ success: true, stats: s });

    } catch (error) {
        console.error('Errore SYNC:', error);
        res.status(500).json({ error: 'Errore sincronizzazione' });
    }
});

/**
 * POST /api/fase3/:concorsoId/error-bins/:binId/recovery-plan
 * Genera Recovery Plan AI per un Error Bin
 */
router.post('/:concorsoId/error-bins/:binId/recovery-plan', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId, binId } = req.params;
    const userId = getUserId(req);

    // Check rimosso per permettere il fallback statico
    // if (!genAI && !getOpenAIClient()) {
    //   return res.status(503).json({ error: 'Servizio AI non disponibile (API KEY mancante)' });
    // }

    // Recupera bin e errori
    console.log(`[RecoveryPlan] Fetching bin ${binId} for user ${userId}`);
    const binResult = await db.query(`
      SELECT eb.*, m.nome_materia as materia_name
      FROM fase3_error_bins eb
      LEFT JOIN materie_sq3r m ON eb.materia_id = m.id
      WHERE eb.id = $1 AND eb.user_id = $2 AND eb.concorso_id = $3
    `, [binId, userId, concorsoId]);

    if (binResult.rows.length === 0) {
      console.log(`[RecoveryPlan] Bin not found`);
      return res.status(404).json({ error: 'Error Bin non trovato' });
    }

    const bin = binResult.rows[0];
    console.log(`[RecoveryPlan] Found bin: ${bin.topic_name}`);

    const errorsResult = await db.query(`
      SELECT question_text, wrong_answer, correct_answer, mistake_type
      FROM fase3_errors
      WHERE error_bin_id = $1
      ORDER BY occurred_at DESC
      LIMIT 10
    `, [binId]);
    console.log(`[RecoveryPlan] Found ${errorsResult.rows.length} errors`);

    const prompt = `
Sei un tutor esperto di preparazione concorsi pubblici. Analizza questi errori ripetuti:

**Argomento**: ${bin.topic_name} (Materia: ${bin.materia_name || 'Non specificata'})
**Errori totali**: ${bin.error_count}
**Tasso errore**: ${bin.error_rate}%

**Ultimi errori**:
${errorsResult.rows.map((e: any, i: number) => `
${i + 1}. Domanda: ${e.question_text || 'N/A'}
   Risposta errata: ${e.wrong_answer || 'N/A'}
   Risposta corretta: ${e.correct_answer || 'N/A'}
   Tipo errore: ${e.mistake_type || 'Non classificato'}
`).join('\n')}

Genera un **Piano di Recupero** strutturato in 3 step:
1. **Diagnosi**: Qual è il problema di fondo? (es. confusione concetti, memoria, superficialità)
2. **Strategia**: Come studiare questo argomento (rilettura SQ3R, drill mirati, flashcards, esempi)
3. **Action Plan**: Passi concreti da fare oggi (max 3 azioni immediate)

Formato risposta: Markdown, massimo 300 parole, tono motivante ma diretto.
    `;

    let recoveryPlan = "";
    try {
      recoveryPlan = await generateWithFallback({
        task: "recovery_plan",
        userPrompt: prompt,
        temperature: 0.6,
        maxOutputTokens: 1200,
        responseMode: "text",
      });
    } catch (e: any) {
      console.error("Errore generazione Recovery Plan (OpenRouter):", e?.message || e);
    }
    
    // FALLBACK ESTREMO (Se entrambe le AI falliscono, per evitare crash 500)
    if (!recoveryPlan) {
        console.log("All AI services failed. Using static fallback plan.");
        recoveryPlan = `
## Piano di Recupero (Fallback)

**Nota:** I servizi di intelligenza artificiale sono momentaneamente non disponibili. Ecco un piano generico basato sui tuoi errori.

### 1. Diagnosi
Dagli errori registrati emerge una necessità di consolidare le basi teoriche dell'argomento.

### 2. Strategia
- **Rilettura attiva:** Torna sui capitoli relativi a questo argomento usando il metodo SQ3R.
- **Drill Mirati:** Esegui sessioni di quiz brevi (5-10 domande) focalizzate solo su questo topic.

### 3. Action Plan
1. Rileggi gli appunti relativi agli errori commessi oggi.
2. Crea 3 nuove flashcard per i concetti che hai sbagliato.
3. Riprova il quiz tra 24 ore.
        `;
    }

    if (!recoveryPlan) {
        return res.status(503).json({ error: "Impossibile generare Recovery Plan al momento (AI Error)" });
    }

    // Salva Recovery Plan
    try {
        await db.query(`
          UPDATE fase3_error_bins
          SET
            recovery_plan = $1,
            recovery_plan_generated_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [recoveryPlan, binId]);
    } catch (dbError: any) {
        console.error("Error saving recovery plan:", dbError);
        // Self-healing: Se mancano le colonne, aggiungile e riprova
        if (dbError.message?.includes("column") || dbError.code === '42703') {
             console.log("⚠️ Missing columns detected. Attempting schema fix...");
             try {
                 await db.query(`
                    ALTER TABLE fase3_error_bins 
                    ADD COLUMN IF NOT EXISTS recovery_plan TEXT,
                    ADD COLUMN IF NOT EXISTS recovery_plan_generated_at TIMESTAMP;
                 `);
                 // Riprova update
                 await db.query(`
                  UPDATE fase3_error_bins
                  SET
                    recovery_plan = $1,
                    recovery_plan_generated_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                  WHERE id = $2
                `, [recoveryPlan, binId]);
                console.log("✅ Schema fix successful and data saved.");
             } catch (fixError) {
                 console.error("❌ Failed to fix schema:", fixError);
                 // Non possiamo salvare, ma restituiamo comunque il piano al frontend per non bloccare l'utente
             }
        }
    }

    res.json({ recovery_plan: recoveryPlan });
  } catch (error: any) {
    console.error('Errore generazione Recovery Plan:', error);
    res.status(500).json({ 
        error: 'Errore generazione piano recupero',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * PATCH /api/fase3/:concorsoId/error-bins/:binId/resolve
 * Marca Error Bin come risolto
 */
router.patch('/:concorsoId/error-bins/:binId/resolve', requireAuth, async (req: Request, res: Response) => {
  try {
    const { binId } = req.params;
    const userId = getUserId(req);

    await db.query(`
      UPDATE fase3_error_bins
      SET
        is_resolved = true,
        resolved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
    `, [binId, userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Errore risoluzione bin:', error);
    res.status(500).json({ error: 'Errore risoluzione error bin' });
  }
});


// ============================================================================
// DRILL SESSIONS
// ============================================================================

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * POST /api/fase3/:concorsoId/generate-questions
 * Genera domande da PDF, Testo o Topic (AI)
 */
router.post('/:concorsoId/generate-questions', requireAuth, upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    const { concorsoId } = req.params;
    const { type, content, topic_id, num_questions = 10 } = req.body;
    // type: 'pdf' | 'text' | 'topic'

    let textToAnalyze = "";

    // 1. Estrai testo
    if (type === 'pdf') {
      if (!req.file) return res.status(400).json({ error: "File PDF mancante" });
      try {
        textToAnalyze = await extractTextFromPDF(readFileSync(req.file.path));
        // Cleanup temp file
        unlinkSync(req.file.path);
      } catch (e) {
        return res.status(500).json({ error: "Errore lettura PDF" });
      }
    } else if (type === 'text') {
      textToAnalyze = content;
    } else if (type === 'topic') {
        // Recupera contenuto dai capitoli del topic
        const userId = getUserId(req);
        const chapters = await db.query(`
            SELECT contenuto_testo, titolo FROM capitoli_sq3r 
            WHERE materia_id = $1 AND user_id = $2
        `, [topic_id, userId]);
        
        if (chapters.rows.length === 0) return res.status(404).json({ error: "Nessun contenuto trovato per questo argomento" });
        
        textToAnalyze = chapters.rows.map(c => `Capitolo: ${c.titolo}\n${c.contenuto_testo}`).join("\n\n");
    } else {
        return res.status(400).json({ error: "Tipo generazione non valido" });
    }

    if (!textToAnalyze || textToAnalyze.length < 50) {
        return res.status(400).json({ error: "Testo insufficiente per generare domande" });
    }

    // 2. Genera domande con AI
    const systemPrompt = `Sei un esperto creatore di quiz per concorsi pubblici. 
    Analizza il testo fornito e genera ${num_questions} domande a risposta multipla.
    Le domande devono essere pertinenti, non inventate, e basate SOLO sul testo.
    
    Restituisci un ARRAY JSON puro:
    [
      {
        "text": "Domanda...",
        "options": ["A", "B", "C", "D"],
        "correctAnswer": "A", // La stringa esatta dell'opzione corretta
        "explanation": "Spiegazione...",
        "topic": "Argomento specifico"
      }
    ]`;

    const userPrompt = `Testo da analizzare:\n${textToAnalyze.substring(0, 30000)}`; // Limit context

    const questionsJson = await generateWithFallback({
      task: "fase3_drill_generate",
      systemPrompt,
      userPrompt,
      temperature: 0.4,
      maxOutputTokens: 3000,
      responseMode: "json",
      jsonRoot: "array",
    });

    let questions = [];
    try {
        const parsed = JSON.parse(questionsJson);
        questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
    } catch (e) {
        return res.status(500).json({ error: "Errore parsing risposta AI" });
    }

    res.json({ questions });

  } catch (error) {
    console.error("Errore generazione domande:", error);
    res.status(500).json({ error: "Errore interno server" });
  }
});

/**
 * POST /api/fase3/:concorsoId/error-bins/:binId/resolve
 * Toggle stato risolto/non risolto di un Error Bin
 */
router.post('/:concorsoId/error-bins/:binId/resolve', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId, binId } = req.params;
    const userId = getUserId(req);

    // 1. Controlla stato attuale
    const current = await db.query(`
        SELECT is_resolved FROM fase3_error_bins
        WHERE id = $1 AND user_id = $2 AND concorso_id = $3
    `, [binId, userId, concorsoId]);

    if (current.rows.length === 0) {
        return res.status(404).json({ error: "Bin non trovato" });
    }

    const newState = !current.rows[0].is_resolved;

    // 2. Aggiorna stato
    await db.query(`
      UPDATE fase3_error_bins
      SET is_resolved = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND user_id = $3 AND concorso_id = $4
    `, [newState, binId, userId, concorsoId]);

    // 3. Aggiorna statistiche globali
    await db.query(`
      UPDATE fase3_progress
      SET 
        weak_areas_count = (SELECT COUNT(*) FROM fase3_error_bins WHERE user_id = $1 AND concorso_id = $2 AND is_resolved = false)
      WHERE user_id = $1 AND concorso_id = $2
    `, [userId, concorsoId]);

    res.json({ success: true, is_resolved: newState });
  } catch (error) {
    console.error('Errore risoluzione bin:', error);
    res.status(500).json({ error: 'Errore aggiornamento stato bin' });
  }
});

/**
 * POST /api/fase3/:concorsoId/drill-sessions
 * Crea nuova sessione Drill
 */
router.post('/:concorsoId/drill-sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId } = req.params;
    const userId = getUserId(req);
    const { mode, topic_id, total_questions } = req.body;

    // Validazione
    if (!mode || !['weak', 'topic', 'mixed', 'pdf', 'text'].includes(mode)) {
      return res.status(400).json({ error: 'mode deve essere weak, topic, mixed, pdf o text' });
    }

    // Se generated_questions è un oggetto/array, convertilo in stringa
    let questionsStr = null;
    if (req.body.generated_questions) {
        questionsStr = typeof req.body.generated_questions === 'string' 
            ? req.body.generated_questions 
            : JSON.stringify(req.body.generated_questions);
    }

    const result = await db.query(`
      INSERT INTO fase3_drill_sessions (user_id, concorso_id, mode, topic_id, total_questions, generated_questions)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [userId, concorsoId, mode, topic_id, total_questions || 20, questionsStr]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Errore POST drill-session:', error);
    res.status(500).json({ error: 'Errore creazione drill session' });
  }
});

/**
 * PATCH /api/fase3/:concorsoId/drill-sessions/:sessionId/complete
 * Completa sessione Drill con risultati
 */
router.patch('/:concorsoId/drill-sessions/:sessionId/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId, sessionId } = req.params;
    const userId = getUserId(req);
    const {
      correct_answers,
      wrong_answers,
      skipped_questions,
      duration_seconds,
      new_errors_found,
      questions_data
    } = req.body;

    const total_questions = correct_answers + wrong_answers + (skipped_questions || 0);
    const score_percentage = (correct_answers / total_questions) * 100;
    const avg_time_per_question = duration_seconds / total_questions;

    // LOGICA DI RISOLUZIONE ERRORI (Collegamento Drill -> Error Binning)
    if (questions_data && Array.isArray(questions_data)) {
        console.log(`[Drill Complete] Processing ${questions_data.length} questions for error resolution...`);
        let resolvedCount = 0;

        for (const q of questions_data) {
            // Se la domanda è corretta, rimuoviamo l'errore corrispondente dal DB
            if (q.isCorrect && q.questionText) {
                console.log(`[Drill Complete] Attempting to resolve error: "${q.questionText.substring(0, 30)}..."`);
                const deleteResult = await db.query(`
                    DELETE FROM fase3_errors
                    WHERE user_id = $1 AND concorso_id = $2 
                    AND (
                        TRIM(UPPER(question_text)) = TRIM(UPPER($3))
                        OR
                        TRIM(UPPER(question_text)) LIKE TRIM(UPPER($3)) || '%'
                    )
                `, [userId, concorsoId, q.questionText]);
                
                if (deleteResult.rowCount > 0) {
                    console.log(`[Drill Complete] Deleted ${deleteResult.rowCount} errors.`);
                    resolvedCount += deleteResult.rowCount;
                } else {
                    console.log(`[Drill Complete] No matching error found to delete.`);
                }
            }
        }
        console.log(`[Drill Complete] Total resolved errors: ${resolvedCount}`);

        if (resolvedCount > 0) {
            // Se abbiamo risolto errori, aggiorniamo i conteggi dei bin
            await db.query(`
                UPDATE fase3_error_bins b
                SET error_count = (
                    SELECT COUNT(*) FROM fase3_errors e 
                    WHERE e.error_bin_id = b.id
                ),
                updated_at = CURRENT_TIMESTAMP
                WHERE user_id = $1 AND concorso_id = $2
            `, [userId, concorsoId]);

            // Rimuoviamo bin svuotati
            await db.query(`
                DELETE FROM fase3_error_bins 
                WHERE user_id = $1 AND concorso_id = $2 AND error_count = 0
            `, [userId, concorsoId]);
            
            // Aggiorna contatori globali progress
            await db.query(`
                UPDATE fase3_progress
                SET 
                    total_errors = (SELECT COUNT(*) FROM fase3_errors WHERE user_id = $1 AND concorso_id = $2),
                    weak_areas_count = (SELECT COUNT(*) FROM fase3_error_bins WHERE user_id = $1 AND concorso_id = $2 AND is_resolved = false)
                WHERE user_id = $1 AND concorso_id = $2
            `, [userId, concorsoId]);
        }
    }

    // Calcola improvement_rate (confronto con sessione precedente stesso topic)
    const prevSessionResult = await db.query(`
      SELECT score_percentage FROM fase3_drill_sessions
      WHERE user_id = $1 AND id < $2 AND is_completed = true
      ORDER BY completed_at DESC
      LIMIT 1
    `, [userId, sessionId]);

    let improvement_rate = 0;
    if (prevSessionResult.rows.length > 0) {
      const prevScore = parseFloat(prevSessionResult.rows[0].score_percentage);
      improvement_rate = ((score_percentage - prevScore) / prevScore) * 100;
    }

    // Aggiorna sessione
    await db.query(`
      UPDATE fase3_drill_sessions
      SET
        correct_answers = $1,
        wrong_answers = $2,
        skipped_questions = $3,
        duration_seconds = $4,
        avg_time_per_question = $5,
        score_percentage = $6,
        improvement_rate = $7,
        new_errors_found = $8,
        is_completed = true,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9 AND user_id = $10
    `, [
      correct_answers, wrong_answers, skipped_questions, duration_seconds,
      avg_time_per_question, score_percentage, improvement_rate, new_errors_found,
      sessionId, userId
    ]);

    // Aggiorna progresso Fase 3
    const drill_hours = duration_seconds / 3600;
    await db.query(`
      UPDATE fase3_progress
      SET
        total_drill_sessions = total_drill_sessions + 1,
        total_drill_hours = total_drill_hours + $1,
        last_activity_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND concorso_id = (SELECT concorso_id FROM fase3_drill_sessions WHERE id = $3)
    `, [drill_hours, userId, sessionId]);

    res.json({ success: true, score_percentage, improvement_rate });
  } catch (error) {
    console.error('Errore completamento drill:', error);
    res.status(500).json({ error: 'Errore completamento drill session' });
  }
});

/**
 * GET /api/fase3/:concorsoId/drill-sessions
 * Ottieni storico Drill Sessions
 */
router.get('/:concorsoId/drill-sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId } = req.params;
    const userId = getUserId(req);
    const { limit = 20 } = req.query;

    const result = await db.query(`
      SELECT * FROM fase3_drill_sessions
      WHERE user_id = $1 AND concorso_id = $2
      ORDER BY started_at DESC
      LIMIT $3
    `, [userId, concorsoId, limit]);

    res.json(result.rows);
  } catch (error) {
    console.error('Errore GET drill-sessions:', error);
    res.status(500).json({ error: 'Errore recupero drill sessions' });
  }
});

/**
 * GET /api/fase3/:concorsoId/drill-sessions/:sessionId/questions
 * Ottieni domande per la sessione (basate su mode e topic)
 */
router.get('/:concorsoId/drill-sessions/:sessionId/questions', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId, sessionId } = req.params;
    const userId = getUserId(req);

    // Recupera info sessione
    const sessionResult = await db.query(`
      SELECT mode, topic_id, total_questions, generated_questions
      FROM fase3_drill_sessions
      WHERE id = $1 AND user_id = $2
    `, [sessionId, userId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    const session = sessionResult.rows[0];
    let questions: any[] = [];

    // Priorità: Domande generate (se presenti)
    if (session.generated_questions) {
        try {
            console.log(`[DEBUG] generated_questions type: ${typeof session.generated_questions}`);
            console.log(`[DEBUG] generated_questions length: ${session.generated_questions.length}`);
            console.log(`[DEBUG] generated_questions preview: ${session.generated_questions.substring(0, 100)}`);

            questions = typeof session.generated_questions === 'string' 
                ? JSON.parse(session.generated_questions) 
                : session.generated_questions;
            
            // Double parse check (if double stringified)
            if (typeof questions === 'string') {
                console.log(`[DEBUG] Double stringified JSON detected. Parsing again.`);
                try {
                    questions = JSON.parse(questions);
                } catch (e2) {
                    console.error("[DEBUG] Second parse failed", e2);
                }
            }

            console.log(`[DEBUG] Parsed questions length: ${Array.isArray(questions) ? questions.length : 'Not Array'}`);
            
            if (Array.isArray(questions)) {
                // Normalizza formato se necessario
                questions = questions.map((q: any) => ({
                    text: q.text || q.question,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    explanation: q.explanation || "",
                    topic: q.topic || "Generale"
                }));
            } else {
                questions = [];
            }
        } catch (e) {
            console.error("Errore parsing generated_questions", e);
        }
    } 
    
    if (questions.length === 0 && session.mode === 'topic') {
      const nomeMateria = session.topic_id;
      console.log(`🔍 [Drill] Cercando domande per Topic: "${nomeMateria}" (Concorso: ${concorsoId})`);

      if (nomeMateria) {
        // Debug: Vediamo cosa c'è nel DB per questo concorso
        const debugCheck = await db.query(`
            SELECT DISTINCT materia FROM flashcards WHERE user_id = $1 AND concorso_id = $2
        `, [userId, concorsoId]);
        console.log(`📊 [Drill] Materie disponibili in flashcards:`, debugCheck.rows.map(r => r.materia));

        // 2. Recupera flashcards per questa materia
        // CORREZIONE: trim() e case-insensitive per evitare mismatch
        const flashcardsResult = await db.query(`
            SELECT id, fronte, retro, materia, fonte
            FROM flashcards
            WHERE user_id = $1 AND concorso_id = $2 
            AND TRIM(UPPER(materia)) = TRIM(UPPER($3))
        `, [userId, concorsoId, nomeMateria]);
        
        let flashcards = flashcardsResult.rows;
        console.log(`   Found ${flashcards.length} exact matches`);

        // Se non troviamo flashcard con il nome esatto, proviamo una ricerca parziale sulla MATERIA
        if (flashcards.length === 0) {
             console.log(`   Attempting partial match on MATERIA...`);
             const partialMatchResult = await db.query(`
                SELECT id, fronte, retro, materia, fonte
                FROM flashcards
                WHERE user_id = $1 AND concorso_id = $2 
                AND (
                    TRIM(UPPER(materia)) LIKE '%' || TRIM(UPPER($3)) || '%' 
                    OR 
                    TRIM(UPPER($3)) LIKE '%' || TRIM(UPPER(materia)) || '%'
                )
            `, [userId, concorsoId, nomeMateria]);
            
            if (partialMatchResult.rows.length > 0) {
                console.log(`   Found ${partialMatchResult.rows.length} partial matches`);
                flashcards.push(...partialMatchResult.rows);
            }
        }

        // Se ancora 0, proviamo a cercare nella FONTE (nome del file/materiale)
        // Spesso la materia nelle flashcard è "Generale" ma la fonte è "Diritto Costituzionale.pdf"
        if (flashcards.length === 0) {
             console.log(`   Attempting match on FONTE (Source)...`);
             const sourceMatchResult = await db.query(`
                SELECT id, fronte, retro, materia, fonte
                FROM flashcards
                WHERE user_id = $1 AND concorso_id = $2 
                AND TRIM(UPPER(fonte)) LIKE '%' || TRIM(UPPER($3)) || '%'
            `, [userId, concorsoId, nomeMateria]);

            if (sourceMatchResult.rows.length > 0) {
                console.log(`   Found ${sourceMatchResult.rows.length} matches by source`);
                flashcards.push(...sourceMatchResult.rows);
            }
        }

        // 3. Trasforma flashcards in domande quiz (con distrattori)
        // Se abbiamo abbastanza flashcards (>4), usiamo le altre come distrattori.
        // Altrimenti usiamo placeholder.
        
        for (const fc of flashcards) {
             let distractors: string[] = [];
             let usedCache = false;

             // 1. Check Cache
             try {
                 // A. Cerca nella cache personale (per ID flashcard)
                 let cachedResult = await db.query(`
                    SELECT distractors FROM fase3_generated_questions 
                    WHERE user_id = $1 AND flashcard_id = $2
                 `, [userId, fc.id]);
                 
                 // B. Se non trova, cerca nella cache GLOBALE (per contenuto uguale)
                 // Questo permette di riutilizzare i distrattori generati da ALTRI utenti per la stessa domanda
                 if (cachedResult.rows.length === 0) {
                     cachedResult = await db.query(`
                        SELECT distractors FROM fase3_generated_questions 
                        WHERE TRIM(question_text) = TRIM($1) 
                          AND TRIM(correct_answer) = TRIM($2)
                        LIMIT 1
                     `, [fc.fronte, fc.retro]);
                     
                     if (cachedResult.rows.length > 0) {
                         console.log(`🌍 Global Cache HIT for question: "${fc.fronte.substring(0, 30)}..."`);
                     }
                 } else {
                     console.log(`✅ Personal Cache HIT for flashcard ${fc.id}`);
                 }
                 
                 if (cachedResult.rows.length > 0) {
                     // Check if distractors is a string (JSON stringified) and parse it
                     const rawDistractors = cachedResult.rows[0].distractors;
                     if (typeof rawDistractors === 'string') {
                         try {
                             distractors = JSON.parse(rawDistractors);
                         } catch (e) {
                             console.error("Error parsing distractors from cache:", e);
                             // Fallback to empty array or raw string if parsing fails (though likely string is the issue)
                             distractors = []; 
                         }
                     } else {
                         distractors = rawDistractors;
                     }
                     usedCache = true;
                 }
             } catch (e) {
                 console.error("Error checking cache:", e);
             }

             if (!usedCache) {
                 // Trova distrattori (altre flashcards della stessa materia o concorso)
                 const otherFlashcards = flashcards.filter(f => f.id !== fc.id);
                 
                 if (otherFlashcards.length >= 3) {
                     distractors = otherFlashcards
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 3)
                        .map(f => f.retro);
                 } else {
                     const correctAnswer = fc.retro;
                     const isNumber = !isNaN(Number(correctAnswer));
                     const candidateDistractors: string[] = otherFlashcards.map(f => f.retro);
                     
                     if (isNumber) {
                        const num = Number(correctAnswer);
                        candidateDistractors.push(
                            (num + Math.floor(Math.random() * 20) + 1).toString(),
                            (Math.max(0, num - Math.floor(Math.random() * 20) - 1)).toString(),
                            (num + Math.floor(Math.random() * 50) + 20).toString()
                        );
                     } else if (correctAnswer.length < 15) {
                         candidateDistractors.push(
                             "Nessuna delle precedenti",
                             "Tutte le precedenti",
                             "Non definito dalla norma"
                         );
                     } else {
                         candidateDistractors.push(
                             "Una descrizione alternativa che sembra riferirsi allo stesso istituto ma ne altera in modo improprio presupposti e effetti giuridici previsti.",
                             "Una formulazione che combina elementi di discipline diverse generando una definizione apparentemente corretta ma priva di fondamento normativo.",
                             "Una sintesi semplificata che omette condizioni essenziali e porta a un'interpretazione imprecisa dell'istituto richiamato nella domanda."
                         );
                     }

                     distractors = candidateDistractors
                        .filter((d) => d && d.trim().length > 0 && d !== correctAnswer)
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 3);
                 }

                 // --- INTEGRAZIONE AI PER DISTRATTORI ---
                 // Se abbiamo configurato l'AI, usiamola per generare distrattori coerenti
                 // Se non è configurata, usiamo la logica locale migliorata
                 const shouldUseAI = !!(
                     process.env.OPENROUTER_API_KEY ||
                     process.env.OPEN_ROUTER_API_KEY ||
                     process.env.OPEN_ROUTER
                 );
                 
                 if (shouldUseAI) { 
                     try {
                         const prompt = `Sei un esperto creatore di quiz per concorsi pubblici.
    Genera 3 risposte ERRATE (distrattori) plausibili e coerenti per questa domanda.
    DOMANDA: "${fc.fronte}"
    RISPOSTA CORRETTA: "${fc.retro}"
    MATERIA: "${fc.materia}"

    REGOLE TASSATIVE:
    1. I distrattori devono essere ASSOLUTAMENTE coerenti con la domanda. Se la domanda chiede "principi", i distrattori devono essere "principi" (anche se sbagliati). Se chiede "anni", devono essere "anni".
    2. NON restituire numeri a caso se la risposta non è un numero.
    3. NON restituire frasi a caso se la risposta è un numero.
    4. La lunghezza di ciascun distrattore deve essere SIMILE (circa ±30%) a quella della risposta corretta; evita risposte molto più brevi o molto più lunghe.
    5. Restituisci SOLO un array JSON di stringhe: ["Distrattore 1", "Distrattore 2", "Distrattore 3"]`;
                         const aiResponse = await generateWithFallback({
                           task: "distractors_generate",
                           userPrompt: prompt,
                           temperature: 0.5,
                           maxOutputTokens: 250,
                           responseMode: "json",
                           jsonRoot: "array",
                         });

                         const generatedDistractors = JSON.parse(cleanJson(aiResponse));
                         if (Array.isArray(generatedDistractors) && generatedDistractors.length === 3) {
                             distractors = generatedDistractors;
                             console.log("✅ AI Distractors generated:", distractors);
                             
                             // SAVE TO CACHE
                             try {
                                 await db.query(`
                                    INSERT INTO fase3_generated_questions (user_id, concorso_id, flashcard_id, question_text, correct_answer, distractors, topic)
                                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                                    ON CONFLICT (user_id, flashcard_id) DO UPDATE 
                                    SET distractors = $6, updated_at = CURRENT_TIMESTAMP
                                 `, [userId, concorsoId, fc.id, fc.fronte, fc.retro, JSON.stringify(distractors), fc.materia]);
                                 // console.log("💾 Saved to cache");
                             } catch (saveErr) {
                                 console.error("Error saving to cache:", saveErr);
                             }

                         } else {
                             console.log("⚠️ AI returned invalid distractors format:", aiResponse);
                         }
                     } catch (e) {
                         console.error("Errore generazione AI distrattori, fallback locale", e);
                         // Fallback alla logica locale già implementata sopra
                     }
                 } else {
                     console.log("⚠️ AI not configured, skipping smart generation");
                 }
             }

             // Mischia opzioni
             const options = [fc.retro, ...distractors].sort(() => 0.5 - Math.random());
             
             questions.push({
                 text: fc.fronte,
                 options: options,
                 correctAnswer: fc.retro,
                 explanation: `Fonte: ${fc.fonte || 'Materiale di studio'}`,
                 topic: fc.materia
             });
        }
      }
    } else if (session.mode === 'weak') {
      // Recupera errori attivi (non risolti) per questo utente
      // Cerchiamo di dare priorità agli Error Bins con più errori
      const errorsResult = await db.query(`
        SELECT e.question_text, e.correct_answer, e.wrong_answer, e.explanation, eb.topic_name
        FROM fase3_errors e
        JOIN fase3_error_bins eb ON e.error_bin_id = eb.id
        WHERE e.user_id = $1 AND e.concorso_id = $2 AND eb.is_resolved = false
        ORDER BY eb.error_count DESC, e.occurred_at DESC
        LIMIT $3
      `, [userId, concorsoId, session.total_questions * 2]); // Prendiamo più candidati per shuffle

      // Se non ci sono errori registrati, non possiamo generare domande "weak"
      if (errorsResult.rows.length === 0) {
         // Fallback: potremmo tornare array vuoto o switchare a topic random.
         // Per ora array vuoto, il frontend gestirà "Nessuna area debole trovata"
      } else {
         const errorItems = errorsResult.rows;
         
         // Per generare i distrattori (opzioni errate), prendiamo tutte le risposte corrette/errate disponibili nel set
         // o usiamo fallback.
         const allAnswers = [
            ...new Set([
                ...errorItems.map((e: any) => e.correct_answer),
                ...errorItems.map((e: any) => e.wrong_answer)
            ])
         ];

         for (const err of errorItems) {
             // Genera distrattori
             let distractors = allAnswers
                .filter(a => a !== err.correct_answer)
                .sort(() => 0.5 - Math.random())
                .slice(0, 3);
             
             // Se non abbiamo abbastanza distrattori dal pool degli errori, aggiungiamo filler
             while (distractors.length < 3) {
                 distractors.push(`Altra opzione ${distractors.length + 1}`);
             }

             const options = [err.correct_answer, ...distractors].sort(() => 0.5 - Math.random());

             questions.push({
                 text: err.question_text,
                 options: options,
                 correctAnswer: err.correct_answer,
                 explanation: err.explanation || "Revisione errore precedente",
                 topic: err.topic_name
             });
         }
      }
    }

    // Se non ci sono domande (es. nessun capitolo studiato/recensito), aggiungi warning o gestisci lato frontend
    if (questions.length === 0 && session.mode === 'topic' && session.topic_id) {
        console.log(`⚠️ [Drill] No flashcards found for topic "${session.topic_id}". Attempting to generate from SQ3R content...`);
        
        // 1. Trova ID materia
        const materiaResult = await db.query(`
            SELECT id FROM materie_sq3r 
            WHERE user_id = $1 AND concorso_id = $2 
            AND (TRIM(UPPER(nome_materia)) = TRIM(UPPER($3)) OR TRIM(UPPER(nome_materia)) LIKE '%' || TRIM(UPPER($3)) || '%')
            LIMIT 1
        `, [userId, concorsoId, session.topic_id]);

        if (materiaResult.rows.length > 0) {
            const materiaId = materiaResult.rows[0].id;
            
            // 2. Recupera testo dai capitoli (PDF URL)
            const chaptersResult = await db.query(`
                SELECT titolo, pdf_url FROM capitoli_sq3r 
                WHERE materia_id = $1 AND user_id = $2 AND pdf_url IS NOT NULL
            `, [materiaId, userId]);

            if (chaptersResult.rows.length > 0) {
                console.log(`🔍 Found ${chaptersResult.rows.length} chapters with PDF. Extracting text...`);
                let fullText = "";
                
                // Extract text from PDFs (limit to first 3 chapters to avoid timeouts)
                for (const cap of chaptersResult.rows.slice(0, 3)) {
                    if (cap.pdf_url && cap.pdf_url.includes('base64,')) {
                        try {
                            const base64Data = cap.pdf_url.split('base64,')[1];
                            const buffer = Buffer.from(base64Data, 'base64');
                            const text = await extractTextFromPDF(buffer);
                            fullText += `CAPITOLO: ${cap.titolo}\n${text}\n\n`;
                        } catch (e) {
                            console.error(`Error extracting PDF for chapter ${cap.titolo}:`, e);
                        }
                    }
                }

                if (fullText.length > 500) {
                    console.log(`🤖 [Drill] Generating questions from ${fullText.length} chars of SQ3R content...`);
                    
                    const systemPrompt = `Sei un esperto creatore di quiz per concorsi pubblici. 
                    Analizza il testo fornito e genera ${session.total_questions} domande a risposta multipla.
                    
                    Restituisci un ARRAY JSON puro:
                    [
                      {
                        "text": "Domanda...",
                        "options": ["A", "B", "C", "D"],
                        "correctAnswer": "A", 
                        "explanation": "Spiegazione...",
                        "topic": "${session.topic_id}"
                      }
                    ]`;

                    const userPrompt = `Testo da analizzare:\n${fullText.substring(0, 30000)}`;
                    
                    const questionsJson = await generateWithFallback({
                      task: "fase3_drill_generate",
                      systemPrompt,
                      userPrompt,
                      temperature: 0.4,
                      maxOutputTokens: 3000,
                      responseMode: "json",
                      jsonRoot: "array",
                    });

                    try {
                        const parsed = JSON.parse(questionsJson);
                        const generatedQs = Array.isArray(parsed) ? parsed : (parsed.questions || []);
                        
                        if (generatedQs.length > 0) {
                            questions = generatedQs.map((q: any) => ({
                                text: q.text || q.question,
                                options: q.options,
                                correctAnswer: q.correctAnswer,
                                explanation: q.explanation || "Generata da AI",
                                topic: q.topic || session.topic_id
                            }));
                            
                            // Save to session so we don't regenerate on refresh
                            await db.query(`
                                UPDATE fase3_drill_sessions 
                                SET generated_questions = $1
                                WHERE id = $2
                            `, [JSON.stringify(questions), sessionId]);
                        }
                    } catch (e) {
                        console.error("Error parsing generated questions:", e);
                    }
                }
            }
        }
    }

    // Shuffle e limit
    const shuffled = questions.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, session.total_questions);

    // Aggiungi ID progressivi per la sessione
    const finalQuestions = selected.map((q, i) => ({
        id: i + 1,
        ...q
    }));

    res.json(finalQuestions);

  } catch (error) {
    console.error('Errore GET drill questions:', error);
    res.status(500).json({ error: 'Errore recupero domande sessione' });
  }
});

/**
 * GET /api/fase3/:concorsoId/drill-sessions/:sessionId
 * Ottieni dettaglio singola sessione drill
 */
router.get('/:concorsoId/drill-sessions/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = getUserId(req);

    const result = await db.query(`
      SELECT * FROM fase3_drill_sessions
      WHERE id = $1 AND user_id = $2
    `, [sessionId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sessione non trovata' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore GET drill session:', error);
    res.status(500).json({ error: 'Errore recupero dettaglio sessione' });
  }
});

/**
 * DELETE /api/fase3/:concorsoId/drill-sessions/:sessionId
 * Elimina una singola sessione drill
 */
router.delete('/:concorsoId/drill-sessions/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = getUserId(req);

    // Verifica proprietà e elimina
    const result = await db.query(`
      DELETE FROM fase3_drill_sessions
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [sessionId, userId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Sessione non trovata o non autorizzato' });
    }

    // Nota: Potremmo voler ricalcolare il progresso totale, ma fase3_progress ha trigger/logica cumulativa
    // Se fase3_progress.total_drill_sessions è un contatore incrementale, cancellare una sessione
    // potrebbe richiedere un decremento.
    // Tuttavia, per semplicità e coerenza storica, spesso si preferisce non toccare le statistiche aggregate
    // o ricalcolarle completamente.
    // Implementiamo un decremento semplice per mantenere i contatori allineati.
    
    // Recuperiamo durata della sessione eliminata (se completata) per aggiornare le ore totali
    // Ma l'abbiamo già cancellata... oops. Facciamolo in una transazione o prima della delete.
    // Per ora, accettiamo che le statistiche globali possano divergere leggermente o ricalcoliamole.
    
    // MIGLIORE PRATICA: Ricalcolo totale statistiche drill
    await db.query(`
      UPDATE fase3_progress
      SET 
        total_drill_sessions = (SELECT COUNT(*) FROM fase3_drill_sessions WHERE user_id = $1 AND concorso_id = fase3_progress.concorso_id),
        total_drill_hours = (SELECT COALESCE(SUM(duration_seconds), 0) / 3600.0 FROM fase3_drill_sessions WHERE user_id = $1 AND concorso_id = fase3_progress.concorso_id AND is_completed = true)
      WHERE user_id = $1
    `, [userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Errore DELETE drill session:', error);
    res.status(500).json({ error: 'Errore eliminazione sessione' });
  }
});

// ============================================================================
// SPACED REPETITION SYSTEM (SRS)
// ============================================================================

/**
 * GET /api/fase3/:concorsoId/srs/due-today
 * Ottieni item SRS da rivedere oggi
 */
router.get('/:concorsoId/srs/due-today', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId } = req.params;
    const userId = getUserId(req);

    const result = await db.query(`
      SELECT * FROM fase3_srs_items
      WHERE user_id = $1 AND concorso_id = $2
        AND next_review_date <= CURRENT_DATE
        AND is_mastered = false
      ORDER BY next_review_date ASC, item_type ASC
    `, [userId, concorsoId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Errore GET srs due-today:', error);
    res.status(500).json({ error: 'Errore recupero review SRS' });
  }
});

/**
 * POST /api/fase3/:concorsoId/srs
 * Aggiungi item a SRS
 */
router.post('/:concorsoId/srs', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId } = req.params;
    const userId = getUserId(req);
    const { item_type, item_id, item_reference } = req.body;

    // Validazione
    if (!item_type || !item_id) {
      return res.status(400).json({ error: 'item_type e item_id obbligatori' });
    }

    const result = await db.query(`
      INSERT INTO fase3_srs_items (
        user_id, concorso_id, item_type, item_id, item_reference, next_review_date
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE + INTERVAL '1 day')
      ON CONFLICT (user_id, concorso_id, item_type, item_id) DO NOTHING
      RETURNING *
    `, [userId, concorsoId, item_type, item_id, item_reference]);

    res.status(201).json(result.rows[0] || { message: 'Item già presente in SRS' });
  } catch (error) {
    console.error('Errore POST srs item:', error);
    res.status(500).json({ error: 'Errore aggiunta item SRS' });
  }
});

/**
 * POST /api/fase3/:concorsoId/srs/:itemId/review
 * Registra review SRS con algoritmo SM-2
 */
router.post('/:concorsoId/srs/:itemId/review', requireAuth, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const userId = getUserId(req);
    const { rating } = req.body; // 1-5

    // Validazione rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating deve essere tra 1 e 5' });
    }

    // Recupera item corrente
    const itemResult = await db.query(`
      SELECT * FROM fase3_srs_items
      WHERE id = $1 AND user_id = $2
    `, [itemId, userId]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item SRS non trovato' });
    }

    const item = itemResult.rows[0];

    // Algoritmo SM-2 (SuperMemo 2)
    let { ease_factor, interval_days, repetitions } = item;

    if (rating >= 3) {
      // Risposta corretta
      if (repetitions === 0) {
        interval_days = 1;
      } else if (repetitions === 1) {
        interval_days = 6;
      } else {
        interval_days = Math.round(interval_days * ease_factor);
      }
      repetitions += 1;
    } else {
      // Risposta errata (rating 1-2)
      repetitions = 0;
      interval_days = 1;
    }

    // Aggiorna ease_factor
    ease_factor = ease_factor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
    if (ease_factor < 1.3) ease_factor = 1.3;

    const next_review_date = new Date();
    next_review_date.setDate(next_review_date.getDate() + interval_days);

    // Update item
    const current_streak = rating >= 3 ? item.current_streak + 1 : 0;
    const best_streak = Math.max(current_streak, item.best_streak);
    const times_forgotten = rating === 1 ? item.times_forgotten + 1 : item.times_forgotten;
    const is_mastered = repetitions >= 5 && ease_factor >= 2.5;

    await db.query(`
      UPDATE fase3_srs_items
      SET
        ease_factor = $1,
        interval_days = $2,
        repetitions = $3,
        next_review_date = $4,
        last_rating = $5,
        last_reviewed_at = CURRENT_TIMESTAMP,
        total_reviews = total_reviews + 1,
        times_forgotten = $6,
        current_streak = $7,
        best_streak = $8,
        is_mastered = $9,
        mastered_at = CASE WHEN $9 = true AND is_mastered = false THEN CURRENT_TIMESTAMP ELSE mastered_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
    `, [
      ease_factor, interval_days, repetitions, next_review_date, rating,
      times_forgotten, current_streak, best_streak, is_mastered, itemId
    ]);

    // Aggiorna progresso Fase 3
    await db.query(`
      UPDATE fase3_progress
      SET
        total_srs_reviews = total_srs_reviews + 1,
        last_activity_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND concorso_id = (SELECT concorso_id FROM fase3_srs_items WHERE id = $2)
    `, [userId, itemId]);

    res.json({
      next_review_date,
      interval_days,
      ease_factor,
      is_mastered
    });
  } catch (error) {
    console.error('Errore POST srs review:', error);
    res.status(500).json({ error: 'Errore registrazione review SRS' });
  }
});

/**
 * GET /api/fase3/:concorsoId/srs/calendar
 * Ottieni calendario review prossimi 30 giorni
 */
router.get('/:concorsoId/srs/calendar', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId } = req.params;
    const userId = getUserId(req);

    const result = await db.query(`
      SELECT
        next_review_date::DATE as review_date,
        COUNT(*) as items_count,
        json_agg(json_build_object(
          'item_type', item_type,
          'item_reference', item_reference,
          'ease_factor', ease_factor
        )) as items
      FROM fase3_srs_items
      WHERE user_id = $1 AND concorso_id = $2
        AND next_review_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        AND is_mastered = false
      GROUP BY next_review_date::DATE
      ORDER BY next_review_date ASC
    `, [userId, concorsoId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Errore GET srs calendar:', error);
    res.status(500).json({ error: 'Errore recupero calendario SRS' });
  }
});

// ============================================================================
// STATISTICHE
// ============================================================================

/**
 * GET /api/fase3/:concorsoId/stats
 * Statistiche generali Fase 3
 */
router.get('/:concorsoId/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId } = req.params;
    const userId = getUserId(req);

    const stats = await db.query(`
      SELECT
        fp.*,
        (SELECT COUNT(*) FROM fase3_error_bins WHERE user_id = $1 AND concorso_id = $2) as total_bins,
        (SELECT COUNT(*) FROM fase3_error_bins WHERE user_id = $1 AND concorso_id = $2 AND is_resolved = true) as resolved_bins,
        (SELECT AVG(score_percentage) FROM fase3_drill_sessions WHERE user_id = $1 AND concorso_id = $2 AND is_completed = true) as avg_drill_score,
        (SELECT COUNT(*) FROM fase3_srs_items WHERE user_id = $1 AND concorso_id = $2 AND is_mastered = true) as mastered_items
      FROM fase3_progress fp
      WHERE fp.user_id = $1 AND fp.concorso_id = $2
    `, [userId, concorsoId]);

    res.json(stats.rows[0] || {});
  } catch (error) {
    console.error('Errore GET stats:', error);
    res.status(500).json({ error: 'Errore recupero statistiche' });
  }
});

// ============================================================================
// TOPICS
// ============================================================================

/**
 * GET /api/fase3/:concorsoId/topics
 * Ottieni lista argomenti disponibili
 */
router.get('/:concorsoId/topics', requireAuth, async (req: Request, res: Response) => {
  try {
    const { concorsoId } = req.params;
    const userId = getUserId(req);

    // Recupera argomenti distinti normalizzando il testo (Title Case e Trim)
    // Questo evita duplicati come "Diritto Amministrativo" e "DIRITTO AMMINISTRATIVO"
    const result = await db.query(`
      SELECT DISTINCT INITCAP(TRIM(materia)) as materia
      FROM (
        SELECT materia FROM flashcards WHERE user_id = $1 AND concorso_id = $2
        UNION
        SELECT materia FROM materials WHERE user_id = $1 AND concorso_id = $2
        UNION
        SELECT nome_materia as materia FROM materie_sq3r WHERE user_id = $1 AND concorso_id = $2
      ) AS combined_topics
      WHERE materia IS NOT NULL AND TRIM(materia) != ''
      ORDER BY materia ASC
    `, [userId, concorsoId]);

    res.json(result.rows.map((r: any) => ({
      id: r.materia,
      nomeMateria: r.materia
    })));
  } catch (error) {
    console.error('Errore GET topics:', error);
    res.status(500).json({ error: 'Errore recupero argomenti' });
  }
});

// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;
