import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, real, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { users, concorsi } from "./schema-base";
import { sql } from "drizzle-orm";

// ============================================
// FASE 4: EXAM SIMULATION & MASTERY
// ============================================

export const fase4Progress = pgTable("fase4_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").notNull().references(() => concorsi.id, { onDelete: "cascade" }),
  
  totalSimulations: integer("total_simulations").default(0),
  averageScore: real("average_score").default(0),
  bestScore: real("best_score").default(0),
  
  readinessScore: real("readiness_score").default(0),
  examDate: timestamp("exam_date"),
  
  isExamReady: boolean("is_exam_ready").default(false),
  
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Fase4Progress = typeof fase4Progress.$inferSelect;
export type InsertFase4Progress = typeof fase4Progress.$inferInsert;
