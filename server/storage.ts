import { 
  type User, 
  type UpsertUser, 
  type Concorso, 
  type InsertConcorso,
  type UserProgress,
  type InsertUserProgress,
  type Material,
  type InsertMaterial,
  type Flashcard,
  type InsertFlashcard,
  users, 
  concorsi,
  userProgress,
  materials,
  flashcards
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

  getMaterials(userId: string, concorsoId: string): Promise<Material[]>;
  getMaterial(id: string, userId: string): Promise<Material | undefined>;
  createMaterial(material: InsertMaterial): Promise<Material>;
  updateMaterial(id: string, userId: string, data: Partial<InsertMaterial>): Promise<Material | undefined>;
  deleteMaterial(id: string, userId: string): Promise<boolean>;

  getFlashcards(userId: string, concorsoId?: string): Promise<Flashcard[]>;
  createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard>;
  createFlashcards(flashcardList: InsertFlashcard[]): Promise<Flashcard[]>;
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
    await db.delete(userProgress).where(eq(userProgress.concorsoId, id));
    
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

  async getMaterials(userId: string, concorsoId: string): Promise<Material[]> {
    return await db.select().from(materials).where(
      and(eq(materials.userId, userId), eq(materials.concorsoId, concorsoId))
    );
  }

  async getMaterial(id: string, userId: string): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(
      and(eq(materials.id, id), eq(materials.userId, userId))
    );
    return material;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [created] = await db.insert(materials).values(material).returning();
    return created;
  }

  async updateMaterial(id: string, userId: string, data: Partial<InsertMaterial>): Promise<Material | undefined> {
    const [updated] = await db
      .update(materials)
      .set(data)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)))
      .returning();
    return updated;
  }

  async deleteMaterial(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(materials)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getFlashcards(userId: string, concorsoId?: string): Promise<Flashcard[]> {
    if (concorsoId) {
      return await db.select().from(flashcards).where(
        and(eq(flashcards.userId, userId), eq(flashcards.concorsoId, concorsoId))
      );
    }
    return await db.select().from(flashcards).where(eq(flashcards.userId, userId));
  }

  async createFlashcard(flashcard: InsertFlashcard): Promise<Flashcard> {
    const [created] = await db.insert(flashcards).values(flashcard).returning();
    return created;
  }

  async createFlashcards(flashcardList: InsertFlashcard[]): Promise<Flashcard[]> {
    if (flashcardList.length === 0) return [];
    return await db.insert(flashcards).values(flashcardList).returning();
  }
}

export const storage = new DatabaseStorage();
