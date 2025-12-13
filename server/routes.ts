import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertConcorsoSchema, insertMaterialSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import multer from "multer";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const upload = multer({ storage: multer.memoryStorage() });

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = new Uint8Array(buffer);
  const loadingTask = getDocument({ data });
  const pdfDocument = await loadingTask.promise;
  
  let fullText = "";
  
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }
  
  return fullText;
}

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

function getUserId(req: Request): string {
  const user = req.user as any;
  return user?.claims?.sub;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);

  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Errore nel recupero utente" });
    }
  });

  app.get("/api/concorsi", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const concorsi = await storage.getConcorsi(userId);
      res.json(concorsi);
    } catch (error) {
      console.error("Error fetching concorsi:", error);
      res.status(500).json({ error: "Errore nel recupero concorsi" });
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

  app.post("/api/concorsi", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const data = { ...req.body, userId };
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

  app.post("/api/upload-material", isAuthenticated, upload.single("file"), async (req: MulterRequest, res: Response) => {
    try {
      const userId = getUserId(req);
      const concorsoId = req.body.concorsoId;
      const materia = req.body.materia || "Generale";
      
      if (!req.file || !concorsoId) {
        return res.status(400).json({ error: "File e concorsoId richiesti" });
      }

      const concorso = await storage.getConcorso(concorsoId, userId);
      if (!concorso) {
        return res.status(403).json({ error: "Concorso non trovato o non autorizzato" });
      }

      let contenuto: string;
      if (req.file.mimetype === "application/pdf") {
        contenuto = await extractTextFromPDF(req.file.buffer);
      } else {
        contenuto = req.file.buffer.toString("utf-8");
      }

      const material = await storage.createMaterial({
        userId,
        concorsoId,
        nome: req.file.originalname,
        tipo: "pdf",
        materia,
        contenuto,
        estratto: true,
      });

      res.status(201).json(material);
    } catch (error) {
      console.error("Error uploading material:", error);
      res.status(500).json({ error: "Errore nel caricamento materiale" });
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

      const concorso = await storage.getConcorso(material.concorsoId, userId);
      if (!concorso) {
        return res.status(403).json({ error: "Concorso non autorizzato" });
      }

      const openai = getOpenAIClient();
      const contentToAnalyze = material.contenuto.substring(0, 30000);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Sei un esperto creatore di flashcard per la preparazione ai concorsi pubblici italiani. 
Genera ALMENO 50 flashcard diverse dal testo fornito. Crea domande precise e risposte concise che coprono tutti i concetti importanti.

ISTRUZIONI:
- Genera il maggior numero possibile di flashcard (minimo 50, idealmente 60-80)
- Copri TUTTI i concetti chiave, definizioni, articoli di legge, date, numeri
- Varia i tipi di domande: definizioni, applicazioni, confronti, casi pratici
- Ogni flashcard deve essere unica e non ripetitiva

Restituisci SOLO un array JSON di flashcard:
[
  {"fronte": "Domanda?", "retro": "Risposta"},
  ...
]`
          },
          { role: "user", content: contentToAnalyze }
        ],
        temperature: 0.4,
        max_tokens: 16000,
      });

      const content = response.choices[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const flashcardsData = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

      const flashcardsToInsert = flashcardsData.map((f: any) => ({
        userId,
        concorsoId: material.concorsoId,
        materia: material.materia || "Generale",
        fonte: material.nome,
        fronte: f.fronte,
        retro: f.retro,
        tipo: "concetto",
      }));

      const created = await storage.createFlashcards(flashcardsToInsert);
      await storage.updateMaterial(materialId, userId, { 
        flashcardGenerate: created.length 
      });

      res.json({ count: created.length, flashcards: created });
    } catch (error) {
      console.error("Error generating flashcards:", error);
      res.status(500).json({ error: "Errore nella generazione flashcards" });
    }
  });

  app.patch("/api/flashcards/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { livelloSRS } = req.body;
      
      if (livelloSRS === undefined || typeof livelloSRS !== "number" || !Number.isInteger(livelloSRS)) {
        return res.status(400).json({ error: "livelloSRS (numero intero) richiesto" });
      }
      
      const updated = await storage.updateFlashcard(req.params.id, userId, { livelloSRS });
      if (!updated) {
        return res.status(404).json({ error: "Flashcard non trovata" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating flashcard:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento flashcard" });
    }
  });

  app.post("/api/analyze-bando", isAuthenticated, upload.single("file"), async (req: MulterRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nessun file caricato" });
      }

      const openai = getOpenAIClient();
      
      let fileContent: string;
      
      if (req.file.mimetype === "application/pdf") {
        console.log("Parsing PDF file...");
        fileContent = await extractTextFromPDF(req.file.buffer);
        console.log(`PDF parsed: ${fileContent.length} characters extracted`);
      } else {
        fileContent = req.file.buffer.toString("utf-8");
      }
      
      if (!fileContent || fileContent.trim().length < 100) {
        return res.status(400).json({ 
          error: "Il file sembra vuoto o non contiene testo leggibile. Assicurati di caricare un PDF con testo selezionabile (non scansionato come immagine)." 
        });
      }
      
      const systemPrompt = `Sei un esperto analista di bandi di concorsi pubblici italiani. Il tuo compito è estrarre TUTTE le informazioni dal bando con precisione assoluta.

REGOLE FONDAMENTALI:
1. TITOLI DI STUDIO: Estrai ESATTAMENTE le classi di laurea richieste con i codici specifici (es. "LM-63 Scienze delle pubbliche amministrazioni", "L-14 Scienze dei servizi giuridici", "LMG/01 Giurisprudenza"). Per OGNI profilo a bando, elenca separatamente i titoli richiesti.
2. PENALITÀ ERRORI: Cerca nel bando frasi come "penalità", "punteggio negativo", "risposta errata", "-0.25", "-0.33", "decurtazione". Se presenti, estrai il valore ESATTO.
3. PORTALE ISCRIZIONE: I concorsi pubblici italiani usano il portale INPA (inPA.gov.it). Cerca nel bando il portale esatto menzionato.
4. PROVA PRESELETTIVA: Cerca se è prevista una prova preselettiva e se esiste una banca dati ufficiale.

Restituisci SOLO un oggetto JSON valido:
{
  "titoloEnte": "Nome completo dell'ente e titolo esatto del concorso",
  "tipoConcorso": "Tipo esatto (per esami, per titoli ed esami, etc.)",
  "scadenzaDomanda": "DD/MM/YYYY",
  "dataPresuntaEsame": "DD/MM/YYYY o 'Da definire'",
  "posti": numero_posti_totale,
  "profili": [
    {
      "nome": "Nome profilo/figura professionale",
      "posti": numero_posti_profilo,
      "titoliStudio": ["Elenco ESATTO delle classi di laurea con codici (es. LM-63, L-14, LMG/01)"],
      "altriRequisiti": ["Altri requisiti specifici per questo profilo"]
    }
  ],
  "requisiti": [
    {"titolo": "Requisito ESATTO come da bando", "soddisfatto": null}
  ],
  "prove": {
    "tipo": "Tipo prove (scritta, orale, pratica)",
    "descrizione": "Descrizione dettagliata delle prove",
    "hasPreselettiva": true/false,
    "hasBancaDati": true/false,
    "bancaDatiInfo": "Dettagli sulla banca dati se presente",
    "penalitaErrori": "Valore ESATTO della penalità (es. '-0.25', '-0.33') o null se non specificata",
    "punteggioRispostaCorretta": "Punteggio per risposta corretta se specificato",
    "punteggioRispostaNonData": "Punteggio per risposta non data se specificato"
  },
  "materie": [
    {
      "nome": "Nome materia ESATTO come da bando",
      "microArgomenti": ["TUTTI gli argomenti/sotto-argomenti citati nel bando per questa materia, inclusi riferimenti normativi, leggi, decreti, codici"],
      "peso": percentuale_se_indicata
    }
  ],
  "passaggiIscrizione": [
    {"step": 1, "descrizione": "Registrazione sul portale INPA (inPA.gov.it)", "completato": false},
    {"step": 2, "descrizione": "Compilazione domanda online", "completato": false},
    {"step": 3, "descrizione": "Pagamento tassa di concorso (importo se specificato)", "completato": false},
    {"step": 4, "descrizione": "Allegare documentazione richiesta", "completato": false}
  ],
  "calendarioInverso": [
    {
      "fase": "Nome fase studio",
      "dataInizio": "DD/MM/YYYY",
      "dataFine": "DD/MM/YYYY",
      "giorniDisponibili": numero_giorni,
      "oreStimate": ore_stimate
    }
  ],
  "oreTotaliDisponibili": numero_ore_totali,
  "giorniTapering": 7
}

ISTRUZIONI CRITICHE:
- Per i TITOLI DI STUDIO: copia ESATTAMENTE le classi di laurea dal bando, inclusi i codici (LM-xx, L-xx, etc.)
- Per le PENALITÀ: cerca parole chiave come "penalità", "punteggio negativo", "risposta errata detrarrà", "meno X punti"
- Per il PORTALE: quasi tutti i concorsi pubblici usano INPA - verifica nel bando
- NON inventare informazioni: se un dato non è presente, usa null
- Per le MATERIE D'ESAME: estrai TUTTI i sotto-argomenti, riferimenti normativi (leggi, decreti, codici), e aree tematiche specifiche menzionate per OGNI materia. Non riassumere, copia letteralmente dal bando. Cerca nell'articolo relativo alla "prova scritta" o "prova preselettiva" l'elenco completo delle materie e dei loro argomenti.
- Se una materia cita più argomenti (es. "principi generali", "procedimento amministrativo", "atti e provvedimenti"), elenca OGNUNO separatamente nei microArgomenti`;

      const contentToSend = fileContent.substring(0, 100000);
      
      console.log(`PDF total: ${fileContent.length} chars, sending: ${contentToSend.length} chars`);
      console.log(`Searching for penalty keywords in extracted text...`);
      
      const penaltyPatterns = [
        /risposta errata[:\s]*([+-]?\d+[,.]?\d*)\s*punt/i,
        /errata[:\s]*([+-]?\d+[,.]?\d*)\s*punt/i,
        /risposta errata[:\s]*([+-]?\d+[,.]?\d*)/i,
        /penalità[:\s]*([+-]?\d+[,.]?\d*)/i,
        /(-\d+[,.]?\d*)\s*punt[io]?\s*(?:per\s+)?(?:ogni\s+)?(?:risposta\s+)?errata/i
      ];
      
      const correctPatterns = [
        /risposta esatta[:\s]*\+?(\d+[,.]?\d*)\s*punt/i,
        /esatta[:\s]*\+?(\d+[,.]?\d*)\s*punt/i,
        /risposta corretta[:\s]*\+?(\d+[,.]?\d*)\s*punt/i,
        /\+(\d+[,.]?\d*)\s*punt[io]?\s*(?:per\s+)?(?:ogni\s+)?(?:risposta\s+)?(?:esatta|corretta)/i
      ];
      
      const noAnswerPatterns = [
        /mancata risposta[:\s]*(\d+[,.]?\d*)\s*punt/i,
        /risposta non data[:\s]*(\d+[,.]?\d*)\s*punt/i,
        /non risposta[:\s]*(\d+[,.]?\d*)/i,
        /omessa[:\s]*(\d+[,.]?\d*)/i
      ];
      
      let extractedPenalty: string | null = null;
      let extractedCorrect: string | null = null;
      let extractedNoAnswer: string | null = null;
      
      for (const pattern of penaltyPatterns) {
        const match = fileContent.match(pattern);
        if (match) {
          extractedPenalty = match[1].replace(',', '.');
          if (!extractedPenalty.startsWith('-')) extractedPenalty = '-' + extractedPenalty;
          console.log(`Penalty found with pattern ${pattern}: ${extractedPenalty}`);
          break;
        }
      }
      
      for (const pattern of correctPatterns) {
        const match = fileContent.match(pattern);
        if (match) {
          extractedCorrect = '+' + match[1].replace(',', '.');
          console.log(`Correct answer score found with pattern ${pattern}: ${extractedCorrect}`);
          break;
        }
      }
      
      for (const pattern of noAnswerPatterns) {
        const match = fileContent.match(pattern);
        if (match) {
          extractedNoAnswer = match[1].replace(',', '.');
          console.log(`No answer score found with pattern ${pattern}: ${extractedNoAnswer}`);
          break;
        }
      }
      
      console.log(`REGEX EXTRACTION - Penalty: ${extractedPenalty || 'not found'}, Correct: ${extractedCorrect || 'not found'}, No answer: ${extractedNoAnswer || 'not found'}`);
      
      const titoliStudioPattern = /(?:L-\d{1,2}|LM-\d{1,2}|LMG[\/-]?\d{1,2}|LS-\d{1,2})/gi;
      
      const extractedTitoli: string[] = [];
      const seenTitoli = new Set<string>();
      
      let titoloMatch;
      while ((titoloMatch = titoliStudioPattern.exec(fileContent)) !== null) {
        const titolo = titoloMatch[0].toUpperCase().replace('/', '-');
        if (!seenTitoli.has(titolo)) {
          seenTitoli.add(titolo);
          extractedTitoli.push(titolo);
        }
      }
      
      console.log(`TITOLI DI STUDIO ESTRATTI: ${extractedTitoli.length > 0 ? extractedTitoli.join(', ') : 'nessuno trovato'}`);
      
      const materieKeywords = [
        'diritto amministrativo', 'diritto costituzionale', 'diritto civile',
        'diritto dell\'unione europea', 'diritto penale', 'diritto del lavoro',
        'contabilità', 'organizzazione', 'inglese', 'informatica',
        'logico-deduttiv', 'situazional'
      ];
      
      const extractedMaterie: string[] = [];
      for (const keyword of materieKeywords) {
        if (fileContent.toLowerCase().includes(keyword)) {
          extractedMaterie.push(keyword);
        }
      }
      
      console.log(`MATERIE ESTRATTE: ${extractedMaterie.length > 0 ? extractedMaterie.join(', ') : 'nessuna trovata'}`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analizza questo bando di concorso pubblico italiano. Leggi attentamente tutto il testo e estrai le informazioni richieste. ATTENZIONE: cerca specificamente le PENALITÀ PER ERRORI e i TITOLI DI STUDIO ESATTI con codici classe.\n\n${contentToSend}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 4000,
      });

      const content = response.choices[0].message.content;
      console.log(`OpenAI response received: ${content?.substring(0, 500)}...`);
      
      if (!content) {
        throw new Error("Nessuna risposta dall'AI");
      }

      const bandoData = JSON.parse(content);
      
      if (!bandoData.prove) {
        bandoData.prove = {};
      }
      
      if (extractedPenalty && !bandoData.prove.penalitaErrori) {
        bandoData.prove.penalitaErrori = extractedPenalty;
        console.log(`Overriding AI penalty with regex value: ${extractedPenalty}`);
      }
      
      if (extractedCorrect && !bandoData.prove.punteggioRispostaCorretta) {
        bandoData.prove.punteggioRispostaCorretta = extractedCorrect;
        console.log(`Overriding AI correct score with regex value: ${extractedCorrect}`);
      }
      
      if (extractedNoAnswer && !bandoData.prove.punteggioRispostaNonData) {
        bandoData.prove.punteggioRispostaNonData = extractedNoAnswer;
        console.log(`Overriding AI no-answer score with regex value: ${extractedNoAnswer}`);
      }
      
      if (extractedTitoli.length > 0) {
        if (!bandoData.profili || bandoData.profili.length === 0) {
          bandoData.profili = [{ nome: "Profilo principale", posti: bandoData.posti || 1, titoliStudio: extractedTitoli, altriRequisiti: [] }];
          console.log(`Created profile with extracted titoli: ${extractedTitoli.join(', ')}`);
        } else {
          for (const profilo of bandoData.profili) {
            if (!profilo.titoliStudio || profilo.titoliStudio.length === 0) {
              profilo.titoliStudio = extractedTitoli;
              console.log(`Added extracted titoli to profile ${profilo.nome}: ${extractedTitoli.join(', ')}`);
            } else {
              const existingCodes = profilo.titoliStudio.map((t: string) => {
                const match = t.match(/(?:L-\d{1,2}|LM-\d{1,2}|LMG[\/-]?\d{1,2}|LS-\d{1,2})/i);
                return match ? match[0].toUpperCase().replace('/', '-') : null;
              }).filter(Boolean);
              
              for (const titolo of extractedTitoli) {
                if (!existingCodes.includes(titolo)) {
                  profilo.titoliStudio.push(titolo);
                }
              }
              console.log(`Merged titoli for profile ${profilo.nome}: ${profilo.titoliStudio.join(', ')}`);
            }
          }
        }
      }
      
      if (extractedMaterie.length > 0 && (!bandoData.materie || bandoData.materie.length === 0)) {
        bandoData.materie = extractedMaterie.map(m => ({
          nome: m.charAt(0).toUpperCase() + m.slice(1),
          microArgomenti: [],
          peso: null
        }));
        console.log(`Added extracted materie: ${extractedMaterie.join(', ')}`);
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
      const calendarioGenerato = fasi.map((fase, index) => {
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
      
      console.log(`Calendario inverso generato: ${mesiPreparazione} mesi, ${oreTotali}h totali, ${giorniTotali} giorni`);
      console.log(`Bando analysis complete: ${bandoData.titoloEnte || 'No title'}`);
      console.log(`Final penalties: penalty=${bandoData.prove?.penalitaErrori}, correct=${bandoData.prove?.punteggioRispostaCorretta}, noAnswer=${bandoData.prove?.punteggioRispostaNonData}`);
      res.json(bandoData);
    } catch (error: any) {
      console.error("Error analyzing bando:", error?.message || error);
      if (error?.response?.data) {
        console.error("OpenAI error details:", error.response.data);
      }
      res.status(500).json({ error: "Errore durante l'analisi del bando. Riprova con un altro file." });
    }
  });

  app.post("/api/phase1/complete", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const bandoData = req.body;
      
      const concorso = await storage.createConcorso({
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
      
      await storage.upsertUserProgress({
        userId,
        concorsoId: concorso.id,
        fase1Completata: true,
        faseCorrente: 2,
      });
      
      console.log("Phase 1 completed, concorso created:", concorso.id);
      res.json({ success: true, concorsoId: concorso.id, message: "Fase 1 completata" });
    } catch (error) {
      console.error("Error completing phase 1:", error);
      res.status(500).json({ error: "Errore nel completamento della fase 1" });
    }
  });

  return httpServer;
}
