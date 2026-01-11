import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";

// ============================================
// CORE TABLES (BASE)
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
