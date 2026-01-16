
import 'dotenv/config';
import { db } from "./server/db";
import { concorsi } from "@shared/schema";
import { eq, or } from "drizzle-orm";

async function fixBando() {
  if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is missing");
      process.exit(1);
  }

  const dummyBando = {
    posti: 100,
    prove: {
        tipo: "Scritta e Orale",
        descrizione: "Prova scritta a quiz e colloquio orale",
        hasBancaDati: false,
        penalitaErrori: "0",
        hasPreselettiva: false
    },
    materie: [
        { nome: "Diritto Amministrativo", peso: 30, numeroDomande: 10, microArgomenti: ["Atti", "Procedimento"] },
        { nome: "Diritto Costituzionale", peso: 20, numeroDomande: 10, microArgomenti: ["Fonti", "Organi"] },
        { nome: "Diritto Tributario", peso: 30, numeroDomande: 10, microArgomenti: ["Imposte", "Accertamento"] }
    ],
    profili: [
        { nome: "Funzionario", posti: 100, titoliStudio: ["Laurea"], altriRequisiti: [] }
    ],
    requisiti: [
        { titolo: "Cittadinanza", soddisfatto: true },
        { titolo: "Titolo di studio", soddisfatto: true }
    ],
    titoloEnte: "Concorso Pubblico",
    tipoConcorso: "Esami",
    giorniTapering: 7,
    oreSettimanali: 20,
    scadenzaDomanda: "2025-12-31",
    dataInizioStudio: new Date().toISOString(),
    mesiPreparazione: 6,
    calendarioInverso: [
        { fase: "Fase 0: Intelligence & Setup", dataInizio: new Date().toISOString(), dataFine: new Date().toISOString(), oreStimate: 10, giorniDisponibili: 5 },
        { fase: "Fase 1: Apprendimento Base (SQ3R)", dataInizio: new Date().toISOString(), dataFine: new Date().toISOString(), oreStimate: 50, giorniDisponibili: 20 },
        { fase: "Fase 2: Consolidamento e Memorizzazione", dataInizio: new Date().toISOString(), dataFine: new Date().toISOString(), oreStimate: 40, giorniDisponibili: 15 },
        { fase: "Fase 3: Simulazione ad Alta Fedeltà", dataInizio: new Date().toISOString(), dataFine: new Date().toISOString(), oreStimate: 20, giorniDisponibili: 10 }
    ],
    dataPresuntaEsame: "2026-06-01",
    passaggiIscrizione: [],
    oreTotaliDisponibili: 200
  };

  // Update Concorso Agenzia Entrate
  await db.update(concorsi)
    .set({ bandoAnalysis: dummyBando })
    .where(eq(concorsi.nome, "Concorso Agenzia Entrate"));

  // Update Concorso INPS
  await db.update(concorsi)
    .set({ bandoAnalysis: dummyBando })
    .where(eq(concorsi.nome, "Concorso INPS"));

  console.log("Bando Analysis updated for restored concorsi.");
}

fixBando().catch(console.error).finally(() => process.exit());
