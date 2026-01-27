import {
  type OralExamSession,
  oralExamSessions,
} from "../shared/schema-oral-exam";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

/**
 * Storage per le sessioni di esame orale - persistenza nel database PostgreSQL
 */
export class OralExamStorage {
  async createSession(data: Partial<OralExamSession> & { id: string; userId: string; concorsoId: string }): Promise<OralExamSession> {
    const [created] = await db.insert(oralExamSessions).values(data as any).returning();
    return created;
  }

  async getSessionByUser(id: string, userId: string): Promise<OralExamSession | undefined> {
    const [session] = await db
      .select()
      .from(oralExamSessions)
      .where(and(eq(oralExamSessions.id, id), eq(oralExamSessions.userId, userId)))
      .limit(1);
    return session;
  }

  async getSessionsByUser(userId: string, concorsoId?: string): Promise<OralExamSession[]> {
    if (concorsoId) {
      return await db
        .select()
        .from(oralExamSessions)
        .where(and(eq(oralExamSessions.userId, userId), eq(oralExamSessions.concorsoId, concorsoId)))
        .orderBy(desc(oralExamSessions.createdAt));
    }
    return await db
      .select()
      .from(oralExamSessions)
      .where(eq(oralExamSessions.userId, userId))
      .orderBy(desc(oralExamSessions.createdAt));
  }

  async updateSession(id: string, userId: string, data: Partial<OralExamSession>): Promise<OralExamSession | undefined> {
    const [updated] = await db
      .update(oralExamSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(oralExamSessions.id, id), eq(oralExamSessions.userId, userId)))
      .returning();
    return updated;
  }

  async completeSession(
    id: string,
    userId: string,
    feedback: { score: number; overallComment: string; strengths: string[]; weaknesses: string[] },
    finalScore: number
  ): Promise<OralExamSession | undefined> {
    const [updated] = await db
      .update(oralExamSessions)
      .set({
        status: "completed",
        feedback,
        score: finalScore,
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(oralExamSessions.id, id), eq(oralExamSessions.userId, userId)))
      .returning();
    return updated;
  }
}

export const storageOralExam = new OralExamStorage();
