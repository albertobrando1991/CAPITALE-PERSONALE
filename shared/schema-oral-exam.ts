import { pgTable, serial, varchar, text, timestamp, jsonb, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { sql } from "drizzle-orm";
import { users, concorsi } from "./schema-base";

// ============================================
// ORAL EXAM SESSIONS
// ============================================

/**
 * Persona type for AI instructor personality
 * - rigorous: Formal, demanding professor
 * - empathetic: Encouraging, supportive tutor
 */
export type OralExamPersona = "rigorous" | "empathetic";

/**
 * Session status
 * - active: Session in progress
 * - completed: Session finished with feedback
 * - abandoned: User left before completion
 */
export type OralExamStatus = "active" | "completed" | "abandoned";

/**
 * Message in the conversation
 */
export interface OralExamMessage {
    role: "user" | "instructor";
    content: string;
    timestamp: string;
    audioUrl?: string; // Optional: if voice recording is enabled
}

/**
 * Feedback generated at session end
 */
export interface OralExamFeedback {
    score: number; // 1-30 scale (Italian university grading)
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    overallComment: string;
}

export const oralExamSessions = pgTable("oral_exam_sessions", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    concorsoId: varchar("concorso_id").notNull().references(() => concorsi.id, { onDelete: "cascade" }),

    // Session Configuration
    persona: varchar("persona", { length: 20 }).notNull().default("rigorous"), // 'rigorous' | 'empathetic'
    topics: jsonb("topics").notNull().default([]), // Array of topic names/IDs selected by user
    difficulty: varchar("difficulty", { length: 20 }).default("medium"), // 'easy' | 'medium' | 'hard'

    // Session State
    status: varchar("status", { length: 20 }).notNull().default("active"), // 'active' | 'completed' | 'abandoned'
    messages: jsonb("messages").notNull().default([]), // Array of OralExamMessage
    currentTurn: integer("current_turn").default(0), // Number of Q&A exchanges
    maxTurns: integer("max_turns").default(5), // Limit for session length

    // Timing
    startedAt: timestamp("started_at").defaultNow(),
    endedAt: timestamp("ended_at"),
    totalDurationSeconds: integer("total_duration_seconds"),

    // Evaluation
    evaluations: jsonb("evaluations").notNull().default([]), // Array of per-turn EvaluationCriteria
    feedback: jsonb("feedback"), // OralExamFeedback object
    score: real("score"), // Final score 1-30

    // Usage Tracking (for premium limits)
    tokensUsed: integer("tokens_used").default(0),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOralExamSessionSchema = createInsertSchema(oralExamSessions).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type OralExamSession = typeof oralExamSessions.$inferSelect;
export type InsertOralExamSession = typeof oralExamSessions.$inferInsert;
