import type { Express, Request, Response, NextFunction } from "express";
// Force Vercel rebuild
import { createServer, type Server } from "http";
import { storage, simulazioniStorage } from "./storage";
import { registerSQ3RRoutes } from './routes-sq3r';
import { registerLibreriaRoutes } from './routes-libreria';
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertConcorsoSchema, insertMaterialSchema, insertCalendarEventSchema, type Simulazione, type InsertSimulazione, type DomandaSimulazione, type DettagliMateria, type Concorso } from "../shared/schema";
import { calculateSM2, initializeSM2 } from "./sm2-algorithm";
import { z } from "zod";
import { generateWithFallback, getOpenRouterClient, cleanJson, makeVisionUserMessage } from "./services/ai";
import { extractTextFromPDFRobust } from "./services/pdf-extraction";
import multer from "multer";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// Configura multer per salvare file su disco
const uploadsRoot = process.env.VERCEL ? join("/tmp", "uploads") : join(process.cwd(), "uploads");
const uploadDir = join(uploadsRoot, "materials");
try {
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.error("[MULTER] Impossibile creare uploadDir:", uploadDir, e);
}

const multerStorage = multer.diskStorage({
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
  storage: multerStorage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max (per video/audio)
  },
  fileFilter: (req, file, cb) => {
    console.log("[MULTER] File ricevuto:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      fieldname: file.fieldname
    });

    const allowedMimes = [
      // Documenti
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // Video
      'video/mp4',
      'video/x-msvideo', // AVI
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/mpeg3',
      'audio/x-mpeg-3',
    ];

    // Controlla anche l'estensione del file come fallback
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    const allowedExts = ['pdf', 'doc', 'docx', 'mp4', 'mp3', 'avi'];

    if (allowedMimes.includes(file.mimetype) || (fileExt && allowedExts.includes(fileExt))) {
      console.log("[MULTER] File accettato");
      cb(null, true);
    } else {
      console.log("[MULTER] File rifiutato - mimetype:", file.mimetype, "ext:", fileExt);
      cb(new Error(`Tipo di file non supportato: ${file.mimetype || 'sconosciuto'}. Tipi supportati: PDF, Word (.doc, .docx), MP4, MP3`));
    }
  },
});

// Use robust PDF extraction with pdf.js + OCR fallback
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const result = await extractTextFromPDFRobust(buffer);
  console.log(`[PDF] Text extracted using method: ${result.method}, pages: ${result.pageCount}${result.confidence ? `, confidence: ${result.confidence.toFixed(1)}%` : ''}`);
  return result.text;
}
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

function getUserId(req: Request): string {
  const user = req.user as any;
  return user?.id || user?.claims?.sub;
}

