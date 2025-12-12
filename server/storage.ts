import { 
  type User, 
  type UpsertUser, 
  type Concorso, 
  type InsertConcorso,
  type UserProgress,
  type InsertUserProgress,
  users, 
  concorsi,
  userProgress
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  getConcorsi(userId: string): Promise<Concorso[]>;
  getConcorso(id: string, userId: string): Promise<Concorso | undefined>;
  createConcorso(concorso: InsertConcorso): Promise<Concorso>;
  updateConcorso(id: string, userId: string, data: Partial<InsertConcorso>): Promise<Concorso | undefined>;
  deleteConcorso(id: string, userId: string): Promise<boolean>;
  
  getUserProgress(userId: string, concorsoId?: string): Promise<UserProgress | undefined>;
  upsertUserProgress(progress: InsertUserProgress): Promise<UserProgress>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getConcorsi(userId: string): Promise<Concorso[]> {
    return await db.select().from(concorsi).where(eq(concorsi.userId, userId));
  }

  async getConcorso(id: string, userId: string): Promise<Concorso | undefined> {
    const [concorso] = await db
      .select()
      .from(concorsi)
      .where(and(eq(concorsi.id, id), eq(concorsi.userId, userId)));
    return concorso;
  }

  async createConcorso(concorso: InsertConcorso): Promise<Concorso> {
    const [created] = await db.insert(concorsi).values(concorso).returning();
    return created;
  }

  async updateConcorso(id: string, userId: string, data: Partial<InsertConcorso>): Promise<Concorso | undefined> {
    const [updated] = await db
      .update(concorsi)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(concorsi.id, id), eq(concorsi.userId, userId)))
      .returning();
    return updated;
  }

  async deleteConcorso(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(concorsi)
      .where(and(eq(concorsi.id, id), eq(concorsi.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getUserProgress(userId: string, concorsoId?: string): Promise<UserProgress | undefined> {
    if (concorsoId) {
      const [progress] = await db
        .select()
        .from(userProgress)
        .where(and(eq(userProgress.userId, userId), eq(userProgress.concorsoId, concorsoId)));
      return progress;
    }
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    return progress;
  }

  async upsertUserProgress(progressData: InsertUserProgress): Promise<UserProgress> {
    const existing = await this.getUserProgress(progressData.userId, progressData.concorsoId || undefined);
    
    if (existing) {
      const [updated] = await db
        .update(userProgress)
        .set({ ...progressData, updatedAt: new Date() })
        .where(eq(userProgress.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(userProgress).values(progressData).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
