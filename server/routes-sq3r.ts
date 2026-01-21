import { Express, Request, Response } from 'express';
import { db } from './db';
import { capitoliSQ3R, materieSQ3R } from '../shared/schema-sq3r';
import { eq, and } from 'drizzle-orm';
import multer from 'multer';
import { cleanJson, generateWithFallback } from "./services/ai";
import { isAuthenticatedHybrid } from './services/supabase-auth';

// Multer per upload PDF
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

function getUserId(req: Request): string | undefined {
  const user = req.user as any;
  // Support both Supabase auth (user.id) and legacy auth (user.claims.sub)
  return user?.id || user?.claims?.sub;
}

export function registerSQ3RRoutes(app: Express) {
  console.log('📚 [INIT] Registrazione routes SQ3R...');

  // Apply hybrid auth middleware to all SQ3R routes
  app.use('/api/sq3r', isAuthenticatedHybrid);

  // ========== MATERIE ROUTES ==========

  // GET /api/sq3r/materie - Lista materie
  app.get('/api/sq3r/materie', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { concorsoId } = req.query;
      if (!concorsoId) {
        return res.status(400).json({ error: 'concorsoId richiesto' });
      }

      const materie = await db
        .select()
        .from(materieSQ3R)
        .where(
          and(
            eq(materieSQ3R.userId, userId),
            eq(materieSQ3R.concorsoId, concorsoId as string)
          )
        )
        .orderBy(materieSQ3R.ordine, materieSQ3R.createdAt);

      res.json(materie);
    } catch (error: any) {
      console.error('❌ Errore GET materie:', error);
      res.status(500).json({ error: 'Errore recupero materie' });
    }
  });

  // POST /api/sq3r/materie - Crea materia
  app.post('/api/sq3r/materie', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { concorsoId, nomeMateria, fonteId, colore, icona } = req.body;

      if (!concorsoId || !nomeMateria) {
        return res.status(400).json({ error: 'Dati mancanti' });
      }

      const [materia] = await db
        .insert(materieSQ3R)
        .values({
          userId: userId,
          concorsoId,
          nomeMateria,
          fonteId,
          colore: colore || '#3B82F6',
          icona: icona || '📖',
          capitoliTotali: 0,
          capitoliCompletati: 0,
          oreStudioTotali: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.json(materia);
    } catch (error: any) {
      console.error('❌ Errore POST materia:', error);
      res.status(500).json({ error: 'Errore creazione materia' });
    }
  });

  // PATCH /api/sq3r/materie/:id - Aggiorna materia
  app.patch('/api/sq3r/materie/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;
      const updates = req.body;

      const [materia] = await db
        .update(materieSQ3R)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(materieSQ3R.id, id),
            eq(materieSQ3R.userId, userId)
          )
        )
        .returning();

      if (!materia) {
        return res.status(404).json({ error: 'Materia non trovata' });
      }

      res.json(materia);
    } catch (error: any) {
      console.error('❌ Errore PATCH materia:', error);
      res.status(500).json({ error: 'Errore aggiornamento materia' });
    }
  });

  // DELETE /api/sq3r/materie/:id - Elimina materia
  app.delete('/api/sq3r/materie/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;

      const [deleted] = await db
        .delete(materieSQ3R)
        .where(
          and(
            eq(materieSQ3R.id, id),
            eq(materieSQ3R.userId, userId)
          )
        )
        .returning();

      if (!deleted) {
        return res.status(404).json({ error: 'Materia non trovata' });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Errore DELETE materia:', error);
      res.status(500).json({ error: 'Errore eliminazione materia' });
    }
  });

  // ========== GET CAPITOLI PER MATERIA ==========
  app.get('/api/sq3r/capitoli', async (req: Request, res: Response) => {
    console.log('📥 GET /api/sq3r/capitoli');
    
    try {
      // Auth check
      const userId = getUserId(req);
      if (!userId) {
        console.log('❌ Non autenticato');
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { materiaId } = req.query;
      console.log('   materiaId:', materiaId);
      console.log('   userId:', userId);

      if (!materiaId) {
        console.log('❌ materiaId mancante');
        return res.status(400).json({ error: 'materiaId richiesto' });
      }

      // Query diretta
      console.log('🔍 Query database...');
      const capitoli = await db
        .select()
        .from(capitoliSQ3R)
        .where(
          and(
            eq(capitoliSQ3R.userId, userId),
            eq(capitoliSQ3R.materiaId, materiaId as string)
          )
        )
        .orderBy(capitoliSQ3R.numeroCapitolo);

      console.log(`✅ Trovati ${capitoli.length} capitoli`);
      
      // Aggiorna conteggi materia se necessario
      try {
          const capitoliCompletati = capitoli.filter(c => c.completato).length;
          await db.update(materieSQ3R)
            .set({
                capitoliTotali: capitoli.length,
                capitoliCompletati: capitoliCompletati,
                updatedAt: new Date()
            })
            .where(eq(materieSQ3R.id, materiaId as string));
      } catch(e) {
          console.error("Errore aggiornamento conteggi materia:", e);
      }

      // Rimuovi PDF dal payload
      const capitoliSafe = capitoli.map(({ pdfUrl, ...rest }) => ({
        ...rest,
        hasPdf: !!pdfUrl,
      }));

      res.json(capitoliSafe);
    } catch (error: any) {
      console.error('❌ Errore GET capitoli:');
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      res.status(500).json({
        error: 'Errore recupero capitoli',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ========== GET CAPITOLO SINGOLO ==========
  app.get('/api/sq3r/capitoli/:id', async (req: Request, res: Response) => {
    console.log('📥 GET /api/sq3r/capitoli/:id');
    
    try {
      const userId = getUserId(req);
      if (!userId) {
        console.log('❌ Non autenticato');
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;
      console.log('   id:', id);
      console.log('   userId:', userId);

      // Ignora ID temporanei
      if (id.startsWith('temp-')) {
        console.log('⚠️ ID temporaneo, skip');
        return res.status(404).json({ error: 'Capitolo temporaneo' });
      }

      // Query diretta
      console.log('🔍 Query database...');
      const [capitolo] = await db
        .select()
        .from(capitoliSQ3R)
        .where(
          and(
            eq(capitoliSQ3R.id, id),
            eq(capitoliSQ3R.userId, userId)
          )
        );

      if (!capitolo) {
        console.log('❌ Capitolo non trovato');
        return res.status(404).json({ error: 'Capitolo non trovato' });
      }

      console.log('✅ Capitolo trovato:', capitolo.titolo);

      // Rimuovi PDF
      const { pdfUrl, ...capitoloSafe } = capitolo;

      res.json({
        ...capitoloSafe,
        hasPdf: !!pdfUrl,
      });
    } catch (error: any) {
      console.error('❌ Errore GET capitolo:');
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
      res.status(500).json({
        error: 'Errore recupero capitolo',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ========== POST CREA CAPITOLO ==========
  app.post('/api/sq3r/capitoli', async (req: Request, res: Response) => {
    console.log('📥 POST /api/sq3r/capitoli');
    
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { materiaId, numeroCapitolo, titolo, pagineInizio, pagineFine } = req.body;
      console.log('   Body:', { materiaId, numeroCapitolo, titolo });

      if (!materiaId || !numeroCapitolo || !titolo) {
        return res.status(400).json({ error: 'Dati mancanti' });
      }

      // Crea capitolo
      console.log('🔍 Creazione capitolo...');
      const [capitolo] = await db
        .insert(capitoliSQ3R)
        .values({
          userId: userId,
          materiaId,
          numeroCapitolo,
          titolo,
          pagineInizio,
          pagineFine,
          faseCorrente: 'survey',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log('✅ Capitolo creato:', capitolo.id);

      // Aggiorna contatore materia
      // Nota: db.$count non è standard in tutte le versioni di drizzle, usiamo una query count standard
      const countResult = await db
        .select({ count: capitoliSQ3R.id })
        .from(capitoliSQ3R)
        .where(eq(capitoliSQ3R.materiaId, materiaId));
        
      await db
        .update(materieSQ3R)
        .set({
          capitoliTotali: countResult.length,
          updatedAt: new Date(),
        })
        .where(eq(materieSQ3R.id, materiaId));

      console.log('✅ Contatore aggiornato');

      const { pdfUrl, ...capitoloSafe } = capitolo;
      res.json({ ...capitoloSafe, hasPdf: !!pdfUrl });
    } catch (error: any) {
      console.error('❌ Errore POST capitolo:');
      console.error('   Message:', error.message);
      res.status(500).json({
        error: 'Errore creazione capitolo',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // ========== PATCH UPDATE CAPITOLO ==========
  app.patch('/api/sq3r/capitoli/:id', async (req: Request, res: Response) => {
    console.log('📥 PATCH /api/sq3r/capitoli/:id');
    
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;
      const updates = req.body;
      console.log('   id:', id);
      console.log('   updates:', Object.keys(updates));

      // Update
      const [capitolo] = await db
        .update(capitoliSQ3R)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(capitoliSQ3R.id, id),
            eq(capitoliSQ3R.userId, userId)
          )
        )
        .returning();

      if (!capitolo) {
        return res.status(404).json({ error: 'Capitolo non trovato' });
      }

      console.log('✅ Capitolo aggiornato');

      const { pdfUrl, ...capitoloSafe } = capitolo;
      res.json({ ...capitoloSafe, hasPdf: !!pdfUrl });
    } catch (error: any) {
      console.error('❌ Errore PATCH capitolo:');
      console.error('   Message:', error.message);
      res.status(500).json({
        error: 'Errore aggiornamento capitolo',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  // DELETE /api/sq3r/capitoli/:id - Elimina capitolo
  app.delete('/api/sq3r/capitoli/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;

      // Prima ottieni il capitolo per sapere la materiaId (per aggiornare i conteggi)
      const [capitolo] = await db
        .select()
        .from(capitoliSQ3R)
        .where(
          and(
            eq(capitoliSQ3R.id, id),
            eq(capitoliSQ3R.userId, userId)
          )
        );

      if (!capitolo) {
        return res.status(404).json({ error: 'Capitolo non trovato' });
      }

      const materiaId = capitolo.materiaId;

      // Elimina
      await db
        .delete(capitoliSQ3R)
        .where(
          and(
            eq(capitoliSQ3R.id, id),
            eq(capitoliSQ3R.userId, userId)
          )
        );

      // Aggiorna conteggi materia
      if (materiaId) {
        const countResult = await db
          .select({ count: capitoliSQ3R.id })
          .from(capitoliSQ3R)
          .where(eq(capitoliSQ3R.materiaId, materiaId));
          
        await db
          .update(materieSQ3R)
          .set({
            capitoliTotali: countResult.length,
            updatedAt: new Date(),
          })
          .where(eq(materieSQ3R.id, materiaId));
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Errore DELETE capitolo:', error);
      res.status(500).json({ error: 'Errore eliminazione capitolo' });
    }
  });

  // ========== GET PDF CAPITOLO (LAZY LOAD) ==========
  app.get('/api/sq3r/capitoli/:id/pdf', async (req: Request, res: Response) => {
    console.log('📥 GET /api/sq3r/capitoli/:id/pdf');
    
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;

      const [result] = await db
        .select({
          pdfUrl: capitoliSQ3R.pdfUrl,
          pdfFileName: capitoliSQ3R.pdfFileName,
          pdfFileSize: capitoliSQ3R.pdfFileSize,
          pdfNumPages: capitoliSQ3R.pdfNumPages,
        })
        .from(capitoliSQ3R)
        .where(
          and(
            eq(capitoliSQ3R.id, id),
            eq(capitoliSQ3R.userId, userId)
          )
        );

      if (!result || !result.pdfUrl) {
        return res.status(404).json({ error: 'PDF non trovato' });
      }

      console.log('✅ PDF recuperato');
      res.json(result);
    } catch (error: any) {
      console.error('❌ Errore GET PDF:', error.message);
      res.status(500).json({ error: 'Errore caricamento PDF' });
    }
  });

  // ==========================================
  // FONTI: Upload e Gestione
  // ==========================================

  // POST - Upload nuova dispensa
  app.post('/api/sq3r/fonti/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
      console.log('📥 [START] POST /api/sq3r/fonti/upload');
      
      const userId = getUserId(req);
      if (!userId) {
        console.log('❌ Utente non autenticato');
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { concorsoId, materia } = req.body;
      const file = req.file;

      if (!file) {
        console.log('❌ File mancante');
        return res.status(400).json({ error: 'File obbligatorio' });
      }

      if (!concorsoId || !materia) {
        console.log('❌ Parametri mancanti');
        return res.status(400).json({ error: 'concorsoId e materia obbligatori' });
      }

      console.log(`📄 File ricevuto: ${file.originalname} (${file.size} bytes)`);

      // Converti in base64
      const pdfBase64 = file.buffer.toString('base64');
      const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

      // Estrai numero pagine (opzionale, per metadata)
      let numPages = 0;
      try {
        const pdfParse = await import('pdf-parse');
        const pdfData = await pdfParse.default(file.buffer);
        numPages = pdfData.numpages;
        console.log(`📊 Numero pagine: ${numPages}`);
      } catch (e) {
        console.log('⚠️ Impossibile contare pagine, continuo comunque');
      }

      // Crea fonte
      // Import storageSQ3R directly (it is exported at the end of storage-sq3r.ts)
      const { storageSQ3R } = await import('./storage-sq3r');
      
      const fonte = await storageSQ3R.createFonteUpload({
        userId,
        concorsoId,
        titolo: file.originalname.replace(/\.[^/.]+$/, ''), // Rimuovi estensione
        materia,
        pdfBase64: pdfDataUrl, // Store full data URL for easy consumption
        fileName: file.originalname,
        fileSize: file.size,
        numPages,
      });

      console.log('✅ [END] Fonte creata:', fonte.id);
      res.json(fonte);
    } catch (error: any) {
      console.error('❌ Errore upload dispensa:', error);
      res.status(500).json({ error: 'Errore durante l\'upload' });
    }
  });

  // GET - Lista fonti per concorso
  app.get('/api/sq3r/fonti', async (req: Request, res: Response) => {
    try {
      console.log('📥 [START] GET /api/sq3r/fonti');
      
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { concorsoId } = req.query;
      if (!concorsoId) {
        return res.status(400).json({ error: 'concorsoId obbligatorio' });
      }

      const { storageSQ3R } = await import('./storage-sq3r');
      const fonti = await storageSQ3R.getFonti(userId, concorsoId as string);
      
      console.log(`✅ [END] Trovate ${fonti.length} fonti`);
      res.json(fonti);
    } catch (error: any) {
      console.error('❌ Errore recupero fonti:', error);
      res.status(500).json({ error: 'Errore recupero fonti' });
    }
  });

  // GET - Dettaglio fonte (con PDF)
  app.get('/api/sq3r/fonti/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { storageSQ3R } = await import('./storage-sq3r');
      const fonte = await storageSQ3R.getFonte(req.params.id, userId);
      
      if (!fonte) return res.status(404).json({ error: 'Fonte non trovata' });
      res.json(fonte);
    } catch (error: any) {
      console.error('❌ Errore recupero fonte:', error);
      res.status(404).json({ error: 'Fonte non trovata' });
    }
  });

  // DELETE - Elimina fonte
  app.delete('/api/sq3r/fonti/:id', async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { storageSQ3R } = await import('./storage-sq3r');
      await storageSQ3R.deleteFonte(req.params.id, userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error('❌ Errore eliminazione fonte:', error);
      res.status(500).json({ error: 'Errore eliminazione' });
    }
  });

  // POST - Estrai capitoli da fonte con AI
  app.post('/api/sq3r/fonti/:id/estrai-capitoli', async (req: Request, res: Response) => {
    try {
      console.log('📥 [START] POST /api/sq3r/fonti/:id/estrai-capitoli');
      
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { storageSQ3R } = await import('./storage-sq3r');
      const result = await storageSQ3R.estraiCapitoliDaFonte(req.params.id, userId);
      
      console.log('✅ [END] Capitoli estratti:', result);
      res.json(result);
    } catch (error: any) {
      console.error('❌ Errore estrazione capitoli:', error);
      res.status(500).json({ error: 'Errore estrazione capitoli: ' + error.message });
    }
  });

  // ========== POST GENERA REVIEW (AI) - VERSIONE COMPLETA ==========
  app.post('/api/sq3r/capitoli/:id/genera-review', async (req: Request, res: Response) => {
    console.log('📥 POST /api/sq3r/capitoli/:id/genera-review');
    console.log('='.repeat(60));
    
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;

      // Recupera TUTTO il capitolo
      const [capitolo] = await db
        .select()
        .from(capitoliSQ3R)
        .where(
          and(
            eq(capitoliSQ3R.id, id),
            eq(capitoliSQ3R.userId, userId)
          )
        );

      if (!capitolo) {
        return res.status(404).json({ error: 'Capitolo non trovato' });
      }

      console.log(`🎯 Capitolo: "${capitolo.titolo}"`);
      console.log('─'.repeat(60));

      // ============================================
      // RACCOLTA CONTENUTI DA TUTTE LE FASI
      // ============================================
      
      let contentToAnalyze = `📚 CAPITOLO: ${capitolo.titolo}\n`;
      contentToAnalyze += '═'.repeat(50) + '\n\n';
      
      let totalContentItems = 0;

      // 1️⃣ TESTO EVIDENZIATO (Read Phase) - PRIORITÀ ALTA
      const highlights = capitolo.readHighlights as any[];
      if (highlights && Array.isArray(highlights) && highlights.length > 0) {
        contentToAnalyze += "📌 TESTO EVIDENZIATO DALL'UTENTE:\n";
        contentToAnalyze += "─".repeat(50) + "\n";
        highlights.forEach((h, idx) => {
          if (h.testo) {
            contentToAnalyze += `\n${idx + 1}. "${h.testo}"\n`;
            if (h.nota) {
              contentToAnalyze += `   💭 Nota: ${h.nota}\n`;
            }
            totalContentItems++;
          }
        });
        contentToAnalyze += "\n";
        console.log(`✅ ${highlights.length} evidenziazioni trovate`);
      } else {
        console.log('⚠️  Nessuna evidenziazione trovata');
      }

      // 2️⃣ NOTE PERSONALI (Read Phase) - PRIORITÀ ALTA
      const notes = capitolo.readNote as any[];
      if (notes && Array.isArray(notes) && notes.length > 0) {
        contentToAnalyze += "📝 NOTE PERSONALI:\n";
        contentToAnalyze += "─".repeat(50) + "\n";
        notes.forEach((n, idx) => {
          if (n.contenuto) {
            contentToAnalyze += `\n${idx + 1}. ${n.contenuto}\n`;
            if (n.pagina) {
              contentToAnalyze += `   📄 Pagina: ${n.pagina}\n`;
            }
            totalContentItems++;
          }
        });
        contentToAnalyze += "\n";
        console.log(`✅ ${notes.length} note personali trovate`);
      } else {
        console.log('⚠️  Nessuna nota personale trovata');
      }

      // 3️⃣ CONCETTI CHIAVE (Survey Phase)
      const surveyConcetti = capitolo.surveyConcettiChiave as string[];
      if (surveyConcetti && Array.isArray(surveyConcetti) && surveyConcetti.length > 0) {
        contentToAnalyze += "🔑 CONCETTI CHIAVE (Survey):\n";
        contentToAnalyze += "─".repeat(50) + "\n";
        surveyConcetti.forEach((c: string, idx: number) => {
          if (c) {
            contentToAnalyze += `${idx + 1}. ${c}\n`;
            totalContentItems++;
          }
        });
        contentToAnalyze += "\n";
        console.log(`✅ ${surveyConcetti.length} concetti survey trovati`);
      } else {
        console.log('⚠️  Nessun concetto survey trovato');
      }

      // 4️⃣ DOMANDE PROFONDE (Question Phase) - PRIORITÀ ALTA
      const domande = capitolo.domande as any[];
      if (domande && Array.isArray(domande) && domande.length > 0) {
        contentToAnalyze += "🎯 DOMANDE PROFONDE (Question):\n";
        contentToAnalyze += "─".repeat(50) + "\n";
        domande.forEach((d: any, idx: number) => {
          // Adattamento: d può essere stringa o oggetto { domanda: string }
          const testoDomanda = typeof d === 'string' ? d : d.domanda;
          if (testoDomanda) {
            contentToAnalyze += `${idx + 1}. ${testoDomanda}\n`;
            if (d.risposta) contentToAnalyze += `   Risposta: ${d.risposta}\n`;
            totalContentItems++;
          }
        });
        contentToAnalyze += "\n";
        console.log(`✅ ${domande.length} domande question trovate`);
      } else {
        console.log('⚠️  Nessuna domanda question trovata');
      }

      // 5️⃣ RIFLESSIONI (Recite Phase)
      let reciteData: any = capitolo.reciteData;
      if (typeof reciteData === 'string') {
        try { reciteData = JSON.parse(reciteData); } catch (e) { console.error('Error parsing reciteData', e); }
      }

      if (reciteData?.noteRiflessione && reciteData.noteRiflessione.trim()) {
        contentToAnalyze += "💭 RIFLESSIONI PERSONALI (Recite):\n";
        contentToAnalyze += "─".repeat(50) + "\n";
        contentToAnalyze += reciteData.noteRiflessione.trim() + "\n\n";
        totalContentItems++;
        console.log(`✅ Riflessioni personali trovate`);
      } else {
        console.log('⚠️  Nessuna riflessione trovata');
      }

      // 6️⃣ CONCETTI DA RIVEDERE (Recite Phase) - PRIORITÀ ALTA
      if (reciteData?.concettiDaRivedere && Array.isArray(reciteData.concettiDaRivedere) && reciteData.concettiDaRivedere.length > 0) {
        contentToAnalyze += "🔄 CONCETTI DA RIVEDERE:\n";
        contentToAnalyze += "─".repeat(50) + "\n";
        reciteData.concettiDaRivedere.forEach((c: string, idx: number) => {
          if (c) {
            contentToAnalyze += `${idx + 1}. ${c}\n`;
            totalContentItems++;
          }
        });
        contentToAnalyze += "\n";
        console.log(`✅ ${reciteData.concettiDaRivedere.length} concetti da rivedere trovati`);
      } else {
        console.log('⚠️  Nessun concetto da rivedere trovato');
      }

      // Riepilogo contenuto
      console.log('─'.repeat(60));
      console.log(`📊 TOTALE ELEMENTI RACCOLTI: ${totalContentItems}`);
      console.log(`📏 LUNGHEZZA CONTENUTO: ${contentToAnalyze.length} caratteri`);
      console.log('─'.repeat(60));

      // Messaggio se non c'è contenuto
      if (totalContentItems === 0) {
        contentToAnalyze += "\n⚠️ ATTENZIONE: L'utente non ha ancora studiato questo capitolo in dettaglio.\n";
        contentToAnalyze += "Non ci sono evidenziazioni, note o domande disponibili.\n\n";
        contentToAnalyze += "ISTRUZIONE: Genera 5 domande GENERALI e INTRODUTTIVE basate sull'argomento del titolo.\n";
        contentToAnalyze += "Le domande devono testare la conoscenza di base e i concetti fondamentali dell'argomento.\n";
        console.log('⚠️  MODALITÀ FALLBACK: generazione domande generali dal titolo');
      }

      // ============================================
      // PROMPT AI OTTIMIZZATO
      // ============================================

      const systemPrompt = `Sei un esperto professore universitario specializzato nella preparazione ai concorsi pubblici italiani.

IL TUO COMPITO:
Creare un quiz di verifica personalizzato di 5 domande a risposta multipla basato SUL MATERIALE DI STUDIO FORNITO.

ANALISI RICHIESTA:
Il materiale include:
- Testo evidenziato dall'utente durante la lettura
- Note personali aggiunte dall'utente
- Concetti chiave e domande profonde
- Riflessioni post-studio
- Concetti che l'utente ha trovato difficili

REGOLE FONDAMENTALI:
1. **PRIORITÀ MASSIMA**: Se l'utente ha evidenziato un concetto, crea una domanda SU QUEL CONCETTO SPECIFICO.
2. **PRIORITÀ ALTA**: Se l'utente ha elencato "concetti da rivedere", includili PRIORITARIAMENTE nelle domande.
3. **PRIORITÀ ALTA**: Se l'utente ha fatto domande profonde, verifica la comprensione di QUEI temi.
4. Le domande devono testare la COMPRENSIONE REALE del contenuto studiato, non la memoria generica.
5. Usa il linguaggio e i termini utilizzati dall'utente nelle sue note ed evidenziazioni.

STRUTTURA QUIZ:
- 2 domande FACILI: ricordo diretto dei concetti evidenziati
- 2 domande MEDIE: applicazione e comprensione dei concetti
- 1 domanda DIFFICILE: analisi critica o collegamento tra concetti

STRUTTURA DOMANDA:
- Ogni domanda deve avere 4 opzioni plausibili
- Risposte sbagliate devono essere credibili ma distinguibili
- La risposta corretta deve essere chiaramente identificabile per chi ha studiato
- Indica l'indice della risposta corretta (0-3)
- Fornisci una spiegazione chiara e formativa

TONO:
Professionale, adatto a un concorso pubblico italiano, ma incoraggiante.

FORMATO OUTPUT:
Rispondi SOLO con un array JSON valido, senza testo aggiuntivo prima o dopo.

[
  {
    "domanda": "Domanda basata sul contenuto studiato...",
    "opzioni": ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
    "rispostaCorretta": 0,
    "spiegazione": "Spiegazione dettagliata..."
  }
]`;

      // ============================================
      // GENERAZIONE CON AI
      // ============================================

      const aiProvider = "OpenRouter";
      const generatedJson = await generateWithFallback({
        task: "sq3r_generate",
        systemPrompt,
        userPrompt: contentToAnalyze,
        temperature: 0.7,
        maxOutputTokens: 3000,
        responseMode: "json",
        jsonRoot: "array",
      });

      // ============================================
      // PARSING E VALIDAZIONE
      // ============================================

      console.log("🔍 Parsing risposta AI...");
      const cleanJsonString = cleanJson(generatedJson);
      let domandeGenerate = [];
      
      try {
        domandeGenerate = JSON.parse(cleanJsonString);
      } catch (e) {
        console.error("❌ Errore parsing JSON:");
        console.error("   Raw output (primi 500 char):", generatedJson.substring(0, 500));
        throw new Error("Formato risposta AI non valido");
      }

      // Validazione struttura
      if (!Array.isArray(domandeGenerate)) {
        throw new Error("La risposta non è un array");
      }

      if (domandeGenerate.length === 0) {
        throw new Error("Nessuna domanda generata");
      }

      // Validazione campi
      domandeGenerate.forEach((d, idx) => {
        if (!d.domanda || !Array.isArray(d.opzioni) || d.opzioni.length !== 4 || typeof d.rispostaCorretta !== 'number') {
          console.error(`❌ Domanda ${idx + 1} non valida:`, JSON.stringify(d, null, 2));
          throw new Error(`Domanda ${idx + 1}: formato non valido`);
        }
      });

      console.log(`✅ ${domandeGenerate.length} domande validate`);

      // ============================================
      // SALVATAGGIO
      // ============================================

      await db
        .update(capitoliSQ3R)
        .set({
          reviewData: JSON.stringify({ domande: domandeGenerate }) as any,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(capitoliSQ3R.id, id),
            eq(capitoliSQ3R.userId, userId)
          )
        );

      console.log('✅ Quiz salvato nel database');
      console.log('='.repeat(60));
      
      res.json({
        domande: domandeGenerate,
        metadati: {
          aiProvider,
          highlights: highlights?.length || 0,
          note: notes?.length || 0,
          surveyQuestions: surveyConcetti?.length || 0,
          questionQuestions: domande?.length || 0,
          hasReflections: !!reciteData?.noteRiflessione,
          conceptsToReview: reciteData?.concettiDaRivedere?.length || 0,
          totalContentItems,
          contentLength: contentToAnalyze.length,
        }
      });
    } catch (error: any) {
      console.error('❌ ERRORE GENERAZIONE REVIEW:');
      console.error('   Tipo:', error.name);
      console.error('   Messaggio:', error.message);
      console.error('   Stack:', error.stack);
      res.status(500).json({
        error: error.message || 'Errore generazione quiz',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // ========== GET QUIZ (REVIEW) ==========
  app.get('/api/sq3r/capitoli/:id/quiz', async (req: Request, res: Response) => {
    console.log('📥 GET /api/sq3r/capitoli/:id/quiz');
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;

      const [capitolo] = await db
        .select({
          reviewData: capitoliSQ3R.reviewData
        })
        .from(capitoliSQ3R)
        .where(
          and(
            eq(capitoliSQ3R.id, id),
            eq(capitoliSQ3R.userId, userId)
          )
        );

      if (!capitolo) {
        return res.status(404).json({ error: 'Capitolo non trovato' });
      }

      // Parse se necessario
      let quizData = capitolo.reviewData;
      if (typeof quizData === 'string') {
        try {
          quizData = JSON.parse(quizData);
        } catch (e) {
          console.error('Errore parsing reviewData', e);
          quizData = null;
        }
      }

      if (!quizData) {
        return res.status(404).json({ error: 'Nessun quiz trovato' });
      }

      res.json(quizData);
    } catch (error: any) {
      console.error('❌ Errore GET quiz:', error);
      res.status(500).json({ error: 'Errore recupero quiz' });
    }
  });

  // ========== POST UPLOAD PDF ==========
  app.post(
    '/api/sq3r/capitoli/:id/upload-pdf',
    upload.single('pdf'),
    async (req: Request, res: Response) => {
      console.log('📥 POST /api/sq3r/capitoli/:id/upload-pdf');
      
      try {
        const userId = getUserId(req);
        if (!userId) {
          return res.status(401).json({ error: 'Non autenticato' });
        }

        const { id } = req.params;
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: 'File PDF richiesto' });
        }

        if (file.mimetype !== 'application/pdf') {
          return res.status(400).json({ error: 'Solo PDF accettati' });
        }

        console.log('📄 File:', file.originalname, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);

        // Converti in base64
        const pdfBase64 = file.buffer.toString('base64');
        const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;

        // Update capitolo
        const [capitolo] = await db
          .update(capitoliSQ3R)
          .set({
            pdfUrl,
            pdfFileName: file.originalname,
            pdfFileSize: file.size,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(capitoliSQ3R.id, id),
              eq(capitoliSQ3R.userId, userId)
            )
          )
          .returning();

        if (!capitolo) {
          return res.status(404).json({ error: 'Capitolo non trovato' });
        }

        console.log('✅ PDF caricato');

        const { pdfUrl: _, ...capitoloSafe } = capitolo;
        res.json({ ...capitoloSafe, hasPdf: true });
      } catch (error: any) {
        console.error('❌ Errore upload PDF:', error.message);
        res.status(500).json({ error: 'Errore upload PDF' });
      }
    }
  );

  console.log('✅ Routes SQ3R registrate');
}
