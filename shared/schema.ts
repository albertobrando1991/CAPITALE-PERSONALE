import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const concorsi = pgTable("concorsi", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  nome: text("nome").notNull(),
  titoloEnte: text("titolo_ente"),
  tipoConcorso: text("tipo_concorso"),
  posti: integer("posti"),
  scadenzaDomanda: text("scadenza_domanda"),
  dataPresuntaEsame: text("data_presunta_esame"),
  mesiPreparazione: integer("mesi_preparazione").default(6),
  oreSettimanali: integer("ore_settimanali").default(15),
  dataInizioStudio: timestamp("data_inizio_studio").defaultNow(),
  bandoAnalysis: jsonb("bando_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConcorsoSchema = createInsertSchema(concorsi).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConcorso = z.infer<typeof insertConcorsoSchema>;
export type Concorso = typeof concorsi.$inferSelect;

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  concorsoId: varchar("concorso_id").references(() => concorsi.id, { onDelete: "cascade" }),
  livelloPercentuale: integer("livello_percentuale").default(0),
  faseCorrente: integer("fase_corrente").default(1),
  fase1Completata: boolean("fase1_completata").default(false),
  fase2Completata: boolean("fase2_completata").default(false),
  fase3Completata: boolean("fase3_completata").default(false),
  fase4Completata: boolean("fase4_completata").default(false),
  flashcardMasterate: integer("flashcard_masterate").default(0),
  flashcardTotali: integer("flashcard_totali").default(0),
  quizCompletati: integer("quiz_completati").default(0),
  oreStudioTotali: real("ore_studio_totali").default(0),
  serieAttiva: integer("serie_attiva").default(0),
  recordSerie: integer("record_serie").default(0),
  flashcardSession: jsonb("flashcard_session"),
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
  concorsoId: varchar("concorso_id").references(() => concorsi.id, { onDelete: "cascade" }),
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

export const quizResults = pgTable("quiz_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  concorsoId: varchar("concorso_id").references(() => concorsi.id, { onDelete: "cascade" }),
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

export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  concorsoId: varchar("concorso_id").notNull().references(() => concorsi.id, { onDelete: "cascade" }),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  materia: text("materia"),
  contenuto: text("contenuto"),
  estratto: boolean("estratto").default(false),
  flashcardGenerate: integer("flashcard_generate").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMaterialSchema = createInsertSchema(materials).omit({
  id: true,
  createdAt: true,
});

export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type Material = typeof materials.$inferSelect;