import { registerEdisesRoutes } from "./routes-edises";
import { registerNormativaRoutes } from './routes-normativa';
import { registerPodcastRoutes } from './routes-podcast';
import { registerPodcastAdminRoutes } from './routes-podcast-admin';
import { registerSubscriptionRoutes } from './routes-subscription';
import { registerAdminRoutes } from './routes-admin';
import { registerStorageRoutes } from './routes-storage';

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await setupAuth(app);

  console.log("Registering routes...");

  // Registra routes
  // app.use('/api/fase3', fase3Routes); // Moved to index.ts
  registerSQ3RRoutes(app);
  registerLibreriaRoutes(app);
  registerEdisesRoutes(app);
  registerNormativaRoutes(app);
  registerPodcastRoutes(app);
  registerPodcastAdminRoutes(app);
  registerSubscriptionRoutes(app);
  registerAdminRoutes(app);
  registerStorageRoutes(app);
  app.post('/api/flashcards/:id/spiega', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = getUserId(req);

      console.log(`💡 POST /api/flashcards/${id}/spiega`);

      // Controlla se esiste già una spiegazione in cache
      // Nota: db.query non è disponibile qui, usiamo storage o implementiamo query diretta se necessario
      // Per semplicità ora, generiamo sempre (ma potremmo aggiungere cache su storage.ts)

      // Ottieni la flashcard
      const flashcard = await storage.getFlashcard(id, userId);

      if (!flashcard) {
        return res.status(404).json({ error: 'Flashcard non trovata' });
      }

      if (!flashcard.concorsoId) {
        return res.status(400).json({ error: "Flashcard senza concorso associato" });
      }

      // Ottieni il concorso per contesto
      const concorso = await storage.getConcorso(flashcard.concorsoId, userId);

      if (!concorso) {
        return res.status(404).json({ error: 'Concorso non trovato' });
      }

      console.log('📚 Generazione spiegazione per:', {
        materia: flashcard.materia,
        domanda: flashcard.fronte.substring(0, 50) + '...'
      });

      const retroRaw = (flashcard.retro || "").trim();
      const retroNoEvidence = retroRaw
        .split(/\n\s*\nEvidenza:\s*/i)[0]
        .split(/\s+Evidenza:\s*/i)[0]
        .trim();
      const answerToExplain = retroNoEvidence || retroRaw;

      // Prepara il prompt per OpenAI
      const prompt = `Sei un tutor esperto per concorsi pubblici italiani.

CONTESTO CONCORSO:
- Ente: ${concorso.titoloEnte}
- Tipo: ${concorso.tipoConcorso}
- Materia: ${flashcard.materia}

DOMANDA DELLA FLASHCARD:
${flashcard.fronte}

RISPOSTA CORRETTA:
${answerToExplain}

COMPITO:
Fornisci una spiegazione chiara e completa di questo argomento per un candidato adulto a concorso pubblico. Mantieni il rigore concettuale, ma spiega in modo comprensibile.

STRUTTURA DELLA SPIEGAZIONE:
1. Spiegazione (2-4 frasi, chiare e precise)
2. Punti chiave (3-6 bullet brevi)
3. Errori comuni / trabocchetti d’esame (1-3 punti)
4. Esempio pratico (1 caso nella PA italiana)

VINCOLI:
- Italiano corretto e professionale, senza frasi infantili
- Massimo 300 parole
- Evita gergo inutile, ma NON banalizzare
- Focalizzati sulla preparazione al concorso
- Sii pratico e concreto

Fornisci SOLO la spiegazione, senza intestazioni o formule di cortesia.`;

      // SYSTEM HYBRID: Use Gemini -> Vercel Gateway -> OpenAI
      let spiegazione: string | null = null;

      try {
        const systemPrompt = "Sei un tutor esperto e paziente per concorsi pubblici italiani. Spiega concetti complessi in modo semplice e memorabile.";
        spiegazione = await generateWithFallback({
          task: "flashcard_explain",
          systemPrompt,
          userPrompt: prompt,
          temperature: 0.7,
          responseMode: "text",
        });
      } catch (err: any) {
        console.error("Errore generazione spiegazione:", err.message);
        // Rilancia l'errore per farlo catturare dal catch generale
        throw new Error(`Errore generazione AI: ${err.message}`);
      }

      if (!spiegazione) {
        throw new Error('Nessuna spiegazione ricevuta da AI (risposta vuota)');
      }

      console.log('✅ Spiegazione generata:', spiegazione.substring(0, 100) + '...');

      // Salva la spiegazione in cache (opzionale)
      // Puoi creare una tabella spiegazioni_cache per non rigenerare le stesse

      res.json({
        success: true,
        spiegazione,
        flashcard: {
          id: flashcard.id,
          fronte: flashcard.fronte,
          materia: flashcard.materia
        }
      });

    } catch (error: any) {
      console.error('❌ Errore generazione spiegazione:', error);
      const message = error instanceof Error ? error.message : "Errore sconosciuto";
      const looksLikeMissingKey =
        /api key not configured|api key|key not configured|OPENROUTER_API_KEY/i.test(message);

      res.status(looksLikeMissingKey ? 503 : 500).json({
        error: "Errore nella generazione della spiegazione",
        dettagli: looksLikeMissingKey
          ? "Funzioni AI non configurate (manca OPENROUTER_API_KEY)."
          : message,
      });
    }
  });

  // Test endpoint per verificare la configurazione e i componenti
  app.post("/api/test-ai-connection", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("[TEST-AI] Ricevuta richiesta test connessione AI");
      const { task = "flashcard" } = req.body;

      const result = await generateWithFallback({
        task: task as any,
        userPrompt: "Dimmi 'Ciao, la connessione funziona!' se mi senti.",
        temperature: 0.7
      });

      res.json({
        success: true,
        message: "Connessione AI funzionante",
        response: result,
        provider: "OpenRouter"
      });
    } catch (error: any) {
      console.error("[TEST-AI] Errore:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        details: "Verifica che OPENROUTER_API_KEY sia impostata correttamente."
      });
    }
  });

  // Endpoint pubblico per debug deploy (senza auth, non espone segreti)
  app.get("/api/public-status", (req: Request, res: Response) => {
    const hasOpenRouterKey = !!(
      process.env.OPENROUTER_API_KEY ||
      process.env.OPEN_ROUTER_API_KEY ||
      process.env.OPEN_ROUTER
    );
    res.json({
      ok: true,
      env: {
        NODE_ENV: process.env.NODE_ENV || null,
        VERCEL: !!process.env.VERCEL,
      },
      build: {
        vercelCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        vercelCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
      },
      config: {
        OPENROUTER_API_KEY: hasOpenRouterKey ? "present" : "missing",
        DATABASE_URL: process.env.DATABASE_URL ? "present" : "missing",
        SESSION_SECRET: process.env.SESSION_SECRET ? "present" : "missing",
      },
    });
  });

  // Test endpoint per verificare la configurazione e i componenti
  app.get("/api/test-config", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const hasOpenRouterKey = !!(
        process.env.OPENROUTER_API_KEY ||
        process.env.OPEN_ROUTER_API_KEY ||
        process.env.OPEN_ROUTER
      );
      const hasDatabaseUrl = !!process.env.DATABASE_URL;

      // Test OpenRouter client creation
      let openrouterTest = false;
      let openrouterError = null;
      try {
        getOpenRouterClient();
        openrouterTest = true;
      } catch (error: any) {
        openrouterError = error.message;
      }

      // Test PDF extraction (with a dummy buffer)
      let pdfTest = false;
      let pdfError = null;
      try {
        // Just test if pdf-parse is importable
        const pdfParse = await import("pdf-parse");
        if (pdfParse && (pdfParse.default || typeof pdfParse === 'function')) {
          pdfTest = true;
        } else {
          pdfError = "pdf-parse library not loaded correctly";
        }
      } catch (error: any) {
        pdfError = error.message;
      }

      res.json({
        hasOpenRouterKey,
        hasDatabaseUrl,
        openrouterClientCreated: openrouterTest,
        openrouterError,
        pdfLibraryLoaded: pdfTest,
        pdfError,
        envVars: {
          OPENROUTER_API_KEY: hasOpenRouterKey ? "present" : "missing",
          DATABASE_URL: process.env.DATABASE_URL ? "present" : "missing",
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test endpoint per testare l'analisi con un PDF di esempio
  app.post("/api/test-analyze", isAuthenticated, upload.single("file"), async (req: MulterRequest, res: Response) => {
    try {
      console.log("=== TEST ANALISI BANDO ===");

      if (!req.file) {
        return res.status(400).json({ error: "Nessun file caricato" });
      }

      console.log("1. File ricevuto:", req.file.originalname, req.file.size, "bytes");

      // Test OpenRouter client
      console.log("2. Test creazione client OpenRouter...");
      let openrouter;
      try {
        openrouter = getOpenRouterClient();
        console.log("   ✓ Client OpenRouter creato");
      } catch (error: any) {
        console.error("   ✗ Errore creazione client:", error.message);
        return res.status(500).json({
          step: "openrouter_client",
          error: error.message
        });
      }

      // Test PDF extraction
      console.log("3. Test estrazione PDF...");
      let fileContent: string;
      try {
        if (req.file.mimetype === "application/pdf") {
          fileContent = await extractTextFromPDF(req.file.buffer);
          console.log("   ✓ PDF estratto:", fileContent.length, "caratteri");
        } else {
          fileContent = req.file.buffer.toString("utf-8");
          console.log("   ✓ File testo:", fileContent.length, "caratteri");
        }
      } catch (error: any) {
        console.error("   ✗ Errore estrazione PDF:", error.message);
        return res.status(500).json({
          step: "pdf_extraction",
          error: error.message
        });
      }

      if (!fileContent || fileContent.trim().length < 100) {
        return res.status(400).json({
          step: "pdf_content",
          error: "File vuoto o troppo corto",
          contentLength: fileContent?.length || 0
        });
      }

      // Test OpenRouter API call (with minimal content)
      console.log("4. Test chiamata API OpenRouter...");
      const testContent = fileContent.substring(0, 1000);
      try {
        await openrouter.chat.completions.create({
          model: "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: `Test: extract the first 10 words from this text: ${testContent}` }
          ],
          max_tokens: 50,
        });
        console.log("   ✓ API OpenRouter risponde correttamente");
        res.json({
          success: true,
          message: "Tutti i test passati",
          steps: {
            fileReceived: true,
            openrouterClient: true,
            pdfExtraction: true,
            openrouterApi: true
          }
        });
      } catch (error: any) {
        console.error("   ✗ Errore chiamata API:", error.message);
        return res.status(500).json({
          step: "openrouter_api",
          error: error.message,
          details: error.response?.data || "Nessun dettaglio disponibile"
        });
      }
    } catch (error: any) {
      console.error("Errore generale nel test:", error);
      const isProd = process.env.NODE_ENV === "production";
      res.status(500).json({
        step: "unknown",
        error: error.message || "Errore sconosciuto",
        ...(isProd ? {} : { stack: error.stack }),
      });
    }
  });

  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      console.log("Fetching user with ID:", userId);

      let user = await storage.getUser(userId);

      // If user doesn't exist, create it (mock mode)
      if (!user) {
        console.log("User not found, creating admin user");
        user = await storage.upsertUser({
          id: userId || "admin",
          email: "admin@test.com",
          firstName: "Admin",
          lastName: "User",
        });
      }

      res.json(user);
    } catch (error: any) {
      console.error("Error fetching user:", error);
      // In mock mode, return a default user even on error
      const defaultUser = {
        id: "admin",
        email: "admin@test.com",
        firstName: "Admin",
        lastName: "User",
        profileImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      res.json(defaultUser);
    }
  });

  app.get("/api/concorsi", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      console.log("GET /api/concorsi - UserId:", userId);
      const concorsi = await storage.getConcorsi(userId);
      console.log("GET /api/concorsi - Found", concorsi.length, "concorsi");
      res.json(concorsi);
    } catch (error: any) {
      console.error("Error fetching concorsi:", error);
      console.error("Error stack:", error?.stack);
      res.status(500).json({
        error: "Errore nel recupero concorsi",
        details: error?.message || "Errore sconosciuto"
      });
    }
  });

  app.get("/api/concorsi/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const concorso = await storage.getConcorso(req.params.id, userId);
      if (!concorso) {
        return res.status(404).json({ error: "Concorso non trovato" });
      }
      res.json(concorso);
    } catch (error) {
      console.error("Error fetching concorso:", error);
      res.status(500).json({ error: "Errore nel recupero concorso" });
    }
  });

  // Public endpoint: Get active official concorsi catalog (no auth required)
  app.get("/api/official-concorsi", async (req: Request, res: Response) => {
    try {
      const concorsiList = await storage.getOfficialConcorsi(true); // Only active
      res.json(concorsiList);
    } catch (error) {
      console.error("Error fetching official concorsi:", error);
      res.status(500).json({ error: "Errore nel recupero catalogo concorsi" });
    }
  });

  app.post("/api/concorsi", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { officialConcorsoId, ...restBody } = req.body;

      let data: any = { ...restBody, userId };

      // If creating from official catalog, pre-fill data from the official concorso
      if (officialConcorsoId) {
        const officialConcorso = await storage.getOfficialConcorso(officialConcorsoId);
        if (!officialConcorso) {
          return res.status(404).json({ error: "Concorso ufficiale non trovato" });
        }

        // Pre-fill data from official concorso
        data = {
          ...data,
          nome: officialConcorso.titolo,
          titoloEnte: officialConcorso.ente,
          posti: officialConcorso.posti,
          scadenzaDomanda: officialConcorso.scadenzaDomanda
            ? new Date(officialConcorso.scadenzaDomanda).toLocaleDateString('it-IT')
            : null,
          dataPresuntaEsame: officialConcorso.dataProva
            ? new Date(officialConcorso.dataProva).toLocaleDateString('it-IT')
            : null,
          officialConcorsoId: officialConcorsoId,
          // Store bando analysis from official catalog if available
          bandoAnalysis: officialConcorso.bandoAnalysis || null,
        };
      }

      const validated = insertConcorsoSchema.parse(data);
      const concorso = await storage.createConcorso(validated);
      res.status(201).json(concorso);
    } catch (error: any) {
      console.error("Error creating concorso:", error);
      res.status(400).json({ error: error.message || "Errore nella creazione del concorso" });
    }
  });

  app.patch("/api/concorsi/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const concorso = await storage.updateConcorso(req.params.id, userId, req.body);
      if (!concorso) {
        return res.status(404).json({ error: "Concorso non trovato" });
      }
      res.json(concorso);
    } catch (error) {
      console.error("Error updating concorso:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento del concorso" });
    }
  });

  app.delete("/api/concorsi/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const deleted = await storage.deleteConcorso(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Concorso non trovato" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting concorso:", error);
      res.status(500).json({ error: "Errore nell'eliminazione del concorso" });
    }
  });

  app.get("/api/materials", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const concorsoId = req.query.concorsoId as string;
      if (!concorsoId) {
        return res.status(400).json({ error: "concorsoId richiesto" });
      }
      const materials = await storage.getMaterials(userId, concorsoId);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ error: "Errore nel recupero materiali" });
    }
  });

  app.post("/api/materials", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const data = { ...req.body, userId };

      const validated = insertMaterialSchema.parse(data);

      const concorso = await storage.getConcorso(validated.concorsoId, userId);
      if (!concorso) {
        return res.status(403).json({ error: "Concorso non trovato o non autorizzato" });
      }

      const material = await storage.createMaterial(validated);
      res.status(201).json(material);
    } catch (error: any) {
      console.error("Error creating material:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Dati non validi", details: error.errors });
      }
      res.status(500).json({ error: "Errore nella creazione materiale" });
    }
  });

  app.delete("/api/materials/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const deleted = await storage.deleteMaterial(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Materiale non trovato" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting material:", error);
      res.status(500).json({ error: "Errore nell'eliminazione materiale" });
    }
  });

  app.get("/api/flashcards", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const concorsoId = req.query.concorsoId as string | undefined;
      const flashcards = await storage.getFlashcards(userId, concorsoId);
      res.json(flashcards);
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      res.status(500).json({ error: "Errore nel recupero flashcards" });
    }
  });

  app.get("/api/user-progress", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const concorsoId = req.query.concorsoId as string | undefined;
      const progress = await storage.getUserProgress(userId, concorsoId);
      res.json(progress || null);
    } catch (error) {
      console.error("Error fetching user progress:", error);
      res.status(500).json({ error: "Errore nel recupero progresso utente" });
    }
  });

  app.get("/api/flashcard-session", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const progress = await storage.getUserProgress(userId);
      res.json(progress?.flashcardSession || null);
    } catch (error) {
      console.error("Error fetching flashcard session:", error);
      res.status(500).json({ error: "Errore nel recupero sessione" });
    }
  });

  app.post("/api/flashcard-session", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const sessionData = req.body;
      await storage.upsertUserProgress({ userId, flashcardSession: sessionData });
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving flashcard session:", error);
      res.status(500).json({ error: "Errore nel salvataggio sessione" });
    }
  });

  app.delete("/api/flashcard-session", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      await storage.upsertUserProgress({ userId, flashcardSession: null });
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing flashcard session:", error);
      res.status(500).json({ error: "Errore nella cancellazione sessione" });
    }
  });

  app.post("/api/upload-material", isAuthenticated, (req: Request, res: Response, next: NextFunction) => {
    console.log("[UPLOAD-MATERIAL] === MIDDLEWARE MULTER ===");
    console.log("[UPLOAD-MATERIAL] Content-Type:", req.headers['content-type']);
    console.log("[UPLOAD-MATERIAL] Body keys:", Object.keys(req.body || {}));

    upload.single("file")(req as any, res, async (err: any) => {
      if (err) {
        console.error("[UPLOAD-MATERIAL] Errore multer:", err.message);
        console.error("[UPLOAD-MATERIAL] Stack multer:", err.stack);
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File troppo grande. Dimensione massima: 500MB" });
        }
        if (err.message && err.message.includes("Tipo di file non supportato")) {
          return res.status(400).json({ error: err.message });
        }
        return res.status(400).json({ error: "Errore nel caricamento file", details: err.message });
      }

      console.log("[UPLOAD-MATERIAL] Multer completato, file:", (req as MulterRequest).file ? "PRESENTE" : "NON PRESENTE");

      // Se non ci sono errori, procedi con l'handler
      try {
        const reqWithFile = req as MulterRequest;
        console.log("[UPLOAD-MATERIAL] === INIZIO UPLOAD ===");
        const userId = getUserId(reqWithFile);
        const concorsoId = reqWithFile.body.concorsoId;
        const materia = reqWithFile.body.materia || "Generale";
        const tipoMateriale = reqWithFile.body.tipo || "libro";

        console.log("[UPLOAD-MATERIAL] UserId:", userId);
        console.log("[UPLOAD-MATERIAL] ConcorsoId:", concorsoId);
        console.log("[UPLOAD-MATERIAL] Materia:", materia);
        console.log("[UPLOAD-MATERIAL] Tipo:", tipoMateriale);
        console.log("[UPLOAD-MATERIAL] File:", reqWithFile.file ? {
          originalname: reqWithFile.file.originalname,
          mimetype: reqWithFile.file.mimetype,
          size: reqWithFile.file.size,
          filename: reqWithFile.file.filename
        } : "NON PRESENTE");

        if (!reqWithFile.file || !concorsoId) {
          console.log("[UPLOAD-MATERIAL] ERRORE: File o concorsoId mancante");
          return res.status(400).json({ error: "File e concorsoId richiesti" });
        }

        console.log("[UPLOAD-MATERIAL] Verifica concorso...");
        const concorso = await storage.getConcorso(concorsoId, userId);
        if (!concorso) {
          console.log("[UPLOAD-MATERIAL] ERRORE: Concorso non trovato");
          return res.status(403).json({ error: "Concorso non trovato o non autorizzato" });
        }
        console.log("[UPLOAD-MATERIAL] Concorso trovato:", concorso.id);

        // Salva il file e ottieni il percorso
        const fileUrl = `/uploads/materials/${reqWithFile.file.filename}`;
        console.log("[UPLOAD-MATERIAL] FileUrl:", fileUrl);

        // Estrai contenuto solo per PDF e Word (per generare flashcard)
        let contenuto: string | undefined = undefined;
        const mimeType = reqWithFile.file.mimetype;

        if (mimeType === "application/pdf") {
          console.log("[UPLOAD-MATERIAL] Estrazione testo da PDF...");
          try {
            // Leggi il file dal disco per estrarre il testo
            const filePath = join(uploadDir, reqWithFile.file.filename);
            const fileBuffer = readFileSync(filePath);
            contenuto = await extractTextFromPDF(fileBuffer);
            console.log("[UPLOAD-MATERIAL] Testo estratto:", contenuto ? `${contenuto.length} caratteri` : "vuoto");
          } catch (pdfError: any) {
            console.error("[UPLOAD-MATERIAL] Error extracting PDF text:", pdfError);
            // Continua comunque, il file è salvato
          }
        } else if (
          mimeType === "application/msword" ||
          mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
          // Per Word, per ora salviamo solo il file (estrazione testo Word richiede librerie aggiuntive)
          contenuto = `File Word caricato: ${reqWithFile.file.originalname}`;
          console.log("[UPLOAD-MATERIAL] File Word, contenuto placeholder creato");
        } else {
          console.log("[UPLOAD-MATERIAL] File video/audio, nessun contenuto estratto");
        }
        // Per MP4 e MP3, non estraiamo contenuto, solo salviamo il file
        // Per video e audio, contenuto rimane undefined

        console.log("[UPLOAD-MATERIAL] Creazione materiale nel database...");
        const materialData = {
          userId,
          concorsoId,
          nome: reqWithFile.body.nome || reqWithFile.file.originalname,
          tipo: tipoMateriale,
          materia,
          contenuto,
          fileUrl,
          estratto: tipoMateriale === "appunti" ? false : true,
        };
        console.log("[UPLOAD-MATERIAL] Material data:", {
          ...materialData,
          contenuto: contenuto ? `${contenuto.length} caratteri` : undefined
        });

        const material = await storage.createMaterial(materialData);
        console.log("[UPLOAD-MATERIAL] Materiale creato con successo:", material.id);

        res.status(201).json(material);
      } catch (error: any) {
        console.error("[UPLOAD-MATERIAL] === ERRORE ===");
        console.error("[UPLOAD-MATERIAL] Tipo:", typeof error);
        console.error("[UPLOAD-MATERIAL] Nome:", error?.name);
        console.error("[UPLOAD-MATERIAL] Messaggio:", error?.message);
        console.error("[UPLOAD-MATERIAL] Stack:", error?.stack);
        if (error?.code) {
          console.error("[UPLOAD-MATERIAL] Code:", error.code);
        }
        if (error?.errors) {
          console.error("[UPLOAD-MATERIAL] Validation errors:", JSON.stringify(error.errors, null, 2));
        }
        res.status(500).json({
          error: "Errore nel caricamento materiale",
          details: error?.message || "Errore sconosciuto"
        });
      }
    });
  });

  app.post("/api/ocr/images", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        images: z
          .array(
            z.object({
              base64: z.string().min(1),
              mimeType: z.string().min(1),
            }),
          )
          .min(1)
          .max(2),
      });

      const { images } = schema.parse(req.body);

      for (const img of images) {
        if (img.base64.length > 4_000_000) {
          return res.status(400).json({
            error: "Immagine troppo grande per OCR. Riduci la risoluzione o il numero di pagine.",
          });
        }
      }

      const prompt =
        "Estrai fedelmente tutto il testo visibile nell'immagine. Mantieni l'italiano e la punteggiatura. Non aggiungere spiegazioni: restituisci solo testo.";
      const text = await generateWithFallback({
        task: "ocr_images",
        messages: [makeVisionUserMessage(prompt, images)],
        temperature: 0,
        responseMode: "text",
      });
      return res.json({ text: text || "" });
    } catch (error: any) {
      return res.status(500).json({
        error: "Errore OCR",
        details: error?.message || "Errore sconosciuto",
      });
    }
  });

  app.post("/api/generate-flashcards", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { materialId } = req.body;

      if (!materialId) {
        return res.status(400).json({ error: "materialId richiesto" });
      }

      const material = await storage.getMaterial(materialId, userId);
      if (!material) {
        return res.status(404).json({ error: "Materiale non trovato" });
      }
      if (!material.contenuto) {
        return res.status(400).json({ error: "Materiale senza contenuto" });
      }
      if (material.contenuto.trim().length < 500) {
        return res.status(400).json({
          error:
            "Contenuto insufficiente per generare flashcard. Usa un PDF testuale (non scannerizzato) oppure incolla il testo negli appunti.",
        });
      }

      const concorso = await storage.getConcorso(material.concorsoId, userId);
      if (!concorso) {
        return res.status(403).json({ error: "Concorso non autorizzato" });
      }

      const normalizeForMatch = (s: string) =>
        s
          .toLowerCase()
          // Rimuovi flag 'u' per compatibilità ES5/ES2015 se necessario, 
          // oppure usa regex più semplice [a-zA-Z] se \p{L} non è supportato.
          // Ma Vercel Node 18+ supporta \p{L} con flag u. 
          // Se tsc si lamenta (target ES5), usiamo [a-zA-Z\u00C0-\u00FF] approssimato.
          // .replace(/(\p{L})-\s+(\p{L})/gu, "$1$2") 
          .replace(/([a-zA-Z\u00C0-\u024F])-\s+([a-zA-Z\u00C0-\u024F])/g, "$1$2")
          // .replace(/[^\p{L}\p{N}\s]/gu, " ")
          .replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();


      // Logica "Fallback Intelligente": Estrae frasi chiave con regex se l'AI fallisce
      // Evita domande banali su singole parole, cercando invece frasi complete.
      const smartRegexFallback = (text: string, count: number) => {
        const out: Array<{ fronte: string; retro: string; evidenza: string }> = [];
        const seen = new Set<string>();

        const pushIfNew = (fronte: string, retro: string, evidenza: string) => {
          if (out.length >= count) return;
          const key = normalizeForMatch(fronte);
          if (!key || seen.has(key)) return;
          seen.add(key);
          out.push({ fronte, retro, evidenza });
        };

        // 1. Cerca definizioni esplicite: "X è Y", "X sono Y", "X consiste in Y"
        // Regex cattura: (Soggetto) (verbo) (Definizione)
        // Limita lunghezza soggetto (10-100 chars) e definizione (20-300 chars)
        const flatText = text.replace(/\s*\n+\s*/g, " ").replace(/\s+/g, " ").trim();
        const definitionRegex = /([A-Z][^.?!:]{10,100}?)\s+(?:è|sono|consiste|rappresenta|costituisce)\s+([^.?!:]{20,300}?)[.?!]/g;
        const intendePerRegex = /Si\s+intende\s+per\s+([A-Z][^,:\n]{5,80}?)\s+([^.?!:\n]{20,300}?)[.?!]/g;
        const perIntendeRegex = /(?:Per|Ai\s+fini(?:\s+della\s+presente\s+[^,]{0,50})?,?\s+per)\s+([A-Z][^,:\n]{5,80}?)\s+si\s+intende\s+([^.?!:\n]{20,300}?)[.?!]/g;

        let match;
        const runDefinitionRegex = (re: RegExp, kind: "def" | "intende") => {
          re.lastIndex = 0;
          while ((match = re.exec(flatText)) !== null) {
            if (out.length >= count) break;
            const subject = (match[1] || "").trim();
            const def = (match[2] || "").trim();
            const fullSentence = (match[0] || "").trim();
            if (!subject || !def) continue;
            if (subject.split(" ").length < 2 && subject.length < 15) continue;

            const normalizedSubject = subject.replace(/\s+/g, " ").trim();
            const shortSubject =
              normalizedSubject.length > 120
                ? normalizedSubject.slice(0, 117) + "..."
                : normalizedSubject;

            const q =
              kind === "intende"
                ? `Secondo il testo, cosa si intende per ${shortSubject}?`
                : `Secondo il testo, come viene descritto il seguente concetto: ${shortSubject}?`;

            const retro = `Secondo il testo: ${def}`;
            pushIfNew(q, retro, fullSentence);
          }
        };

        runDefinitionRegex(definitionRegex, "def");
        runDefinitionRegex(intendePerRegex, "intende");
        runDefinitionRegex(perIntendeRegex, "intende");

        // 2. Cerca elenchi o punti chiave se servono ancora card
        if (out.length < count) {
          const lines = text.split(/\r?\n/);
          const bulletLineRegex = /^\s*(?:[-•*]|\d+[.)])\s+(.+?)\s*$/;
          const isIntroLine = (s: string) =>
            s.length >= 20 &&
            s.length <= 220 &&
            (/:$/.test(s) || /\b(?:come\s+segue|i\s+seguenti|tra\s+cui)\b/i.test(s));

          for (let i = 0; i < lines.length && out.length < count; i++) {
            const line = (lines[i] || "").trim();
            if (!line) continue;
            if (!isIntroLine(line)) continue;

            const intro = line.replace(/[:\s]+$/g, "").trim();
            if (!intro) continue;

            const items: string[] = [];
            for (let j = i + 1; j < lines.length && items.length < 10; j++) {
              const m = (lines[j] || "").match(bulletLineRegex);
              if (!m) break;
              const item = (m[1] || "").trim();
              if (item.length < 4) continue;
              items.push(item);
            }

            if (items.length < 2) continue;
            for (const item of items) {
              if (out.length >= count) break;
              pushIfNew(
                `Nel testo, quale elemento è elencato in relazione a "${intro}"?`,
                item,
                `${intro}: ${item}`
              );
            }
          }
        }

        return out;
      };

      // Se l'AI fallisce, usa il fallback intelligente
      const groundedFallbackFromText = (text: string) => {
        return smartRegexFallback(text, 15); // Tenta di estrarne fino a 15
      };

      const rawText = material.contenuto;
      const maxCharsToAnalyze = Math.min(rawText.length, 180_000);
      const contentToAnalyze = rawText.slice(0, maxCharsToAnalyze);

      const totalWords = normalizeForMatch(contentToAnalyze).split(" ").filter(Boolean).length;
      const desiredCount = Math.max(20, Math.min(100, Math.round(totalWords / 120)));


      console.log(
        `[GEN-FLASHCARDS] Analisi testo (chars=${contentToAnalyze.length}, primi 500): ${contentToAnalyze.substring(0, 500)}...`
      );

      const systemPrompt = `Sei un esperto creatore di flashcard per la preparazione ai concorsi pubblici italiani (diritto, economia, informatica, lingue, materie tecniche, cultura generale, logica, ecc.).

LIVELLO TARGET
- Scrivi per un candidato adulto a concorsi pubblici, NON per studenti delle scuole superiori.
- Usa un italiano corretto, preciso e professionale, evitando frasi infantili o vaghe.
- Le domande devono richiedere ragionamento, collegare concetti, condizioni, eccezioni e casi pratici, non mera ripetizione di definizioni banali.

OBIETTIVO
Analizza il testo fornito (da PDF o testo incollato) e genera flashcard che stimolano studio attivo e comprensione profonda. Usa SOLO informazioni presenti nel materiale: non inventare contenuti.

COPERTURA E DENSITÀ
- Estrai tutti i concetti significativi, soprattutto norme, procedure, condizioni, eccezioni, soglie numeriche, casi pratici.
- Genera il numero di flashcard richiesto sfruttando al massimo il contenuto.
- Ogni flashcard deve essere unica: niente duplicati o domande quasi identiche.
- Varia la tipologia di domanda per coprire diversi aspetti dello stesso argomento.

TIPI DI DOMANDA (ALTERNALI SPESSO)
1. Differenze e confronti: "Qual è la differenza tra X e Y?"
2. Requisiti e condizioni: "Quali sono i requisiti/caratteristiche di...?"
3. Cause ed effetti: "Cosa succede se/quando...?"
4. Applicazioni pratiche: "In quale caso/contesto si usa...?"
5. Eccezioni e limiti: "Quando NON si applica/funziona...?"
6. Procedure e processi: "Qual è la sequenza/procedura per...?"
7. Relazioni: "Come si collega X con Y?"
8. Classificazioni: "In quale categoria rientra...?"
9. Finalità e scopi: "Qual è lo scopo/obiettivo di...?"
10. Soggetti e competenze: "Chi è competente per...?"

EVITA
- Domande generiche tipo "Cos'è X?" o "Definisci Y" quando X/Y sono solo una parola o un concetto molto generico.
- Domande sì/no.
- Domande troppo vaghe o troppo simili tra loro.
- Copiare letteralmente una frase del testo come domanda senza trasformarla in una domanda chiara e mirata.

STRUTTURA DI OGNI FLASHCARD
- "fronte": una domanda specifica, autonoma e mirata, formulata in italiano corretto, che include il contesto necessario (es. ambito, norma, situazione pratica).
- "retro": una risposta accurata e sintetica (2-3 frasi) che riassume le informazioni chiave, con linguaggio tecnico ma comprensibile.
- "evidenza": una citazione o riferimento dal testo che giustifica la risposta.
  - Per materie giuridiche: includi, quando possibile, riferimenti del tipo "Art. X, comma Y, Legge n. Z del GG/MM/AAAA" o di regolamenti specifici.
  - Per altre materie: copia il passaggio chiave, la formula o il dato numerico esatto (percentuali, soglie, limiti, valori, esempi).

CASI SPECIALI: CREA FLASHCARD DEDICATE PER OGNI OCCORRENZA DI
- Norme (articoli di legge, regolamenti, direttive).
- Date rilevanti (entrata in vigore, scadenze, eventi storici).
- Elenchi strutturati (classificazioni, tipologie, componenti, fasi di un processo).
- Numeri importanti (soglie, percentuali, formule, statistiche).
- Acronimi e sigle (significato e contesto).
- Nomi propri importanti (autori, enti, istituzioni, teorie).
- Termini tecnici (con definizione e contesto).
- Esempi pratici (casi reali o applicazioni nel testo).

FORMATTO DI OUTPUT
Devi restituire SOLO un ARRAY JSON valido. Ogni elemento dell'array deve essere un oggetto con le chiavi esatte:
- "fronte": string
- "retro": string
- "evidenza": string
Nessun testo fuori dal JSON, niente spiegazioni aggiuntive, niente markdown.`;

      const parseFlashcards = (content: any) => {
        let items: any[] = [];
        try {
          const parsed = typeof content === "string" ? JSON.parse(content) : content;
          if (Array.isArray(parsed)) items = parsed;
          else if (parsed && Array.isArray(parsed.flashcards)) items = parsed.flashcards;
          else if (parsed && Array.isArray(parsed.items)) items = parsed.items;
          else if (parsed && Array.isArray(parsed.questions)) {
            items = parsed.questions.map((q: any) => ({
              fronte: q.question || q.text,
              retro: q.explanation || q.correctAnswer,
              evidenza: q.evidence,
            }));
          } else items = [];
        } catch {
          items = [];
        }
        return Array.isArray(items) ? items : [];
      };

      const splitIntoChunks = (text: string, chunkSize = 12000, overlap = 600) => {
        const chunks: string[] = [];
        let i = 0;
        while (i < text.length) {
          const end = Math.min(text.length, i + chunkSize);
          chunks.push(text.slice(i, end));
          if (end === text.length) break;
          i = Math.max(0, end - overlap);
        }
        return chunks;
      };

      const chunks = splitIntoChunks(contentToAnalyze);
      const collected: any[] = [];
      const aiErrors: string[] = [];

      const hasAnyAI = !!(
        process.env.OPENROUTER_API_KEY ||
        process.env.OPEN_ROUTER_API_KEY ||
        process.env.OPEN_ROUTER
      );

      const maxChunksToProcess = 10;
      const chunkIndices =
        chunks.length <= maxChunksToProcess
          ? chunks.map((_, i) => i)
          : Array.from({ length: maxChunksToProcess }, (_, i) =>
            Math.floor((i * (chunks.length - 1)) / (maxChunksToProcess - 1))
          ).filter((v, i, arr) => arr.indexOf(v) === i);

      const perChunkTarget = Math.max(
        12,
        Math.min(20, Math.ceil(desiredCount / Math.max(1, chunkIndices.length)))
      );

      if (hasAnyAI) {
        for (let listIdx = 0; listIdx < chunkIndices.length && collected.length < desiredCount; listIdx++) {
          const idx = chunkIndices[listIdx];
          const chunk = chunks[idx];
          const chunkNormalized = normalizeForMatch(chunk);
          const chunkTokens = new Set(chunkNormalized.split(" ").filter(Boolean));
          const userPrompt =
            `Genera ${perChunkTarget} flashcard sul testo seguente (chunk ${listIdx + 1}/${chunkIndices.length}).\n` +
            `Requisiti: analizza il contenuto; domande specifiche, non banali, diverse tra loro, che richiedono ragionamento e collegano cause, condizioni, effetti ed eccezioni; livello da concorso pubblico; risposte 1-3 frasi con linguaggio tecnico ma chiaro.\n` +
            `Preferisci domande del tipo: "quali sono", "in quali casi", "che effetti produce", "qual è la differenza tra", "perché", "in quali condizioni", "quali eccezioni".\n` +
            `Evita domande meramente definitorie del tipo "Che cos'è X?" o "Definisci Y" quando X/Y sono una singola parola generica; accetta definizioni solo se il testo insiste su una definizione articolata di istituti complessi (es. un istituto giuridico o una procedura).\n` +
            `Per "evidenza": copia e incolla dal TESTO una frase/porzione (5-25 parole) che supporta direttamente la risposta, senza parafrasi.\n` +
            `Restituisci SOLO JSON.\n` +
            `TESTO:\n${chunk}`;

          let content: string;
          try {
            content = await generateWithFallback({
              task: "flashcards_generate",
              systemPrompt,
              userPrompt,
              responseMode: "json",
              jsonRoot: "array",
              temperature: 0.2,
            });
          } catch (e: any) {
            aiErrors.push(e?.message || "Errore AI sconosciuto");
            continue;
          }

          const items = parseFlashcards(cleanJson(content || "")).map((f: any) => ({
            ...f,
            __chunkIndex: idx,
            __chunkNormalized: chunkNormalized,
            __chunkTokens: chunkTokens,
          }));
          for (const f of items) {
            if (collected.length >= desiredCount) break;
            collected.push(f);
          }
        }
      }

      const normalizedText = normalizeForMatch(contentToAnalyze);
      const textTokens = new Set(normalizedText.split(" ").filter(Boolean));
      const preEvidence: any[] = collected
        .map((f: any) => {
          const fronteRaw =
            typeof f?.fronte === "string"
              ? f.fronte
              : typeof f?.domanda === "string"
                ? f.domanda
                : typeof f?.question === "string"
                  ? f.question
                  : typeof f?.q === "string"
                    ? f.q
                    : "";
          const retroRaw =
            typeof f?.retro === "string"
              ? f.retro
              : typeof f?.risposta === "string"
                ? f.risposta
                : typeof f?.answer === "string"
                  ? f.answer
                  : typeof f?.a === "string"
                    ? f.a
                    : "";
          const evidenzaRaw =
            typeof f?.evidenza === "string"
              ? f.evidenza
              : typeof f?.fonte === "string"
                ? f.fonte
                : typeof f?.source === "string"
                  ? f.source
                  : typeof f?.citazione === "string"
                    ? f.citazione
                    : typeof f?.reference === "string"
                      ? f.reference
                      : typeof f?.evidence === "string"
                        ? f.evidence
                        : "";

          const fronte = fronteRaw.trim();
          const retro = retroRaw.trim();
          const evidenza = evidenzaRaw.trim();
          const chunkNormalized = typeof f?.__chunkNormalized === "string" ? f.__chunkNormalized : "";
          const chunkTokens = f?.__chunkTokens instanceof Set ? f.__chunkTokens : null;
          return { fronte, retro, evidenza, chunkNormalized, chunkTokens };
        })
        .filter((f) => f.fronte.length >= 20 && f.retro.length >= 15 && f.evidenza.length >= 20)
        .filter((f) => {
          const q = f.fronte.toLowerCase().replace(/\s+/g, " ").trim();
          const tokens = q.split(" ");
          if (tokens.length <= 4 && /^che\s+cos['’]?\s?è\b/.test(q)) return false;
          if (tokens.length <= 4 && /^cos['’]?\s?è\b/.test(q)) return false;
          return true;
        })
        .filter((f, i, arr) => {
          const key = normalizeForMatch(f.fronte);
          return arr.findIndex((x) => normalizeForMatch(x.fronte) === key) === i;
        });

      const evidenceVerified: any[] = preEvidence.filter((f) => {
        const ev = normalizeForMatch(f.evidenza);
        if (f.chunkNormalized && f.chunkNormalized.includes(ev)) return true;
        if (normalizedText.includes(ev)) return true;

        const evTokens = ev.split(" ").filter((t) => t.length >= 3);
        if (evTokens.length < 6) return false;

        let found = 0;
        for (const t of evTokens) {
          if (f.chunkTokens?.has(t) || textTokens.has(t)) found++;
        }
        const required = Math.max(3, Math.ceil(evTokens.length * 0.55));
        return found >= required;
      });

      const cleaned = evidenceVerified;
      const canUseLoose = preEvidence.length > 0 && cleaned.length < Math.min(12, desiredCount);
      const looseWarning = canUseLoose
        ? "Alcune evidenze non risultano verificabili come citazioni letterali del testo (PDF spezzato/impaginazione). Flashcard generate in modalità tollerante."
        : undefined;

      if (canUseLoose) {
        cleaned.splice(0, cleaned.length, ...preEvidence.slice(0, desiredCount));
      }

      if (cleaned.length < Math.min(12, desiredCount)) {
        if (!hasAnyAI) {
          const fallback = groundedFallbackFromText(contentToAnalyze);
          if (fallback.length) {
            cleaned.splice(0, cleaned.length, ...fallback);
          } else {
            return res.status(200).json({
              count: 0,
              flashcards: [],
              warning:
                "Testo non abbastanza strutturato per creare flashcard automaticamente. Prova con appunti incollati o un PDF diverso.",
              aiConfigured: hasAnyAI,
              aiErrors: aiErrors.slice(0, 5),
            });
          }
        } else if (cleaned.length === 0) {
          return res.status(200).json({
            count: 0,
            flashcards: [],
            warning:
              "AI configurata ma non è stato possibile generare flashcard affidabili da questo testo. Prova con un PDF più lineare o con appunti senza impaginazione complessa.",
            aiConfigured: hasAnyAI,
            aiErrors: aiErrors.slice(0, 5),
          });
        }
      }

      // Inizializza parametri SM-2 per nuove flashcard
      const sm2Initial = initializeSM2();
      const now = new Date();

      await storage.deleteFlashcardsByMaterialId(userId, materialId);

      const flashcardsToInsert = cleaned.map((f) => ({
        userId,
        concorsoId: material.concorsoId,
        materialId,
        materia: material.materia || "Generale",
        fonte: material.nome,
        fronte: f.fronte,
        retro: `${f.retro}\n\nEvidenza: "${f.evidenza}"`,
        tipo: "concetto",
        easeFactor: sm2Initial.easeFactor,
        intervalloGiorni: sm2Initial.intervalloGiorni,
        numeroRipetizioni: sm2Initial.numeroRipetizioni,
        prossimoRipasso: now,
        prossimRevisione: now,
      }));

      const created = await storage.createFlashcards(flashcardsToInsert);
      await storage.updateMaterial(materialId, userId, {
        flashcardGenerate: created.length
      });

      res.json({ count: created.length, flashcards: created, warning: looseWarning });
    } catch (error) {
      console.error("Error generating flashcards:", error);
      const message = (error as any)?.message || "Errore sconosciuto";
      const looksLikeMissingKey =
        /api key not configured|api key|key not configured/i.test(message);

      res.status(looksLikeMissingKey ? 503 : 500).json({
        error: "Errore nella generazione flashcards",
        details: looksLikeMissingKey
          ? "Funzioni AI non configurate su Vercel (mancano le API key)."
          : message,
      });
    }
  });

  app.patch("/api/flashcards/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;

      // Accetta sia quality che livelloSRS per retrocompatibilità
      // IMPORTANTE: gestire correttamente il caso in cui il valore sia 0
      let quality: number | undefined;

      if (req.body.quality !== undefined) {
        quality = req.body.quality;
      } else if (req.body.livelloSRS !== undefined) {
        quality = req.body.livelloSRS;
      }

      console.log(`[PATCH FLASHCARD] id=${id}, body=${JSON.stringify(req.body)}, quality=${quality}`);

      if (quality === undefined || typeof quality !== "number" || !Number.isInteger(quality)) {
        console.error(`[PATCH FLASHCARD] Valore non valido per quality/livelloSRS: ${quality}`);
        return res.status(400).json({ error: "livelloSRS o quality (numero intero) richiesto" });
      }

      // Valori accettati: 0 (Non Ricordo) o 3 (Facile)
      if (quality !== 0 && quality !== 3) {
        console.error(`[PATCH FLASHCARD] Valore non accettato per quality/livelloSRS: ${quality}`);
        return res.status(400).json({ error: "livelloSRS/quality deve essere 0 (Non Ricordo) o 3 (Facile)" });
      }

      // Ottieni flashcard corrente
      const flashcard = await storage.getFlashcard(id, userId);
      if (!flashcard) {
        return res.status(404).json({ error: "Flashcard non trovata" });
      }

      // Calcola nuovi valori con SM-2 (quality è già 0 o 3)
      const sm2Result = calculateSM2(
        quality,
        flashcard.easeFactor || 2.5,
        flashcard.intervalloGiorni || 0,
        flashcard.numeroRipetizioni || 0
      );

      // Determina se è masterata (almeno 3 ripetizioni consecutive OPPURE se l'utente ha segnato "Facile" (quality=3))
      // Se l'utente segna "Facile", consideriamola masterata per l'interfaccia utente
      const masterate = quality === 3 || sm2Result.numeroRipetizioni >= 3;

      // Aggiorna flashcard
      const updated = await storage.updateFlashcard(id, userId, {
        livelloSRS: quality,
        masterate,
        intervalloGiorni: sm2Result.intervalloGiorni,
        numeroRipetizioni: sm2Result.numeroRipetizioni,
        easeFactor: sm2Result.easeFactor,
        ultimoRipasso: new Date(),
        prossimoRipasso: sm2Result.prossimoRipasso,
        prossimRevisione: sm2Result.prossimoRipasso, // Retrocompatibilità
        tentativiTotali: (flashcard.tentativiTotali || 0) + 1,
        tentativiCorretti: quality === 3
          ? (flashcard.tentativiCorretti || 0) + 1
          : (flashcard.tentativiCorretti || 0)
      });

      if (!updated) {
        return res.status(404).json({ error: "Flashcard non trovata" });
      }

      // Ricalcola count masterate
      if (updated.concorsoId) {
        const allFlashcards = await storage.getFlashcards(userId, updated.concorsoId);
        const flashcardMasterate = allFlashcards.filter(f => f.masterate).length;

        await storage.upsertUserProgress({
          userId,
          concorsoId: updated.concorsoId,
          flashcardMasterate,
          flashcardTotali: allFlashcards.length
        });
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Error updating flashcard:", error);
      res.status(500).json({ error: "Errore aggiornamento flashcard", details: error.message });
    }
  });

  app.delete("/api/flashcards/materia", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { concorsoId, materia } = req.body;

      if (!concorsoId || !materia) {
        return res.status(400).json({ error: "concorsoId e materia richiesti" });
      }

      const count = await storage.deleteFlashcardsByMateria(userId, concorsoId, materia);

      res.json({ success: true, count, message: `${count} flashcard eliminate` });
    } catch (error: any) {
      console.error("Error deleting flashcards by materia:", error);
      res.status(500).json({ error: "Errore nell'eliminazione delle flashcard", details: error.message });
    }
  });

  /**
   * POST /api/flashcards/reset
   * Resetta tutte le flashcard di un concorso (livelloSRS=0, masterate=false, tentativiTotali=0, tentativiCorretti=0)
   * Body: { concorsoId }
   */
  app.post("/api/flashcards/reset", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { concorsoId } = req.body;

      if (!concorsoId) {
        return res.status(400).json({ error: "concorsoId richiesto" });
      }

      // Ottieni tutte le flashcard del concorso
      const allFlashcards = await storage.getFlashcards(userId, concorsoId);

      // Reset di tutte le flashcard (inclusi parametri SM-2)
      const sm2Initial = initializeSM2();
      const resetPromises = allFlashcards.map(flashcard =>
        storage.updateFlashcard(flashcard.id, userId, {
          livelloSRS: 0,
          masterate: false,
          tentativiTotali: 0,
          tentativiCorretti: 0,
          // Reset parametri SM-2
          easeFactor: sm2Initial.easeFactor,
          intervalloGiorni: sm2Initial.intervalloGiorni,
          numeroRipetizioni: sm2Initial.numeroRipetizioni,
          ultimoRipasso: null,
          prossimoRipasso: new Date(),
          prossimRevisione: new Date(),
        })
      );

      await Promise.all(resetPromises);

      // Aggiorna userProgress con i nuovi count (tutti a 0)
      await storage.upsertUserProgress({
        userId,
        concorsoId,
        flashcardMasterate: 0,
        flashcardTotali: allFlashcards.length,
      });

      res.json({
        success: true,
        message: "Flashcard resettate con successo",
        count: allFlashcards.length
      });
    } catch (error: any) {
      console.error("Error resetting flashcards:", error);
      res.status(500).json({ error: "Errore nel reset delle flashcard", details: error.message });
    }
  });

  // Endpoint per spiegazioni AI durante studio flashcard
  // NOTA: Questo endpoint sembra duplicato (vedi sopra riga 136).
  // Manteniamo quello sopra e rimuoviamo questo se necessario, ma per ora lo lascio commentato o rimuovo se identico.
  // Quello sopra era riga 136. Quello qui sotto era riga 1026.
  // Sono identici. Rimuovo il duplicato.

  // Endpoint per analizzare bando da URL (scarica PDF lato server)
  app.post("/api/analyze-bando-from-url", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("[BANDO-URL] === INIZIO ANALISI DA URL ===");

      const { pdfUrl } = req.body;

      if (!pdfUrl || typeof pdfUrl !== 'string') {
        console.log("[BANDO-URL] ERRORE: URL mancante");
        return res.status(400).json({ error: "URL del PDF mancante" });
      }

      console.log("[BANDO-URL] Scaricando PDF da:", pdfUrl);

      // Scarica il PDF dall'URL
      const pdfResponse = await fetch(pdfUrl);
      if (!pdfResponse.ok) {
        console.log("[BANDO-URL] ERRORE: Impossibile scaricare PDF:", pdfResponse.status, pdfResponse.statusText);
        return res.status(400).json({
          error: "Impossibile scaricare il PDF",
          details: `${pdfResponse.status} ${pdfResponse.statusText}`
        });
      }

      const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
      console.log("[BANDO-URL] PDF scaricato:", pdfBuffer.length, "bytes");

      if (pdfBuffer.length === 0) {
        console.log("[BANDO-URL] ERRORE: PDF vuoto");
        return res.status(400).json({ error: "Il PDF scaricato è vuoto" });
      }

      // Estrai testo dal PDF
      let fileContent: string;
      try {
        // Verifica che il buffer sia un PDF valido (inizia con %PDF)
        const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
        console.log(`[BANDO-URL] PDF header check: "${pdfHeader}"`);

        if (!pdfHeader.startsWith('%PDF')) {
          console.log("[BANDO-URL] ERRORE: Il file non è un PDF valido");
          return res.status(400).json({
            error: "Il file scaricato non è un PDF valido",
            details: `Header: ${pdfHeader}`
          });
        }

        fileContent = await extractTextFromPDF(pdfBuffer);
        console.log(`[BANDO-URL] PDF estratto: ${fileContent.length} caratteri`);

        if (!fileContent || fileContent.trim().length < 100) {
          console.log("[BANDO-URL] ERRORE: PDF vuoto o troppo corto, testo estratto:", fileContent?.substring(0, 200));
          return res.status(400).json({
            error: "Il PDF non contiene testo selezionabile. Assicurati che il PDF contenga testo (non sia scansionato).",
            details: `Caratteri estratti: ${fileContent?.length || 0}`
          });
        }
      } catch (pdfError: any) {
        console.error("[BANDO-URL] ERRORE estrazione PDF:", pdfError);
        console.error("[BANDO-URL] Stack:", pdfError.stack);
        return res.status(400).json({
          error: "Errore nell'estrazione del testo dal PDF",
          details: pdfError.message || "Il PDF potrebbe essere protetto, corrotto o non contenere testo estraibile. Sono stati provati: pdf.js, pdf-parse e OCR."
        });
      }

      // Da qui in poi, usa lo stesso codice dell'endpoint analyze-bando
      const systemPrompt = `Sei un esperto analista di bandi di concorsi pubblici italiani. Estrai tutte le informazioni dal bando.

Restituisci SOLO un oggetto JSON valido con questa struttura:
{
  "titoloEnte": "Nome completo dell'ente e titolo del concorso",
  "tipoConcorso": "Tipo (per esami, per titoli ed esami, etc.)",
  "scadenzaDomanda": "DD/MM/YYYY",
  "dataPresuntaEsame": "DD/MM/YYYY o 'Da definire'",
  "posti": numero_posti_totale,
  "profili": [
    {
      "nome": "Nome profilo",
      "posti": numero_posti,
      "titoliStudio": ["Classi di laurea con codici (es. LM-63, L-14)"],
      "altriRequisiti": []
    }
  ],
  "requisiti": [{"titolo": "Requisito", "soddisfatto": null}],
  "prove": {
    "tipo": "Tipo prove",
    "descrizione": "Descrizione",
    "hasPreselettiva": true/false,
    "hasBancaDati": true/false,
    "bancaDatiInfo": "Info banca dati",
    "penalitaErrori": "Valore penalità (es. '-0.25') o null",
    "punteggioRispostaCorretta": "Punteggio risposta corretta o null",
    "punteggioRispostaNonData": "Punteggio risposta non data o null"
  },
  "materie": [
    {
      "nome": "Nome materia",
      "microArgomenti": ["Tutti gli argomenti citati nel bando"],
      "peso": percentuale_o_null,
      "numeroDomande": numero_domande_o_null
    }
  ],
  "passaggiIscrizione": [
    {"step": 1, "descrizione": "Registrazione sul portale INPA", "completato": false, "link": "https://www.inpa.gov.it/#bandi-avvisi"},
    {"step": 2, "descrizione": "Compilazione domanda", "completato": false},
    {"step": 3, "descrizione": "Pagamento tassa", "completato": false},
    {"step": 4, "descrizione": "Allegare documentazione", "completato": false}
  ]
}`;

      const contentToSend = fileContent.substring(0, 100000);
      const userPrompt = `Analizza questo bando di concorso pubblico italiano ed estrai tutte le informazioni richieste:\n\n${contentToSend}`;
      console.log(`[BANDO-URL] Invio ${contentToSend.length} caratteri a AI`);

      let content: string | null = null;
      try {
        console.log("[BANDO-URL] Invio richiesta AI per analisi bando...");
        content = await generateWithFallback({
          task: "generic",
          systemPrompt,
          userPrompt,
          responseMode: "json",
          jsonRoot: "object",
          temperature: 0.2,
        });
        console.log("[BANDO-URL] Risposta AI ricevuta");
      } catch (err: any) {
        console.error("[BANDO-URL] ERRORE generazione AI:", err.message);
        throw err;
      }

      console.log("[BANDO-URL] Parsing risposta...");
      if (!content) {
        console.error("[BANDO-URL] ERRORE: Nessuna risposta dall'AI");
        throw new Error("Nessuna risposta dall'AI. Verifica le chiavi API.");
      }

      let bandoData;
      try {
        bandoData = JSON.parse(content);
        console.log("[BANDO-URL] JSON parsato correttamente");
      } catch (parseError: any) {
        console.error("[BANDO-URL] ERRORE parsing JSON:", parseError.message);
        try {
          if (content.trim().startsWith("{") && !content.trim().endsWith("}")) {
            console.log("[BANDO-URL] Tentativo di fix JSON troncato...");
            const fixedContent = content + "}";
            bandoData = JSON.parse(fixedContent);
            console.log("[BANDO-URL] JSON fixato e parsato!");
          } else {
            throw parseError;
          }
        } catch (retryError) {
          throw new Error(`Errore nel parsing della risposta AI. Il formato non è JSON valido. Dettaglio: ${parseError.message}`);
        }
      }

      // Aggiungi dati calcolati
      if (!bandoData.prove) {
        bandoData.prove = {};
      }

      const mesiPreparazione = 6;
      const oreSettimanali = 15;
      const oggi = new Date();
      const dataEsame = new Date(oggi);
      dataEsame.setMonth(dataEsame.getMonth() + mesiPreparazione);
      const giorniTotali = Math.floor((dataEsame.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
      const oreTotali = Math.floor(giorniTotali / 7) * oreSettimanali;

      const fasi = [
        { nome: "Fase 0: Intelligence & Setup", percentuale: 10 },
        { nome: "Fase 1: Apprendimento Base (SQ3R)", percentuale: 40 },
        { nome: "Fase 2: Consolidamento e Memorizzazione", percentuale: 30 },
        { nome: "Fase 3: Simulazione ad Alta Fedeltà", percentuale: 20 }
      ];

      let giorniUsati = 0;
      const calendarioGenerato = fasi.map((fase) => {
        const giorniFase = Math.floor(giorniTotali * (fase.percentuale / 100));
        const dataInizio = new Date(oggi);
        dataInizio.setDate(dataInizio.getDate() + giorniUsati);
        const dataFine = new Date(dataInizio);
        dataFine.setDate(dataFine.getDate() + giorniFase - 1);
        giorniUsati += giorniFase;

        const formatDate = (d: Date) => {
          const day = d.getDate().toString().padStart(2, '0');
          const month = (d.getMonth() + 1).toString().padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        };

        return {
          fase: fase.nome,
          dataInizio: formatDate(dataInizio),
          dataFine: formatDate(dataFine),
          giorniDisponibili: giorniFase,
          oreStimate: Math.floor(oreTotali * (fase.percentuale / 100))
        };
      });

      bandoData.calendarioInverso = calendarioGenerato;
      bandoData.oreTotaliDisponibili = oreTotali;
      bandoData.giorniTapering = 7;
      bandoData.mesiPreparazione = mesiPreparazione;
      bandoData.oreSettimanali = oreSettimanali;
      bandoData.dataInizioStudio = oggi.toISOString();

      // Calcola pesi materie
      if (bandoData.materie && Array.isArray(bandoData.materie)) {
        const materieConDomande = bandoData.materie.filter((m: any) => m.numeroDomande && m.numeroDomande > 0);
        const totaleDomande = materieConDomande.reduce((sum: number, m: any) => sum + (m.numeroDomande || 0), 0);

        bandoData.materie = bandoData.materie.map((materia: any) => {
          if (materia.numeroDomande && materia.numeroDomande > 0 && totaleDomande > 0) {
            const pesoReale = Math.round((materia.numeroDomande / totaleDomande) * 100 * 10) / 10;
            return { ...materia, peso: pesoReale };
          } else if (!materia.peso || materia.peso === null) {
            const pesoTeorico = Math.round((100 / bandoData.materie.length) * 10) / 10;
            return { ...materia, peso: pesoTeorico };
          }
          return materia;
        });
      }

      // Aggiungi link INPA allo step 1
      if (bandoData.passaggiIscrizione && Array.isArray(bandoData.passaggiIscrizione)) {
        bandoData.passaggiIscrizione = bandoData.passaggiIscrizione.map((passaggio: any) => {
          if (passaggio.step === 1) {
            return { ...passaggio, link: "https://www.inpa.gov.it/#bandi-avvisi" };
          }
          return passaggio;
        });
      }

      console.log(`[BANDO-URL] === ANALISI COMPLETATA: ${bandoData.titoloEnte || 'N/A'} ===`);
      res.json(bandoData);
    } catch (error: any) {
      console.error("[BANDO-URL] === ERRORE GENERALE ===");
      console.error("[BANDO-URL] Messaggio:", error?.message);
      res.status(500).json({
        error: "Errore durante l'analisi del bando",
        details: error.message || "Errore sconosciuto",
        suggestion: "Verifica che il file PDF contenga testo selezionabile e riprova."
      });
    }
  });

  app.post("/api/analyze-bando", isAuthenticated, upload.single("file"), async (req: MulterRequest, res: Response) => {
    try {
      console.log("[BANDO] === INIZIO ANALISI ===");

      // 1. Verifica file
      if (!req.file) {
        console.log("[BANDO] ERRORE: Nessun file");
        return res.status(400).json({ error: "Nessun file caricato" });
      }
      console.log(`[BANDO] File ricevuto: ${req.file.originalname} (${req.file.size} bytes, ${req.file.mimetype})`);

      // 2. Estrai testo dal PDF
      let fileContent: string;
      if (req.file.mimetype === "application/pdf") {
        console.log("[BANDO] Estrazione testo da PDF...");
        try {
          // Leggi il file dal disco (multer usa diskStorage)
          const filePath = join(uploadDir, req.file.filename);
          console.log("[BANDO] Leggendo file da:", filePath);
          console.log("[BANDO] File esiste?", existsSync(filePath));
          if (!existsSync(filePath)) {
            throw new Error(`File non trovato: ${filePath}. Multer potrebbe non aver salvato il file correttamente.`);
          }
          const fileBuffer = readFileSync(filePath);
          console.log("[BANDO] File letto, dimensione buffer:", fileBuffer.length, "bytes");
          if (fileBuffer.length === 0) {
            throw new Error(`File vuoto: ${filePath}. Il file potrebbe non essere stato salvato correttamente.`);
          }
          fileContent = await extractTextFromPDF(fileBuffer);
          console.log(`[BANDO] PDF estratto: ${fileContent.length} caratteri`);
          if (!fileContent || fileContent.trim().length < 100) {
            console.log("[BANDO] ERRORE: PDF vuoto o troppo corto");
            return res.status(400).json({
              error: "Il PDF non contiene testo selezionabile. Assicurati di caricare un PDF con testo (non scansionato)."
            });
          }
        } catch (pdfError: any) {
          console.error("[BANDO] ERRORE estrazione PDF:", pdfError.message);
          console.error("[BANDO] Stack:", pdfError.stack);
          return res.status(400).json({
            error: "Errore nell'estrazione del testo dal PDF",
            details: pdfError.message || "Il PDF potrebbe essere scansionato o corrotto"
          });
        }
      } else {
        console.log("[BANDO] File non PDF, leggendo come testo...");
        // Leggi il file dal disco (multer usa diskStorage)
        const filePath = join(uploadDir, req.file.filename);
        console.log("[BANDO] Leggendo file da:", filePath);
        const fileBuffer = readFileSync(filePath);
        fileContent = fileBuffer.toString("utf-8");
        console.log(`[BANDO] File testo letto: ${fileContent.length} caratteri`);
        if (!fileContent || fileContent.trim().length < 100) {
          console.log("[BANDO] ERRORE: File vuoto");
          return res.status(400).json({ error: "Il file sembra vuoto" });
        }
      }

      const systemPrompt = `Sei un esperto analista di bandi di concorsi pubblici italiani. Estrai tutte le informazioni dal bando.

Restituisci SOLO un oggetto JSON valido con questa struttura:
{
  "titoloEnte": "Nome completo dell'ente e titolo del concorso",
  "tipoConcorso": "Tipo (per esami, per titoli ed esami, etc.)",
  "scadenzaDomanda": "DD/MM/YYYY",
  "dataPresuntaEsame": "DD/MM/YYYY o 'Da definire'",
  "posti": numero_posti_totale,
  "profili": [
    {
      "nome": "Nome profilo",
      "posti": numero_posti,
      "titoliStudio": ["Classi di laurea con codici (es. LM-63, L-14)"],
      "altriRequisiti": []
    }
  ],
  "requisiti": [{"titolo": "Requisito", "soddisfatto": null}],
  "prove": {
    "tipo": "Tipo prove",
    "descrizione": "Descrizione",
    "hasPreselettiva": true/false,
    "hasBancaDati": true/false,
    "bancaDatiInfo": "Info banca dati",
    "penalitaErrori": "Valore penalità (es. '-0.25') o null",
    "punteggioRispostaCorretta": "Punteggio risposta corretta o null",
    "punteggioRispostaNonData": "Punteggio risposta non data o null"
  },
  "materie": [
    {
      "nome": "Nome materia",
      "microArgomenti": ["Tutti gli argomenti citati nel bando"],
      "peso": percentuale_o_null,
      "numeroDomande": numero_domande_o_null
    }
  ],
  "passaggiIscrizione": [
    {"step": 1, "descrizione": "Registrazione sul portale INPA", "completato": false, "link": "https://www.inpa.gov.it/#bandi-avvisi"},
    {"step": 2, "descrizione": "Compilazione domanda", "completato": false},
    {"step": 3, "descrizione": "Pagamento tassa", "completato": false},
    {"step": 4, "descrizione": "Allegare documentazione", "completato": false}
  ]
}`;

      const contentToSend = fileContent.substring(0, 100000);
      const userPrompt = `Analizza questo bando di concorso pubblico italiano ed estrai tutte le informazioni richieste:\n\n${contentToSend}`;
      console.log(`[BANDO] Invio ${contentToSend.length} caratteri a AI`);

      let content: string | null = null;
      try {
        console.log("Invio richiesta AI per analisi bando...");
        content = await generateWithFallback({
          task: "generic",
          systemPrompt,
          userPrompt,
          responseMode: "json",
          jsonRoot: "object",
          temperature: 0.2,
        });
        console.log("Risposta AI ricevuta");
      } catch (err: any) {
        console.error("[BANDO] ERRORE generazione AI:", err.message);
        throw err;
      }

      // 6. Parse risposta
      console.log("[BANDO] Parsing risposta...");
      if (!content) {
        console.error("[BANDO] ERRORE: Nessuna risposta dall'AI");
        throw new Error("Nessuna risposta dall'AI. Verifica le chiavi API.");
      }

      // Log primi 100 caratteri per debug
      console.log(`[BANDO] Contenuto da parsare (primi 100 chars): ${content.substring(0, 100)}...`);

      let bandoData;
      try {
        bandoData = JSON.parse(content);
        console.log("[BANDO] JSON parsato correttamente");
      } catch (parseError: any) {
        console.error("[BANDO] ERRORE parsing JSON:", parseError.message);
        console.error("[BANDO] Contenuto completo che ha causato l'errore:", content);

        // Tentativo di recupero: se il JSON è troncato, prova a chiuderlo (molto basilare)
        try {
          if (content.trim().startsWith("{") && !content.trim().endsWith("}")) {
            console.log("[BANDO] Tentativo di fix JSON troncato...");
            const fixedContent = content + "}";
            bandoData = JSON.parse(fixedContent);
            console.log("[BANDO] JSON fixato e parsato!");
          } else {
            throw parseError;
          }
        } catch (retryError) {
          throw new Error(`Errore nel parsing della risposta AI. Il formato non è JSON valido. Dettaglio: ${parseError.message}`);
        }
      }

      // 7. Aggiungi dati calcolati
      if (!bandoData.prove) {
        bandoData.prove = {};
      }

      const mesiPreparazione = 6;
      const oreSettimanali = 15;
      const oggi = new Date();
      const dataEsame = new Date(oggi);
      dataEsame.setMonth(dataEsame.getMonth() + mesiPreparazione);
      const giorniTotali = Math.floor((dataEsame.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
      const oreTotali = Math.floor(giorniTotali / 7) * oreSettimanali;

      const fasi = [
        { nome: "Fase 1: Intelligence & Setup", percentuale: 10 },
        { nome: "Fase 2: Acquisizione Strategica", percentuale: 40 },
        { nome: "Fase 3: Consolidamento e Memorizzazione", percentuale: 30 },
        { nome: "Fase 4: Simulazione ad Alta Fedeltà", percentuale: 20 }
      ];

      let giorniUsati = 0;
      const calendarioGenerato = fasi.map((fase) => {
        const giorniFase = Math.floor(giorniTotali * (fase.percentuale / 100));
        const dataInizio = new Date(oggi);
        dataInizio.setDate(dataInizio.getDate() + giorniUsati);
        const dataFine = new Date(dataInizio);
        dataFine.setDate(dataFine.getDate() + giorniFase - 1);
        giorniUsati += giorniFase;

        const formatDate = (d: Date) => {
          const day = d.getDate().toString().padStart(2, '0');
          const month = (d.getMonth() + 1).toString().padStart(2, '0');
          const year = d.getFullYear();
          return `${day}/${month}/${year}`;
        };

        return {
          fase: fase.nome,
          dataInizio: formatDate(dataInizio),
          dataFine: formatDate(dataFine),
          giorniDisponibili: giorniFase,
          oreStimate: Math.floor(oreTotali * (fase.percentuale / 100))
        };
      });

      bandoData.calendarioInverso = calendarioGenerato;
      bandoData.oreTotaliDisponibili = oreTotali;
      bandoData.giorniTapering = 7;
      bandoData.mesiPreparazione = mesiPreparazione;
      bandoData.oreSettimanali = oreSettimanali;
      bandoData.dataInizioStudio = oggi.toISOString();

      // Calcola automaticamente il peso % delle materie in base al numero di domande
      if (bandoData.materie && Array.isArray(bandoData.materie)) {
        const materieConDomande = bandoData.materie.filter((m: any) => m.numeroDomande && m.numeroDomande > 0);
        const totaleDomande = materieConDomande.reduce((sum: number, m: any) => sum + (m.numeroDomande || 0), 0);

        bandoData.materie = bandoData.materie.map((materia: any) => {
          if (materia.numeroDomande && materia.numeroDomande > 0 && totaleDomande > 0) {
            // Calcola peso reale in base al numero di domande
            const pesoReale = Math.round((materia.numeroDomande / totaleDomande) * 100 * 10) / 10;
            return { ...materia, peso: pesoReale };
          } else if (!materia.peso || materia.peso === null) {
            // Se non c'è numero di domande e non c'è peso, calcola peso teorico (equidistribuito)
            const pesoTeorico = Math.round((100 / bandoData.materie.length) * 10) / 10;
            return { ...materia, peso: pesoTeorico };
          }
          return materia;
        });

        console.log("[BANDO] Pesi materie calcolati:", bandoData.materie.map((m: any) => `${m.nome}: ${m.peso}%`));
      }

      // Aggiungi link INPA allo step 1 se non presente
      if (bandoData.passaggiIscrizione && Array.isArray(bandoData.passaggiIscrizione)) {
        bandoData.passaggiIscrizione = bandoData.passaggiIscrizione.map((passaggio: any) => {
          if (passaggio.step === 1) {
            return {
              ...passaggio,
              link: "https://www.inpa.gov.it/#bandi-avvisi"
            };
          }
          return passaggio;
        });
      }

      // 8. Rispondi
      console.log(`[BANDO] === ANALISI COMPLETATA: ${bandoData.titoloEnte || 'N/A'} ===`);
      res.json(bandoData);
    } catch (error: any) {
      console.error("[BANDO] === ERRORE GENERALE ===");
      console.error("[BANDO] Tipo:", typeof error);
      console.error("[BANDO] Nome:", error?.name);
      console.error("[BANDO] Messaggio:", error?.message);
      console.error("[BANDO] Stack:", error?.stack);
      res.status(500).json({
        error: "Errore durante l'analisi del bando",
        details: error.message || "Errore sconosciuto",
        suggestion: "Verifica che il file PDF contenga testo selezionabile e riprova."
      });
    }
  });

  app.post("/api/quiz/generate-from-file", isAuthenticated, upload.single("file"), async (req: MulterRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      console.log("[QUIZ-GEN] === INIZIO GENERAZIONE DA FILE ===");

      if (!req.file) {
        return res.status(400).json({ error: "Nessun file caricato" });
      }

      // 1. Estrai testo
      let fileContent: string;
      if (req.file.mimetype === "application/pdf") {
        try {
          const filePath = join(uploadDir, req.file.filename);
          const fileBuffer = readFileSync(filePath);
          fileContent = await extractTextFromPDF(fileBuffer);
        } catch (pdfError: any) {
          console.error("[QUIZ-GEN] Errore estrazione PDF:", pdfError);
          return res.status(500).json({ error: "Errore lettura PDF" });
        }
      } else {
        // Fallback per file testo se necessario
        const filePath = join(uploadDir, req.file.filename);
        fileContent = readFileSync(filePath, "utf-8");
      }

      if (!fileContent || fileContent.trim().length < 100) {
        return res.status(400).json({ error: "Testo insufficiente nel file" });
      }

      // 2. Prepara prompt per AI
      const contentToAnalyze = fileContent.substring(0, 50000); // Limite caratteri
      const systemPrompt = `Sei un professore esperto che crea quiz di verifica.
Il tuo compito è generare un quiz a risposta multipla basato ESCLUSIVAMENTE sul testo fornito dall'utente.
Non inventare domande su argomenti non presenti nel testo.
Se il testo è troppo breve per 15 domande, generane quante possibile (minimo 5).

FORMATO OUTPUT RICHIESTO (JSON array):
[
  {
    "question": "Domanda basata sul testo?",
    "options": ["Opzione A (errata)", "Opzione B (corretta)", "Opzione C (errata)", "Opzione D (errata)"],
    "correctAnswer": 1
  }
]
Nota: correctAnswer è l'indice (0-3) della risposta corretta nell'array options.
IMPORTANTE: Restituisci SOLO il JSON puro, senza blocchi markdown (es. \`\`\`json) e senza testo introduttivo.`;

      const userPrompt = `Genera un quiz di 15 domande basato su questo testo:\n\n${contentToAnalyze}`;

      // 3. Chiamata AI (Gemini -> Vercel -> OpenAI)
      let questionsJson = "[]";
      try {
        console.log("[QUIZ-GEN] Invio richiesta AI...");
        questionsJson = await generateWithFallback({
          task: "quiz_generate",
          systemPrompt,
          userPrompt,
          responseMode: "json",
          jsonRoot: "array",
          temperature: 0.3,
        });
      } catch (err: any) {
        console.error("[QUIZ-GEN] ERRORE AI:", err.message);
        // Lascia questionsJson come "[]" per gestire l'errore nel parsing
      }

      // 4. Parse e Risposta
      let questions = [];
      try {
        const parsed = JSON.parse(questionsJson);
        // Gestisci caso in cui l'AI restituisca un oggetto { "questions": [...] } invece di array diretto
        questions = Array.isArray(parsed) ? parsed : (parsed.questions || []);
      } catch (e) {
        console.error("[QUIZ-GEN] Errore parsing JSON AI:", e);
        return res.status(500).json({ error: "Errore nella generazione delle domande (formato non valido)" });
      }

      console.log(`[QUIZ-GEN] Generate ${questions.length} domande`);
      res.json({ questions });

    } catch (error: any) {
      console.error("[QUIZ-GEN] Errore generale:", error);
      res.status(500).json({ error: "Errore del server durante la generazione" });
    }
  });

  app.post("/api/phase1/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { concorsoId, ...bandoData } = req.body;

      let concorso: Concorso;

      if (concorsoId) {
        // Aggiorna concorso esistente
        console.log("Updating existing concorso:", concorsoId);
        const updated = await storage.updateConcorso(concorsoId, userId, {
          nome: bandoData.titoloEnte || "Nuovo Concorso",
          titoloEnte: bandoData.titoloEnte,
          tipoConcorso: bandoData.tipoConcorso,
          posti: bandoData.posti,
          scadenzaDomanda: bandoData.scadenzaDomanda,
          dataPresuntaEsame: bandoData.dataPresuntaEsame,
          mesiPreparazione: bandoData.mesiPreparazione || 6,
          oreSettimanali: bandoData.oreSettimanali || 15,
          bandoAnalysis: bandoData,
        });

        if (!updated) {
          return res.status(404).json({ error: "Concorso non trovato o non autorizzato" });
        }

        concorso = updated;
        console.log("Phase 1 completed, concorso updated:", concorso.id);
      } else {
        // Crea nuovo concorso (retrocompatibilità)
        console.log("Creating new concorso");
        concorso = await storage.createConcorso({
          userId,
          nome: bandoData.titoloEnte || "Nuovo Concorso",
          titoloEnte: bandoData.titoloEnte,
          tipoConcorso: bandoData.tipoConcorso,
          posti: bandoData.posti,
          scadenzaDomanda: bandoData.scadenzaDomanda,
          dataPresuntaEsame: bandoData.dataPresuntaEsame,
          mesiPreparazione: bandoData.mesiPreparazione || 6,
          oreSettimanali: bandoData.oreSettimanali || 15,
          bandoAnalysis: bandoData,
        });
        console.log("Phase 1 completed, concorso created:", concorso.id);
      }

      await storage.upsertUserProgress({
        userId,
        concorsoId: concorso.id,
        fase1Completata: true,
        faseCorrente: 2,
      });

      res.json({ success: true, concorsoId: concorso.id, message: "Fase 1 completata" });
    } catch (error: any) {
      console.error("Error completing phase 1:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Errore nel completamento della fase 1",
        details: error.message
      });
    }
  });

  // ============================================
  // API ENDPOINTS PER SIMULAZIONI D'ESAME
  // ============================================

  /**
   * POST /api/simulazioni
   * Crea una nuova simulazione d'esame
   * Body: { concorsoId, numeroDomande, durataMinuti, tipoSimulazione, materieFiltrate }
   */
  app.post("/api/simulazioni", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("POST /api/simulazioni - Request body:", req.body);
      const userId = getUserId(req);
      console.log("POST /api/simulazioni - UserId:", userId);

      if (!userId) {
        console.error("getUserId returned undefined. req.user:", req.user);
        return res.status(401).json({ error: "Utente non autenticato" });
      }

      const { concorsoId, numeroDomande = 40, durataMinuti = 60, tipoSimulazione = "completa", materieFiltrate = [] } = req.body;

      console.log("POST /api/simulazioni - Creating simulazione with:", {
        concorsoId,
        numeroDomande,
        durataMinuti,
        tipoSimulazione,
        materieFiltrate,
      });

      if (!concorsoId) {
        return res.status(400).json({ error: "concorsoId è obbligatorio" });
      }

      // Verifica che il concorso esista e appartenga all'utente
      const concorso = await storage.getConcorso(concorsoId, userId);
      if (!concorso) {
        return res.status(404).json({ error: "Concorso non trovato" });
      }

      // Recupera tutte le flashcards del concorso
      let flashcards = await storage.getFlashcards(userId, concorsoId);

      if (flashcards.length === 0) {
        return res.status(400).json({ error: "Nessuna flashcard disponibile per questo concorso" });
      }

      // Filtra per materie se specificate
      if (Array.isArray(materieFiltrate) && materieFiltrate.length > 0) {
        flashcards = flashcards.filter(fc => materieFiltrate.includes(fc.materia));
        if (flashcards.length === 0) {
          return res.status(400).json({ error: "Nessuna flashcard disponibile per le materie selezionate" });
        }
      }

      // Verifica che ci siano abbastanza flashcards
      if (flashcards.length < 4) {
        return res.status(400).json({
          error: `Non ci sono abbastanza flashcards per generare una simulazione. Minimo richiesto: 4. Disponibili: ${flashcards.length}`
        });
      }

      // Se non ci sono abbastanza flashcards per il numero richiesto, usa tutte quelle disponibili
      if (flashcards.length < numeroDomande) {
        console.log(`[SIMULAZIONE] Richieste ${numeroDomande} domande, ma disponibili solo ${flashcards.length}. Adatto il numero.`);
        // Non modifichiamo la variabile const numeroDomande, ma useremo flashcards.length per il slice
      }

      const numeroDomandeEffettivo = Math.min(numeroDomande, flashcards.length);

      // Seleziona flashcards random
      const flashcardsSelezionate = flashcards
        .sort(() => Math.random() - 0.5)
        .slice(0, numeroDomandeEffettivo);

      // Crea le domande della simulazione
      // Per ogni flashcard, creiamo una domanda a scelta multipla con 4 opzioni
      // La risposta corretta è il retro della flashcard
      // Generiamo 3 risposte sbagliate casuali dalle altre flashcards
      const domandeERisposte: DomandaSimulazione[] = flashcardsSelezionate.map((flashcard, index) => {
        // Trova altre flashcards per generare risposte sbagliate
        const altreFlashcards = flashcards.filter(fc => fc.id !== flashcard.id);

        // Se abbiamo meno di 3 altre flashcards, prendiamo tutte quelle disponibili e duplichiamo se necessario
        let risposteSbagliateCandidates = altreFlashcards.sort(() => Math.random() - 0.5);

        // Assicurati di avere sempre 3 risposte sbagliate
        let risposteSbagliate: string[] = [];
        if (risposteSbagliateCandidates.length >= 3) {
          risposteSbagliate = risposteSbagliateCandidates.slice(0, 3).map(fc => fc.retro);
        } else {
          // Se non abbiamo abbastanza candidate uniche, riusiamo quelle che abbiamo
          // Questo caso limite accade solo se abbiamo < 4 flashcards totali, che abbiamo già bloccato sopra
          // Ma per sicurezza:
          const disponibili = risposteSbagliateCandidates.map(fc => fc.retro);
          while (risposteSbagliate.length < 3) {
            risposteSbagliate.push(...disponibili);
            if (risposteSbagliate.length < 3 && disponibili.length === 0) {
              // Fallback estremo se non ci sono altre flashcards
              risposteSbagliate.push("Risposta errata " + (risposteSbagliate.length + 1));
            }
          }
          risposteSbagliate = risposteSbagliate.slice(0, 3);
        }

        // Crea array di 4 opzioni: una corretta + 3 sbagliate
        const opzioni = [flashcard.retro, ...risposteSbagliate]
          .sort(() => Math.random() - 0.5);

        // Trova l'indice della risposta corretta
        const rispostaCorrettaIndex = opzioni.indexOf(flashcard.retro);
        const rispostaCorretta = String.fromCharCode(65 + rispostaCorrettaIndex); // A, B, C, D

        return {
          flashcardId: flashcard.id,
          domanda: flashcard.fronte,
          opzioni: opzioni,
          rispostaCorretta: rispostaCorretta,
          materia: flashcard.materia,
        };
      });

      // Crea la simulazione
      const nuovaSimulazione: InsertSimulazione = {
        userId,
        concorsoId,
        numeroDomande: numeroDomandeEffettivo,
        durataMinuti,
        tipoSimulazione,
        materieFiltrate: Array.isArray(materieFiltrate) ? materieFiltrate : [],
        completata: false,
        domandeERisposte: domandeERisposte as any,
        dataInizio: new Date(),
      };

      const simulazione = await simulazioniStorage.createSimulazione(nuovaSimulazione);
      console.log("POST /api/simulazioni - Simulazione creata con successo:", simulazione.id);

      res.status(201).json(simulazione);
    } catch (error: any) {
      console.error("Error creating simulazione:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Errore nella creazione della simulazione",
        message: error.message || "Errore sconosciuto"
      });
    }
  });

  /**
   * GET /api/simulazioni?concorsoId=X
   * Recupera tutte le simulazioni dell'utente, opzionalmente filtrate per concorso
   */
  app.get("/api/simulazioni", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const concorsoId = req.query.concorsoId as string | undefined;
      console.log("GET /api/simulazioni - UserId:", userId, "ConcorsoId:", concorsoId);

      const simulazioni = await simulazioniStorage.getSimulazioni(userId, concorsoId);
      console.log("GET /api/simulazioni - Found", simulazioni.length, "simulazioni");
      res.json(simulazioni);
    } catch (error: any) {
      console.error("Error fetching simulazioni:", error);
      console.error("Error stack:", error?.stack);
      res.status(500).json({
        error: "Errore nel recupero delle simulazioni",
        details: error?.message || "Errore sconosciuto"
      });
    }
  });

  /**
   * GET /api/simulazioni/:id
   * Recupera i dettagli di una simulazione specifica
   */
  app.get("/api/simulazioni/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const simulazione = await simulazioniStorage.getSimulazione(req.params.id, userId);

      if (!simulazione) {
        return res.status(404).json({ error: "Simulazione non trovata" });
      }

      res.json(simulazione);
    } catch (error) {
      console.error("Error fetching simulazione:", error);
      res.status(500).json({ error: "Errore nel recupero della simulazione" });
    }
  });

  /**
   * PATCH /api/simulazioni/:id/complete
   * Completa una simulazione e calcola i risultati
   * Body: { domandeERisposte, tempoTrascorsoSecondi }
   */
  app.patch("/api/simulazioni/:id/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { domandeERisposte, tempoTrascorsoSecondi } = req.body;

      // Recupera la simulazione
      const simulazione = await simulazioniStorage.getSimulazione(req.params.id, userId);
      if (!simulazione) {
        return res.status(404).json({ error: "Simulazione non trovata" });
      }

      if (simulazione.completata) {
        return res.status(400).json({ error: "Simulazione già completata" });
      }

      // Recupera il concorso per ottenere bandoAnalysis e calcolare penalità
      const concorso = await storage.getConcorso(simulazione.concorsoId, userId);
      if (!concorso) {
        return res.status(404).json({ error: "Concorso non trovato" });
      }

      const bandoAnalysis = concorso.bandoAnalysis as any;
      const materie = bandoAnalysis?.materie || [];

      // Calcola statistiche
      let corrette = 0;
      let errate = 0;
      let nonDate = 0;
      const dettagliPerMateria: Record<string, DettagliMateria> = {};

      // Inizializza dettagli per materia
      materie.forEach((materia: any) => {
        dettagliPerMateria[materia.nome] = {
          corrette: 0,
          errate: 0,
          nonDate: 0,
          punteggio: 0,
          percentuale: 0,
        };
      });

      // Processa ogni domanda
      const domandeAggiornate = (domandeERisposte || simulazione.domandeERisposte as DomandaSimulazione[]).map((domanda: any) => {
        const materia = domanda.materia || "Generale";

        if (!dettagliPerMateria[materia]) {
          dettagliPerMateria[materia] = {
            corrette: 0,
            errate: 0,
            nonDate: 0,
            punteggio: 0,
            percentuale: 0,
          };
        }

        if (!domanda.rispostaUtente || domanda.rispostaUtente.trim() === "") {
          nonDate++;
          dettagliPerMateria[materia].nonDate++;
          return domanda;
        }

        const corretta = domanda.rispostaUtente.toUpperCase() === domanda.rispostaCorretta.toUpperCase();

        if (corretta) {
          corrette++;
          dettagliPerMateria[materia].corrette++;
        } else {
          errate++;
          dettagliPerMateria[materia].errate++;
        }

        return { ...domanda, rispostaUtente: domanda.rispostaUtente };
      });

      // Calcola punteggio con penalità
      // Formula: (corrette / totale) * 100 - (errate * penalità)
      const totale = domandeAggiornate.length;
      const percentualeCorrette = totale > 0 ? (corrette / totale) * 100 : 0;

      // Calcola penalità per materia basata sui pesi nel bandoAnalysis
      let punteggioFinale = percentualeCorrette;

      materie.forEach((materia: any) => {
        const dettagli = dettagliPerMateria[materia.nome];
        if (dettagli) {
          const totaleMateria = dettagli.corrette + dettagli.errate + dettagli.nonDate;
          if (totaleMateria > 0) {
            dettagli.percentuale = (dettagli.corrette / totaleMateria) * 100;
            // Penalità: ogni errore riduce il punteggio proporzionalmente al peso della materia
            const peso = materia.peso || 0;
            const penalitaPerErrore = peso * 0.5; // 0.5 punti di penalità per ogni errore, moltiplicato per il peso
            dettagli.punteggio = dettagli.percentuale - (dettagli.errate * penalitaPerErrore);
          }
        }
      });

      // Penalità globale: ogni errore riduce il punteggio di 0.25 punti
      const penalitaGlobale = errate * 0.25;
      punteggioFinale = Math.max(0, punteggioFinale - penalitaGlobale);

      // Aggiorna la simulazione
      const simulazioneAggiornata = await simulazioniStorage.updateSimulazione(
        req.params.id,
        userId,
        {
          completata: true,
          punteggio: punteggioFinale,
          percentualeCorrette,
          tempoTrascorsoSecondi: tempoTrascorsoSecondi || null,
          dettagliPerMateria: dettagliPerMateria as any,
          domandeERisposte: domandeAggiornate as any,
          dataCompletamento: new Date(),
        }
      );

      res.json(simulazioneAggiornata);
    } catch (error) {
      console.error("Error completing simulazione:", error);
      res.status(500).json({ error: "Errore nel completamento della simulazione" });
    }
  });

  /**
   * PATCH /api/simulazioni/:id
   * Aggiorna una simulazione (per salvare risposte durante l'esame)
   * Body: { domandeERisposte }
   */
  app.patch("/api/simulazioni/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { domandeERisposte } = req.body;

      const simulazione = await simulazioniStorage.updateSimulazione(
        req.params.id,
        userId,
        {
          domandeERisposte: domandeERisposte as any,
        }
      );

      if (!simulazione) {
        return res.status(404).json({ error: "Simulazione non trovata" });
      }

      res.json(simulazione);
    } catch (error) {
      console.error("Error updating simulazione:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento della simulazione" });
    }
  });

  /**
   * DELETE /api/simulazioni/:id
   * Elimina una simulazione
   */
  app.delete("/api/simulazioni/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const deleted = await simulazioniStorage.deleteSimulazione(req.params.id, userId);

      if (!deleted) {
        return res.status(404).json({ error: "Simulazione non trovata" });
      }

      res.json({ success: true, message: "Simulazione eliminata" });
    } catch (error) {
      console.error("Error deleting simulazione:", error);
      res.status(500).json({ error: "Errore nell'eliminazione della simulazione" });
    }
  });

  /**
   * POST /api/specialista/spiega
   * Chiedi spiegazione di un concetto allo specialista AI
   */

  // Rate limiting in-memory per utente
  const rateLimitMap = new Map<string, number>();

  function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const lastRequest = rateLimitMap.get(userId) || 0;

    if (now - lastRequest < 3000) {
      return false; // Troppo veloce (meno di 3 secondi)
    }

    rateLimitMap.set(userId, now);
    return true;
  }

  app.post("/api/specialista/spiega", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { concetto, concorsoId } = req.body;

      if (!concetto || typeof concetto !== 'string' || concetto.trim().length < 5) {
        return res.status(400).json({ error: "Concetto troppo breve (minimo 5 caratteri)" });
      }

      if (!concorsoId) {
        return res.status(400).json({ error: "concorsoId richiesto" });
      }

      // Rate limiting
      if (!checkRateLimit(userId)) {
        return res.status(429).json({ error: "Aspetta 3 secondi prima della prossima domanda" });
      }

      // Ottieni contesto del concorso (materie, tipo concorso)
      const concorso = await storage.getConcorso(concorsoId, userId);
      if (!concorso) {
        return res.status(404).json({ error: "Concorso non trovato" });
      }

      const bandoAnalysis = concorso.bandoAnalysis as any;
      const materieConcorso = bandoAnalysis?.materie?.map((m: any) => m.nome).join(', ') || 'materie del concorso';

      console.log("[SPECIALISTA] Richiesta spiegazione per:", concetto.substring(0, 100));

      // SYSTEM HYBRID: Use Gemini -> Vercel -> OpenAI
      let spiegazione: string | null = null;

      const systemPrompt = `Sei uno specialista esperto in concorsi pubblici italiani, con focus su: ${materieConcorso}.

Il tuo compito è spiegare concetti in modo CHIARO, SEMPLICE e DIRETTO.

REGOLE:
1. Usa un linguaggio accessibile, come se parlassi a uno studente
2. Struttura la spiegazione in modo logico:
   - Definizione semplice (1-2 frasi)
   - Spiegazione più dettagliata
   - Esempio pratico quando possibile
   - Perché è importante per il concorso
3. Massimo 200 parole
4. NON usare gergo tecnico senza spiegarlo
5. Se è una legge/articolo, spiega cosa significa nella pratica
6. Evidenzia concetti chiave con emoji (📌 ✅ ⚠️)

IMPORTANTE: Fornisci UNA SOLA spiegazione completa e definitiva. Non dire "fammi sapere se hai altre domande".`;

      try {
        const userPrompt = `Spiega questo concetto: ${concetto}`;
        spiegazione = await generateWithFallback({
          task: "concept_explain",
          systemPrompt,
          userPrompt,
          temperature: 0.7,
          responseMode: "text",
        });
      } catch (err: any) {
        console.error("Errore generazione spiegazione:", err.message);
        throw new Error(`Errore generazione AI: ${err.message}`);
      }

      if (!spiegazione) {
        throw new Error("Nessuna spiegazione ricevuta");
      }

      console.log("[SPECIALISTA] Spiegazione generata:", spiegazione.substring(0, 100));

      res.json({ spiegazione });

    } catch (error: any) {
      console.error("[SPECIALISTA] Errore:", error?.message || error);

      // Gestisci errori specifici di OpenAI
      if (error?.response?.status === 429) {
        return res.status(429).json({
          error: "Troppe richieste. Riprova tra qualche minuto.",
          details: error?.message
        });
      }

      if (error?.response?.status === 401) {
        return res.status(500).json({
          error: "Errore di configurazione AI",
          details: "Chiave API non valida"
        });
      }

      res.status(500).json({
        error: "Errore nel generare la spiegazione",
        details: error?.message
      });
    }
  });

  // Endpoint per statistiche aggregate dell'utente
  app.get("/api/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);

      // 1. Ottieni progressi generali
      let progress;
      try {
        progress = await storage.getUserProgress(userId);
      } catch (err) {
        console.error("Error fetching user progress:", err);
        progress = null;
      }

      // 2. Ottieni ultime simulazioni completate
      let completedSimulations: Simulazione[] = [];
      try {
        const recentSimulations = await simulazioniStorage.getSimulazioni(userId);
        completedSimulations = recentSimulations
          .filter(s => s.completata)
          .sort((a, b) => new Date(b.dataCompletamento || 0).getTime() - new Date(a.dataCompletamento || 0).getTime())
          .slice(0, 10);
      } catch (err) {
        console.error("Error fetching simulations:", err);
      }


      // 3. Calcola precisione media
      let averageAccuracy = 0;
      if (completedSimulations.length > 0) {
        const totalAccuracy = completedSimulations.reduce((sum, sim) => sum + (sim.percentualeCorrette || 0), 0);
        averageAccuracy = Math.round(totalAccuracy / completedSimulations.length);
      }

      // 4. Formatta cronologia quiz
      const quizHistory = completedSimulations.map(sim => {
        // Cerca di ottenere il titolo del concorso se possibile, altrimenti usa ID o tipo
        // Nota: Idealmente dovremmo fare una join o una query separata per i nomi dei concorsi
        // Per ora usiamo il tipo simulazione o "Simulazione"
        return {
          id: sim.id,
          title: sim.tipoSimulazione === "completa" ? "Simulazione Completa" :
            sim.tipoSimulazione === "materia" ? "Test Materia" : "Allenamento",
          score: Math.round(sim.percentualeCorrette || 0),
          questions: sim.numeroDomande,
          date: sim.dataCompletamento ? new Date(sim.dataCompletamento).toLocaleDateString('it-IT') : "N/A"
        };
      });

      // 5. Mock dati andamento settimanale (non abbiamo ancora tracking giornaliero)
      // In futuro implementare tabella daily_stats
      const weeklyTrend = [
        { day: "Lun", hours: 0 },
        { day: "Mar", hours: 0 },
        { day: "Mer", hours: 0 },
        { day: "Gio", hours: 0 },
        { day: "Ven", hours: 0 },
        { day: "Sab", hours: 0 },
        { day: "Dom", hours: 0 },
      ];

      res.json({
        studyTime: progress?.oreStudioTotali || 0,
        flashcardsMastered: progress?.flashcardMasterate || 0,
        quizCompleted: progress?.quizCompletati || completedSimulations.length,
        averageAccuracy,
        quizHistory,
        weeklyTrend
      });

    } catch (error: any) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Errore nel recupero statistiche", details: error.message });
    }
  });

  // Registra routes SQ3R
  // registerSQ3RRoutes(app); - Spostato sopra

  // Registra routes Libreria Pubblica 
  // registerLibreriaRoutes(app); - Spostato sopra

  // ============================================
  // API ENDPOINTS PER CALENDAR EVENTS
  // ============================================

  app.get("/api/calendar/events", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const events = await storage.getCalendarEvents(userId);
      res.json(events);
    } catch (error: any) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: "Errore nel recupero eventi calendario" });
    }
  });

  app.post("/api/calendar/events", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "Utente non autenticato" });
      }

      console.log("[CALENDAR] POST /events - Body:", req.body);

      // Ensure date is parsed correctly if sent as string
      const data = {
        ...req.body,
        userId,
        date: new Date(req.body.date),
        // Se concorsoId è stringa vuota o undefined, impostalo a null o undefined
        concorsoId: req.body.concorsoId || undefined,
        // Assicurati che description sia stringa o undefined (no null se schema non lo vuole, anche se DB lo accetta)
        description: req.body.description || undefined
      };

      console.log("[CALENDAR] Validating data:", data);

      const validated = insertCalendarEventSchema.parse(data);
      console.log("[CALENDAR] Validation successful");

      const event = await storage.createCalendarEvent(validated);
      console.log("[CALENDAR] Event created:", event.id);

      res.status(201).json(event);
    } catch (error: any) {
      console.error("Error creating calendar event:", error);
      if (error.name === "ZodError") {
        console.error("Zod Validation Errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ error: "Dati non validi", details: error.errors });
      }
      res.status(400).json({ error: error.message || "Errore creazione evento" });
    }
  });

  app.patch("/api/calendar/events/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const data = { ...req.body };
      if (data.date) {
        data.date = new Date(data.date);
      }

      const updated = await storage.updateCalendarEvent(req.params.id, userId, data);
      if (!updated) {
        return res.status(404).json({ error: "Evento non trovato" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ error: "Errore aggiornamento evento" });
    }
  });

  app.delete("/api/calendar/events/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const deleted = await storage.deleteCalendarEvent(req.params.id, userId);
      if (!deleted) {
        return res.status(404).json({ error: "Evento non trovato" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ error: "Errore eliminazione evento" });
    }
  });

  console.log('✅ Tutte le routes registrate');

  return httpServer;
}
