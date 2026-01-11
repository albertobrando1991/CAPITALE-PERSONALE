import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ============================================
// CORE TABLES
// ============================================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
// UpsertUser needs to allow passing ID explicitly for auth flows
export type UpsertUser = InsertUser & { id?: string };

export const concorsi = pgTable("concorsi", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  nome: text("nome").notNull(),
  titoloEnte: text("titolo_ente"),
  tipoConcorso: text("tipo_concorso"),
  posti: integer("posti"),
  scadenzaDomanda: timestamp("scadenza_domanda"),
  dataPresuntaEsame: timestamp("data_presunta_esame"),
  mesiPreparazione: integer("mesi_preparazione"),
  oreSettimanali: integer("ore_settimanali"),
  dataInizioStudio: timestamp("data_inizio_studio"),
  bandoAnalysis: jsonb("bando_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertConcorsoSchema = createInsertSchema(concorsi).omit({ id: true, createdAt: true, updatedAt: true });
export type Concorso = typeof concorsi.$inferSelect;
export type InsertConcorso = typeof concorsi.$inferInsert;

export const materials = pgTable("materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  concorsoId: varchar("concorso_id").notNull(),
  userId: varchar("user_id").notNull(), // Added
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  materia: text("materia"),
  contenuto: text("contenuto"),
  fileUrl: text("file_url"),
  estratto: boolean("estratto").default(false),
  flashcardGenerate: integer("flashcard_generate").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
export type Material = typeof materials.$inferSelect;
export type InsertMaterial = typeof materials.$inferInsert;

export const flashcards = pgTable("flashcards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  concorsoId: varchar("concorso_id"),
  materialId: varchar("material_id"),
  userId: varchar("user_id").notNull(), // Added
  materia: text("materia"),
  tipo: text("tipo"),
  fonte: text("fonte"),
  fronte: text("fronte").notNull(),
  retro: text("retro").notNull(),
  livelloSRS: integer("livello_srs").default(0),
  tentativiTotali: integer("tentativi_totali").default(0),
  tentativiCorretti: integer("tentativi_corretti").default(0),
  prossimoRipasso: timestamp("prossimo_ripasso"),
  ultimoRipasso: timestamp("ultimo_ripasso"),
  intervalloGiorni: real("intervallo_giorni").default(0),
  easeFactor: real("ease_factor").default(2.5),
  prossimRevisione: timestamp("prossima_revisione"),
  masterate: boolean("masterate").default(false),
  numeroRipetizioni: integer("numero_ripetizioni").default(0),
  tempoRispostaMs: integer("tempo_risposta_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFlashcardSchema = createInsertSchema(flashcards).omit({ id: true, createdAt: true });
export type Flashcard = typeof flashcards.$inferSelect;
export type InsertFlashcard = typeof flashcards.$inferInsert;

export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  concorsoId: varchar("concorso_id"),
  streakDays: integer("streak_days").default(0),
  lastActivityDate: timestamp("last_activity_date"),
  totalStudyMinutes: integer("total_study_minutes").default(0),
  livelloPercentuale: integer("livello_percentuale").default(0),
  faseCorrente: integer("fase_corrente").default(1),
  fase1Completata: boolean("fase1_completata").default(false),
  fase2Completata: boolean("fase2_completata").default(false),
  fase3Completata: boolean("fase3_completata").default(false),
  fase4Completata: boolean("fase4_completata").default(false),
  flashcardMasterate: integer("flashcard_masterate").default(0),
  flashcardTotali: integer("flashcard_totali").default(0),
  quizCompletati: integer("quiz_completati").default(0),
  oreStudioTotali: integer("ore_studio_totali").default(0),
  serieAttiva: integer("serie_attiva").default(0),
  recordSerie: integer("record_serie").default(0),
  flashcardSession: jsonb("flashcard_session"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({ id: true, updatedAt: true });
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = typeof userProgress.$inferInsert;

// ============================================
// SUBSCRIPTIONS
// ============================================

export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  sintesiUsate: integer("sintesi_usate"),
  sintesiLimite: integer("sintesi_limite"),
  tier: text("tier").notNull().default("free"), // free, premium, enterprise
  status: text("status").notNull().default("active"), // active, canceled, past_due
  currentPeriodEnd: timestamp("current_period_end"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  lastReset: timestamp("last_reset"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = typeof userSubscriptions.$inferInsert;

// ============================================
// NEW CALENDAR EVENTS
// ============================================

export const calendarEvents = pgTable("calendar_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  concorsoId: varchar("concorso_id").references(() => concorsi.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").default("note"), // 'note', 'activity', 'reminder'
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEventItem = typeof calendarEvents.$inferSelect;

// ============================================
// EXPORTS FROM OTHER MODULES
// ============================================
export * from "./schema-simulazioni";
export * from "./schema-sq3r";
export * from "./schema-libreria";
export * from "./schema-normativa";

// ============================================
// MNEMOTECNICHE TABLES
// ============================================

export const mnemonicheNumeri = pgTable("mnemoniche_numeri", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").references(() => concorsi.id, { onDelete: "set null" }),
  numeroArticolo: varchar("numero_articolo", { length: 10 }).notNull(),
  codiceFonetico: varchar("codice_fonetico", { length: 50 }).notNull(),
  parolaMnemonica: varchar("parola_mnemonica", { length: 100 }).notNull(),
  contesto: text("contesto"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMnemonicheNumeriSchema = createInsertSchema(mnemonicheNumeri).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type MnemonicheNumeri = typeof mnemonicheNumeri.$inferSelect;
export type InsertMnemonicheNumeri = typeof mnemonicheNumeri.$inferInsert;

export const palazziMemoria = pgTable("palazzi_memoria", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").references(() => concorsi.id, { onDelete: "set null" }),
  nomePalazzo: varchar("nome_palazzo", { length: 200 }).notNull(),
  descrizione: text("descrizione"),
  stanze: jsonb("stanze").notNull().default([]), // Array of objects
  isPreferito: boolean("is_preferito").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPalazziMemoriaSchema = createInsertSchema(palazziMemoria).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type PalazziMemoria = typeof palazziMemoria.$inferSelect;
export type InsertPalazziMemoria = typeof palazziMemoria.$inferInsert;

export const filmMentali = pgTable("film_mentali", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").references(() => concorsi.id, { onDelete: "set null" }),
  titolo: varchar("titolo", { length: 200 }).notNull(),
  articolo: varchar("articolo", { length: 50 }).notNull(),
  setting: text("setting"),
  soggettoAttivo: text("soggetto_attivo").notNull(),
  condotta: text("condotta").notNull(),
  evento: text("evento").notNull(),
  nessoCausale: text("nesso_causale"),
  elementoPsicologico: text("elemento_psicologico"),
  tags: text("tags").array(),
  isPreferito: boolean("is_preferito").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFilmMentaliSchema = createInsertSchema(filmMentali).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type FilmMentali = typeof filmMentali.$inferSelect;
export type InsertFilmMentali = typeof filmMentali.$inferInsert;
