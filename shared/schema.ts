import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
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
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
// UpsertUser needs to allow passing ID explicitly for auth flows
export type UpsertUser = InsertUser & { id?: string };

export const concorsi = pgTable("concorsi", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  nome: text("nome").notNull(),
  scadenzaDomanda: timestamp("scadenza_domanda"),
  dataPresuntaEsame: timestamp("data_presunta_esame"),
  bandoAnalysis: jsonb("bando_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConcorsoSchema = createInsertSchema(concorsi).omit({ id: true, createdAt: true });
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
  prossimoRipasso: timestamp("prossimo_ripasso"),
  masterate: boolean("masterate").default(false),
  numeroRipetizioni: integer("numero_ripetizioni").default(0),
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
  tier: text("tier").notNull().default("free"), // free, premium, enterprise
  status: text("status").notNull().default("active"), // active, canceled, past_due
  currentPeriodEnd: timestamp("current_period_end"),
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
