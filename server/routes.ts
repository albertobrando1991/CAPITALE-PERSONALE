import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

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
      const fileContent = req.file.buffer.toString("utf-8");
      
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

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analizza questo bando di concorso:\n\n${fileContent.substring(0, 15000)}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Nessuna risposta dall'AI");
      }

      const bandoData = JSON.parse(content);
      res.json(bandoData);
    } catch (error) {
      console.error("Error analyzing bando:", error);
      res.status(500).json({ error: "Errore durante l'analisi del bando" });
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
