import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const concorsi = pgTable("concorsi", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  nome: text("nome").notNull(),
  categoria: text("categoria"),
  dataEsame: timestamp("data_esame"),
  giorniDisponibili: integer("giorni_disponibili"),
  oreSettimanali: integer("ore_settimanali").default(20),
  bancaDatiDisponibile: boolean("banca_dati_disponibile").default(false),
  penalitaErrori: real("penalita_errori"),
  bandoAnalysis: jsonb("bando_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConcorsoSchema = createInsertSchema(concorsi).omit({
  id: true,
  createdAt: true,
});

export type InsertConcorso = z.infer<typeof insertConcorsoSchema>;
export type Concorso = typeof concorsi.$inferSelect;

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  concorsoId: varchar("concorso_id").references(() => concorsi.id),
  livelloPercentuale: integer("livello_percentuale").default(0),
  faseCorrente: integer("fase_corrente").default(1),
  fase1Completata: boolean("fase1_completata").default(false),
  fase05Completata: boolean("fase05_completata").default(false),
  fase2Completata: boolean("fase2_completata").default(false),
  fase3Completata: boolean("fase3_completata").default(false),
  fase4Completata: boolean("fase4_completata").default(false),
  flashcardMasterate: integer("flashcard_masterate").default(0),
  flashcardTotali: integer("flashcard_totali").default(0),
  quizCompletati: integer("quiz_completati").default(0),
  oreStudioTotali: real("ore_studio_totali").default(0),
  serieAttiva: integer("serie_attiva").default(0),
  recordSerie: integer("record_serie").default(0),
  aiTutorScore: integer("ai_tutor_score").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
  updatedAt: true,
});

export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;

export const flashcards = pgTable("flashcards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  concorsoId: varchar("concorso_id").references(() => concorsi.id),
  materia: text("materia").notNull(),
  fonte: text("fonte"),
  fronte: text("fronte").notNull(),
  retro: text("retro").notNull(),
  tipo: text("tipo").default("concetto"),
  livelloSRS: integer("livello_srs").default(0),
  prossimRevisione: timestamp("prossima_revisione").defaultNow(),
  tempoRispostaMs: integer("tempo_risposta_ms"),
  tentativiTotali: integer("tentativi_totali").default(0),
  tentativiCorretti: integer("tentativi_corretti").default(0),
  masterate: boolean("masterate").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({
  id: true,
  createdAt: true,
});

export type InsertFlashcard = z.infer<typeof insertFlashcardSchema>;
export type Flashcard = typeof flashcards.$inferSelect;

export const materiali = pgTable("materiali", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  concorsoId: varchar("concorso_id").references(() => concorsi.id),
  tipo: text("tipo").notNull(),
  nome: text("nome").notNull(),
  descrizione: text("descrizione"),
  contenuto: text("contenuto"),
  articoliAnalizzati: integer("articoli_analizzati").default(0),
  domandeGenerate: integer("domande_generate").default(0),
  stato: text("stato").default("caricato"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMaterialeSchema = createInsertSchema(materiali).omit({
  id: true,
  createdAt: true,
});

export type InsertMateriale = z.infer<typeof insertMaterialeSchema>;
export type Materiale = typeof materiali.$inferSelect;

export const aiTutorSessions = pgTable("ai_tutor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  argomento: text("argomento").notNull(),
  capitolo: text("capitolo"),
  domande: jsonb("domande").default([]),
  risposte: jsonb("risposte").default([]),
  valutazioni: jsonb("valutazioni").default([]),
  punteggioMedio: integer("punteggio_medio").default(0),
  completata: boolean("completata").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiTutorSessionSchema = createInsertSchema(aiTutorSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertAiTutorSession = z.infer<typeof insertAiTutorSessionSchema>;
export type AiTutorSession = typeof aiTutorSessions.$inferSelect;

export const quizResults = pgTable("quiz_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  concorsoId: varchar("concorso_id").references(() => concorsi.id),
  tipo: text("tipo").notNull(),
  domandeTotal: integer("domande_totali").notNull(),
  risposteCorrette: integer("risposte_corrette").notNull(),
  tempoMedioSecondi: integer("tempo_medio_secondi"),
  penalitaApplicate: real("penalita_applicate").default(0),
  punteggioFinale: real("punteggio_finale").notNull(),
  erroriAnalisi: jsonb("errori_analisi").default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuizResultSchema = createInsertSchema(quizResults).omit({
  id: true,
  createdAt: true,
});

export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type QuizResult = typeof quizResults.$inferSelect;

export const bandoAnalysisSchema = z.object({
  nomeConcorso: z.string(),
  ente: z.string(),
  categoria: z.string().optional(),
  postiDisponibili: z.number().optional(),
  scadenzaDomanda: z.string().optional(),
  dataProve: z.string().optional(),
  requisiti: z.array(z.object({
    requisito: z.string(),
    bloccante: z.boolean(),
    verificato: z.boolean().optional(),
  })),
  prove: z.object({
    tipo: z.string(),
    descrizione: z.string(),
    hasBancaDati: z.boolean(),
    numeroDomande: z.number().optional(),
    tempoMinuti: z.number().optional(),
    penalitaErrori: z.string().nullable(),
  }),
  materie: z.array(z.object({
    nome: z.string(),
    peso: z.number(),
    microArgomenti: z.array(z.string()),
  })),
  passaggiIscrizione: z.array(z.object({
    step: z.number(),
    descrizione: z.string(),
    obbligatorio: z.boolean(),
    completato: z.boolean().optional(),
  })),
  calendarioInverso: z.array(z.object({
    settimana: z.number(),
    dataInizio: z.string(),
    dataFine: z.string(),
    fase: z.string(),
    obiettivo: z.string(),
    oreSuggerite: z.number(),
    attivita: z.array(z.string()),
  })),
  oreTotaliDisponibili: z.number(),
  giorniTapering: z.number(),
});

export type BandoAnalysis = z.infer<typeof bandoAnalysisSchema>;
