import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { users, concorsi } from "./schema-base";

export * from "./schema-base";

// ============================================
// CORE TABLES
// ============================================

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
  flashcardGenerationCount: integer("flashcard_generation_count").default(0), // 0-3, tracks regenerations
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
export * from "./schema-fase3";
export * from "./schema-rbac";
export * from "./schema-audit";
export * from "./schema-oral-exam";

// ============================================
// CACHE SYSTEM (The Hive)
// ============================================

export const flashcardCache = pgTable("flashcard_cache", {
  id: serial("id").primaryKey(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(), // SHA-256
  topic: varchar("topic", { length: 255 }),
  flashcardsJson: jsonb("flashcards_json").notNull(),
  sourceType: varchar("source_type", { length: 50 }), // 'text', 'pdf', 'topic_name'
  generationCount: integer("generation_count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFlashcardCacheSchema = createInsertSchema(flashcardCache).omit({
  id: true,
  createdAt: true
});
export type FlashcardCache = typeof flashcardCache.$inferSelect;
export type InsertFlashcardCache = typeof flashcardCache.$inferInsert;

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

// ============================================
// BENESSERE PSICOFISICO TABLES
// ============================================

export const breathingSessions = pgTable("breathing_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").references(() => concorsi.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  cyclesCompleted: integer("cycles_completed").default(0),
  durationSeconds: integer("duration_seconds"),
  context: varchar("context", { length: 50 }), // 'pre_study', 'pre_exam', 'break', 'stress_relief'
  heartRateBefore: integer("heart_rate_before"),
  heartRateAfter: integer("heart_rate_after"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBreathingSessionSchema = createInsertSchema(breathingSessions).omit({
  id: true,
  createdAt: true
});
export type BreathingSession = typeof breathingSessions.$inferSelect;
export type InsertBreathingSession = typeof breathingSessions.$inferInsert;

export const reframingLogs = pgTable("reframing_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").references(() => concorsi.id, { onDelete: "set null" }),
  anxiousThought: text("anxious_thought").notNull(),
  reframedThought: text("reframed_thought").notNull(),
  aiSuggestion: text("ai_suggestion"),
  aiModel: varchar("ai_model", { length: 50 }),
  effectivenessRating: integer("effectiveness_rating"),
  context: varchar("context", { length: 50 }),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReframingLogSchema = createInsertSchema(reframingLogs).omit({
  id: true,
  createdAt: true
});
export type ReframingLog = typeof reframingLogs.$inferSelect;
export type InsertReframingLog = typeof reframingLogs.$inferInsert;

export const sleepLogs = pgTable("sleep_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(), // Drizzle doesn't have a distinct DATE type for PG in core, usually uses timestamp or string. Using timestamp for now or date string.
  bedtime: text("bedtime"), // TIME type usually mapped to string in JS
  wakeTime: text("wake_time"),
  totalHours: real("total_hours"),
  qualityRating: integer("quality_rating"),
  remSleepHours: real("rem_sleep_hours"),
  deepSleepHours: real("deep_sleep_hours"),
  interruptions: integer("interruptions").default(0),
  notes: text("notes"),
  moodOnWaking: varchar("mood_on_waking", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSleepLogSchema = createInsertSchema(sleepLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type SleepLog = typeof sleepLogs.$inferSelect;
export type InsertSleepLog = typeof sleepLogs.$inferInsert;

export const hydrationLogs = pgTable("hydration_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  glassesCount: integer("glasses_count").default(0),
  targetGlasses: integer("target_glasses").default(8),
  lastDrinkAt: timestamp("last_drink_at"),
  lastReminderAt: timestamp("last_reminder_at"),
  reminderEnabled: boolean("reminder_enabled").default(true),
  reminderIntervalMinutes: integer("reminder_interval_minutes").default(60),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHydrationLogSchema = createInsertSchema(hydrationLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
export type HydrationLog = typeof hydrationLogs.$inferSelect;
export type InsertHydrationLog = typeof hydrationLogs.$inferInsert;

export const nutritionLogs = pgTable("nutrition_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mealTime: timestamp("meal_time").notNull(),
  mealType: varchar("meal_type", { length: 20 }), // 'breakfast', 'lunch', 'dinner', 'snack'
  description: text("description"),
  energyLevelBefore: integer("energy_level_before"),
  energyLevelAfter: integer("energy_level_after"),
  brainFog: boolean("brain_fog").default(false),
  glycemicSpike: boolean("glycemic_spike").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNutritionLogSchema = createInsertSchema(nutritionLogs).omit({
  id: true,
  createdAt: true
});
export type NutritionLog = typeof nutritionLogs.$inferSelect;
export type InsertNutritionLog = typeof nutritionLogs.$inferInsert;
