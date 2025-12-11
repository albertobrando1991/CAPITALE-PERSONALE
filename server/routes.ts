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
      "microArgomenti": ["Riferimenti normativi specifici citati nel bando"],
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
- Estrai TUTTI i riferimenti normativi citati nelle materie d'esame`;

      const maxChars = 60000;
      let contentToSend = fileContent;
      
      if (fileContent.length > maxChars) {
        const firstPart = fileContent.substring(0, 40000);
        const lastPart = fileContent.substring(fileContent.length - 20000);
        contentToSend = firstPart + "\n\n[...SEZIONE CENTRALE OMESSA...]\n\n" + lastPart;
      }
      
      console.log(`Sending ${contentToSend.length} characters to OpenAI for analysis...`);
      console.log(`First 500 chars: ${contentToSend.substring(0, 500)}`);
      
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
