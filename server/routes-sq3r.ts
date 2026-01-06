import { Express, Request, Response } from 'express';
import { db } from './db';
import { capitoliSQ3R, materieSQ3R } from '@shared/schema-sq3r';
import { eq, and } from 'drizzle-orm';
import multer from 'multer';
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

// AI Clients
let openai: OpenAI | null = null;
let genAI: GoogleGenerativeAI | null = null;

function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      openai = new OpenAI({
        apiKey: apiKey,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
    }
  }
  return openai;
}

function getGeminiClient() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (apiKey) {
      genAI = new GoogleGenerativeAI(apiKey);
    }
  }
  return genAI;
}

function cleanJson(text: string): string {
  if (!text) return "{}";
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("[");
  const lastBrace = cleaned.lastIndexOf("]");
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

// Helper to use Gemini for analysis
async function analyzeWithGemini(prompt: string, content: string): Promise<string> {
  const client = getGeminiClient();
  if (!client) throw new Error("Gemini API key not configured");
  
  const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  const result = await model.generateContent([
    prompt,
    content
  ]);
  
  return result.response.text();
}

// Multer per upload PDF
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

function getUserId(req: Request): string | undefined {
  const user = req.user as any;
  return user?.claims?.sub;
}

export function registerSQ3RRoutes(app: Express) {
  console.log('📚 [INIT] Registrazione routes SQ3R...');

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

  // ========== POST GENERA REVIEW (AI) ==========
  app.post('/api/sq3r/capitoli/:id/genera-review', async (req: Request, res: Response) => {
    console.log('📥 POST /api/sq3r/capitoli/:id/genera-review');
    
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Non autenticato' });
      }

      const { id } = req.params;

      // Recupera il capitolo con tutti i dati necessari (concetti chiave, domande, etc.)
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

      // Preparazione contenuto per AI
      let contentToAnalyze = `Capitolo: ${capitolo.titolo}\n\n`;
      
      // Aggiungi highlights
      const highlights = capitolo.readHighlights as any[];
      if (highlights && highlights.length > 0) {
        contentToAnalyze += "TESTO EVIDENZIATO:\n";
        highlights.forEach(h => {
          contentToAnalyze += `- ${h.testo}\n`;
          if (h.nota) contentToAnalyze += `  Nota: ${h.nota}\n`;
        });
        contentToAnalyze += "\n";
      }

      // Aggiungi note
      const notes = capitolo.readNote as any[];
      if (notes && notes.length > 0) {
        contentToAnalyze += "NOTE PERSONALI:\n";
        notes.forEach(n => {
          contentToAnalyze += `- ${n.contenuto}\n`;
        });
        contentToAnalyze += "\n";
      }

      // Se non c'è contenuto sufficiente, usa solo il titolo
      if (contentToAnalyze.length < 50) {
         contentToAnalyze += " (Genera domande generali basate su questo argomento)";
      }

      console.log(`🤖 Generazione Quiz AI per capitolo "${capitolo.titolo}"...`);
      console.log(`📊 Input length: ${contentToAnalyze.length} caratteri`);

      const systemPrompt = `Sei un esperto professore universitario. Devi creare un quiz di verifica per uno studente.
Analizza il seguente materiale di studio (evidenziature e note dello studente) e genera 5 domande a risposta multipla.

REGOLE:
1. Le domande devono essere basate SUL CONTENUTO FORNITO.
2. Crea 4 opzioni per ogni domanda.
3. Indica chiaramente la risposta corretta (indice 0-3).
4. Fornisci una breve spiegazione per la risposta corretta.
5. Usa un tono professionale ma incoraggiante.
6. Rispondi ESCLUSIVAMENTE con un array JSON valido.

FORMATO JSON RICHIESTO:
[
  {
    "domanda": "Testo della domanda...",
    "opzioni": ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
    "rispostaCorretta": 0,
    "spiegazione": "Perché questa è la risposta corretta..."
  }
]`;

      let generatedJson = "[]";

      // Tentativo 1: Gemini
      try {
        if (getGeminiClient()) {
           console.log("✨ Uso Gemini 2.0 Flash...");
           generatedJson = await analyzeWithGemini(systemPrompt, contentToAnalyze);
        } else {
           throw new Error("Gemini non configurato");
        }
      } catch (geminiError) {
        console.warn("⚠️ Gemini fallito, provo OpenAI...", geminiError);
        
        // Tentativo 2: OpenAI
        try {
          const openai = getOpenAIClient();
          if (!openai) throw new Error("Nessun provider AI configurato");
          
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: contentToAnalyze }
            ],
            temperature: 0.7,
          });
          
          generatedJson = completion.choices[0].message.content || "[]";
        } catch (openaiError) {
           console.error("❌ Anche OpenAI fallito:", openaiError);
           throw new Error("Impossibile generare il quiz al momento.");
        }
      }

      // Pulisci e parsa il JSON
      const cleanJsonString = cleanJson(generatedJson);
      let domandeGenerate = [];
      
      try {
        domandeGenerate = JSON.parse(cleanJsonString);
      } catch (e) {
        console.error("❌ Errore parsing JSON AI:", e);
        console.log("Raw output:", generatedJson);
        throw new Error("Errore nel formato della risposta AI");
      }

      // Validazione base
      if (!Array.isArray(domandeGenerate) || domandeGenerate.length === 0) {
        throw new Error("L'AI non ha generato domande valide");
      }

      // Salva le domande generate nel DB
      await db
        .update(capitoliSQ3R)
        .set({
          reviewData: JSON.stringify({ domande: domandeGenerate }), // Assicurati di serializzare se il campo è testo
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(capitoliSQ3R.id, id),
            eq(capitoliSQ3R.userId, userId)
          )
        );

      console.log(`✅ Quiz salvato con ${domandeGenerate.length} domande.`);
      res.json({ domande: domandeGenerate });
    } catch (error: any) {
      console.error('❌ Errore generazione review:', error);
      res.status(500).json({ error: 'Errore generazione quiz' });
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
