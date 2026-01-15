import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, real, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { users, concorsi } from "./schema-base";
import { materieSQ3R } from "./schema-sq3r";
import { sql } from "drizzle-orm";

// ============================================
// FASE 3: PROGRESS
// ============================================

export const fase3Progress = pgTable("fase3_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").notNull().references(() => concorsi.id, { onDelete: "cascade" }),
  
  totalErrors: integer("total_errors").default(0),
  weakAreasCount: integer("weak_areas_count").default(0),
  totalDrillSessions: integer("total_drill_sessions").default(0),
  totalDrillHours: real("total_drill_hours").default(0),
  retentionRate: real("retention_rate").default(0),
  totalSrsReviews: integer("total_srs_reviews").default(0),
  
  status: text("status").default("WEAK"), // 'WEAK', 'REVIEW', 'SOLID'
  canAccessFase4: boolean("can_access_fase4").default(false),
  fase4UnlockedAt: timestamp("fase4_unlocked_at"),
  
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Fase3Progress = typeof fase3Progress.$inferSelect;
export type InsertFase3Progress = typeof fase3Progress.$inferInsert;


// ============================================
// FASE 3: ERROR BINS
// ============================================

export const fase3ErrorBins = pgTable("fase3_error_bins", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").notNull().references(() => concorsi.id, { onDelete: "cascade" }),
  materiaId: varchar("materia_id").references(() => materieSQ3R.id, { onDelete: "set null" }),
  
  topicName: text("topic_name").notNull(),
  topicSlug: text("topic_slug").notNull(),
  
  errorCount: integer("error_count").default(0),
  totalAttempts: integer("total_attempts").default(0),
  errorRate: real("error_rate").default(0),
  difficultyScore: real("difficulty_score").default(0),
  
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  
  recoveryPlan: text("recovery_plan"),
  recoveryPlanGeneratedAt: timestamp("recovery_plan_generated_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Fase3ErrorBin = typeof fase3ErrorBins.$inferSelect;
export type InsertFase3ErrorBin = typeof fase3ErrorBins.$inferInsert;


// ============================================
// FASE 3: ERRORS
// ============================================

export const fase3Errors = pgTable("fase3_errors", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").notNull().references(() => concorsi.id, { onDelete: "cascade" }),
  errorBinId: integer("error_bin_id").references(() => fase3ErrorBins.id, { onDelete: "cascade" }),
  
  sourceType: text("source_type").notNull(), // 'quiz', 'flashcard', 'drill'
  sourceId: text("source_id"),
  
  questionText: text("question_text").notNull(),
  wrongAnswer: text("wrong_answer"),
  correctAnswer: text("correct_answer"),
  explanation: text("explanation"),
  mistakeType: text("mistake_type").default("altro"),
  
  isRecurring: boolean("is_recurring").default(false),
  recurrenceCount: integer("recurrence_count").default(0),

  occurredAt: timestamp("occurred_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Fase3Error = typeof fase3Errors.$inferSelect;
export type InsertFase3Error = typeof fase3Errors.$inferInsert;


// ============================================
// FASE 3: DRILL SESSIONS
// ============================================

export const fase3DrillSessions = pgTable("fase3_drill_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").notNull().references(() => concorsi.id, { onDelete: "cascade" }),
  
  mode: text("mode").notNull(), // 'weak', 'topic', 'mixed', 'pdf', 'text'
  topicId: text("topic_id"),
  
  totalQuestions: integer("total_questions").default(20),
  generatedQuestions: text("generated_questions"), // JSON stringified
  
  correctAnswers: integer("correct_answers").default(0),
  wrongAnswers: integer("wrong_answers").default(0),
  skippedQuestions: integer("skipped_questions").default(0),
  
  durationSeconds: integer("duration_seconds").default(0),
  avgTimePerQuestion: real("avg_time_per_question").default(0),
  scorePercentage: real("score_percentage").default(0),
  improvementRate: real("improvement_rate").default(0),
  
  newErrorsFound: integer("new_errors_found").default(0),
  newErrorBinsCreated: integer("new_error_bins_created").default(0),
  
  isCompleted: boolean("is_completed").default(false),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Fase3DrillSession = typeof fase3DrillSessions.$inferSelect;
export type InsertFase3DrillSession = typeof fase3DrillSessions.$inferInsert;


// ============================================
// FASE 3: SRS ITEMS
// ============================================

export const fase3SrsItems = pgTable("fase3_srs_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").notNull().references(() => concorsi.id, { onDelete: "cascade" }),
  
  itemType: text("item_type").notNull(), // 'flashcard', 'error', 'concept'
  itemId: text("item_id").notNull(),
  itemReference: text("item_reference"), // Text or JSON
  
  nextReviewDate: timestamp("next_review_date").notNull(),
  easeFactor: real("ease_factor").default(2.5),
  intervalDays: integer("interval_days").default(0),
  repetitions: integer("repetitions").default(0),
  
  lastRating: integer("last_rating"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  totalReviews: integer("total_reviews").default(0),
  timesForgotten: integer("times_forgotten").default(0),
  
  currentStreak: integer("current_streak").default(0),
  bestStreak: integer("best_streak").default(0),
  
  isMastered: boolean("is_mastered").default(false),
  masteredAt: timestamp("mastered_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Fase3SrsItem = typeof fase3SrsItems.$inferSelect;
export type InsertFase3SrsItem = typeof fase3SrsItems.$inferInsert;


// ============================================
// FASE 3: GENERATED QUESTIONS CACHE
// ============================================

export const fase3GeneratedQuestions = pgTable("fase3_generated_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  concorsoId: varchar("concorso_id").notNull().references(() => concorsi.id, { onDelete: "cascade" }),
  flashcardId: varchar("flashcard_id").notNull(), // ID flashcard originale
  
  questionText: text("question_text").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  distractors: text("distractors").notNull(), // JSON stringified array
  explanation: text("explanation"),
  topic: text("topic"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Fase3GeneratedQuestion = typeof fase3GeneratedQuestions.$inferSelect;
export type InsertFase3GeneratedQuestion = typeof fase3GeneratedQuestions.$inferInsert;
