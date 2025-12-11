import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/analyze-bando", upload.single("file"), async (req: MulterRequest, res) => {
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
      
      const systemPrompt = `Sei un esperto di concorsi pubblici italiani. Analizza il bando di concorso fornito ed estrai tutte le informazioni in formato JSON strutturato.

Restituisci SOLO un oggetto JSON valido con questa struttura esatta:
{
  "titoloEnte": "Nome dell'ente e titolo del concorso",
  "tipoConcorso": "Tipo (es. Concorso pubblico per esami, Concorso pubblico per titoli ed esami)",
  "scadenzaDomanda": "Data scadenza in formato DD/MM/YYYY",
  "dataPresuntaEsame": "Data presunta o stimata dell'esame",
  "posti": numero_posti,
  "requisiti": [
    {"titolo": "Descrizione requisito", "soddisfatto": null}
  ],
  "prove": {
    "tipo": "Descrizione tipo di prove",
    "descrizione": "Dettagli sulle prove",
    "hasPreselettiva": true/false,
    "hasBancaDati": true/false,
    "penalitaErrori": "-0.33" o null
  },
  "materie": [
    {
      "nome": "Nome materia principale",
      "microArgomenti": ["Argomento specifico 1", "Argomento specifico 2"],
      "peso": percentuale_peso_stimato
    }
  ],
  "passaggiIscrizione": [
    {"step": 1, "descrizione": "Descrizione passo", "completato": false}
  ],
  "calendarioInverso": [
    {
      "fase": "Nome fase",
      "dataInizio": "DD/MM/YYYY",
      "dataFine": "DD/MM/YYYY",
      "giorniDisponibili": numero_giorni,
      "oreStimate": ore_stimate
    }
  ],
  "oreTotaliDisponibili": numero_ore_totali,
  "giorniTapering": 7
}

IMPORTANTE:
- Estrai TUTTI i requisiti di ammissione (titoli di studio, eta, cittadinanza, etc.)
- Per le materie, esplodi ogni materia generica in micro-argomenti specifici (es. "Diritto Amministrativo" -> ["L. 241/90", "D.Lgs. 165/2001", "Contratti Pubblici", etc.])
- Genera un calendario inverso realistico dalla data presunta esame, lasciando 7 giorni finali per il tapering
- Stima le ore basandoti su 3-4 ore di studio giornaliere
- I passaggi iscrizione devono includere: registrazione portale, compilazione domanda, pagamento tassa, invio documentazione, etc.`;

      const truncatedContent = fileContent.substring(0, 25000);
      console.log(`Sending ${truncatedContent.length} characters to OpenAI for analysis...`);
      console.log(`First 500 chars of content: ${truncatedContent.substring(0, 500)}`);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analizza questo bando di concorso pubblico italiano. Leggi attentamente tutto il testo e estrai le informazioni richieste:\n\n${truncatedContent}` }
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
      console.log(`Bando analysis complete: ${bandoData.titoloEnte || 'No title'}`);
      res.json(bandoData);
    } catch (error: any) {
      console.error("Error analyzing bando:", error?.message || error);
      if (error?.response?.data) {
        console.error("OpenAI error details:", error.response.data);
      }
      res.status(500).json({ error: "Errore durante l'analisi del bando. Riprova con un altro file." });
    }
  });

  app.post("/api/phase1/complete", async (req, res) => {
    try {
      const bandoData = req.body;
      console.log("Phase 1 completed with data:", bandoData);
      res.json({ success: true, message: "Fase 1 completata" });
    } catch (error) {
      console.error("Error completing phase 1:", error);
      res.status(500).json({ error: "Errore nel completamento della fase 1" });
    }
  });

  return httpServer;
}
