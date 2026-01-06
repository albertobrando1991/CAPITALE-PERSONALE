import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Schema per la tabella simulazioni d'esame
 * Ogni simulazione rappresenta un test completo con domande tratte dalle flashcards
 */
export const simulazioni = pgTable(
  "simulazioni",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    concorsoId: varchar("concorso_id").notNull(),
    
    // Configurazione simulazione
    numeroDomande: integer("numero_domande").notNull().default(40),
    durataMinuti: integer("durata_minuti").notNull().default(60),
    tipoSimulazione: text("tipo_simulazione").notNull().default("completa"), // "completa" | "materia" | "allenamento"
    materieFiltrate: jsonb("materie_filtrate").default([]), // Array di stringhe con nomi materie
    
    // Stato simulazione
    completata: boolean("completata").notNull().default(false),
    punteggio: real("punteggio"), // Punteggio finale calcolato
    percentualeCorrette: real("percentuale_corrette"), // Percentuale domande corrette
    tempoTrascorsoSecondi: integer("tempo_trascorso_secondi"), // Tempo effettivo impiegato
    
    // Dettagli risultati
    dettagliPerMateria: jsonb("dettagli_per_materia").default({}), // { materia: { corrette, errate, nonDate, punteggio } }
    domandeERisposte: jsonb("domande_e_risposte").notNull().default([]), // Array di oggetti: { flashcardId, domanda, opzioni, rispostaCorretta, rispostaUtente, tempoSecondi, segnataPerRevisione }
    
    // Timestamps
    dataInizio: timestamp("data_inizio").defaultNow(),
    dataCompletamento: timestamp("data_completamento"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("IDX_simulazioni_user_id").on(table.userId),
    index("IDX_simulazioni_concorso_id").on(table.concorsoId),
    index("IDX_simulazioni_completata").on(table.completata),
  ]
);

export const insertSimulazioneSchema = createInsertSchema(simulazioni).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSimulazione = z.infer<typeof insertSimulazioneSchema>;
export type Simulazione = typeof simulazioni.$inferSelect;

/**
 * Tipo per una singola domanda nella simulazione
 */
export interface DomandaSimulazione {
  flashcardId: string;
  domanda: string; // Testo domanda (fronte flashcard)
  opzioni: string[]; // Array di 4 opzioni (A, B, C, D)
  rispostaCorretta: string; // Indice opzione corretta (0-3) o lettera (A-D)
  rispostaUtente?: string; // Risposta data dall'utente
  tempoSecondi?: number; // Tempo impiegato per rispondere
  segnataPerRevisione?: boolean; // Flag se l'utente ha segnato per revisione
  materia?: string; // Materia della flashcard
}

/**
 * Tipo per i dettagli per materia nel report
 */
export interface DettagliMateria {
  corrette: number;
  errate: number;
  nonDate: number;
  punteggio: number; // Punteggio per questa materia
  percentuale: number; // Percentuale corrette per questa materia
}


