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
  type Simulazione,
  type InsertSimulazione,
  type CalendarEventItem,
  type InsertCalendarEvent
} from "../shared/schema";
import { users, concorsi, userProgress, materials, flashcards, simulazioni, calendarEvents } from "../shared/schema";
import { db } from "./db";
import { eq, and, desc, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  getConcorsi(userId: string): Promise<Concorso[]>;
  getConcorso(id: string, userId: string): Promise<Concorso | undefined>;
  createConcorso(concorso: InsertConcorso): Promise<Concorso>;
  updateConcorso(id: string, userId: string, data: Partial<InsertConcorso>): Promise<Concorso | undefined>;
  deleteConcorso(id: string, userId: string): Promise<boolean>;

  getUserProgress(userId: string, concorsoId?: string): Promise<UserProgress | undefined>;
  upsertUserProgress(progress: Partial<UserProgress> & { userId: string }): Promise<UserProgress>;

  createMaterial(material: InsertMaterial): Promise<Material>;
  getMaterials(userId: string, concorsoId: string): Promise<Material[]>;
  getMaterial(id: string, userId: string): Promise<Material | undefined>;
  deleteMaterial(id: string, userId: string): Promise<boolean>;
  updateMaterial(id: string, userId: string, data: Partial<InsertMaterial>): Promise<Material | undefined>;

  createFlashcards(flashcards: InsertFlashcard[]): Promise<Flashcard[]>;
  getFlashcards(userId: string, concorsoId?: string): Promise<Flashcard[]>;
  getFlashcard(id: string, userId: string): Promise<Flashcard | undefined>;
  updateFlashcard(id: string, userId: string, data: Partial<InsertFlashcard>): Promise<Flashcard | undefined>;
  deleteFlashcard(id: string, userId: string): Promise<boolean>;
  deleteFlashcardsByMateria(userId: string, concorsoId: string, materia: string): Promise<number>;

  // Calendar Events
  getCalendarEvents(userId: string): Promise<CalendarEventItem[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEventItem>;
  updateCalendarEvent(id: string, userId: string, data: Partial<InsertCalendarEvent>): Promise<CalendarEventItem | undefined>;
  deleteCalendarEvent(id: string, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    if (user.id) {
      const [existingUser] = await db.select().from(users).where(eq(users.id, user.id));
      if (existingUser) {
        const [updatedUser] = await db
          .update(users)
          .set(user)
          .where(eq(users.id, user.id))
          .returning();
        return updatedUser;
      }
      const [newUser] = await db.insert(users).values(user).returning();
      return newUser;
    }

    if (user.email) {
      const [existingUser] = await db.select().from(users).where(eq(users.email, user.email));
      if (existingUser) {
        const [updatedUser] = await db
          .update(users)
          .set(user)
          .where(eq(users.id, existingUser.id))
          .returning();
        return updatedUser;
      }
    }

    const { id: _id, ...userWithoutId } = user;
    const [newUser] = await db.insert(users).values(userWithoutId).returning();
    return newUser;
  }

  async getConcorsi(userId: string): Promise<Concorso[]> {
    return await db
      .select()
      .from(concorsi)
      .where(eq(concorsi.userId, userId))
      .orderBy(desc(concorsi.createdAt));
  }

  async getConcorso(id: string, userId: string): Promise<Concorso | undefined> {
    const [concorso] = await db
      .select()
      .from(concorsi)
      .where(and(eq(concorsi.id, id), eq(concorsi.userId, userId)));
    return concorso;
  }

  async createConcorso(concorso: InsertConcorso): Promise<Concorso> {
    const [newConcorso] = await db.insert(concorsi).values(concorso).returning();
    return newConcorso;
  }

  async updateConcorso(id: string, userId: string, data: Partial<InsertConcorso>): Promise<Concorso | undefined> {
    const [updatedConcorso] = await db
      .update(concorsi)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(concorsi.id, id), eq(concorsi.userId, userId)))
      .returning();
    return updatedConcorso;
  }

  async deleteConcorso(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(concorsi)
      .where(and(eq(concorsi.id, id), eq(concorsi.userId, userId)))
      .returning();
    return !!deleted;
  }

  async getUserProgress(userId: string, concorsoId?: string): Promise<UserProgress | undefined> {
    let query = db.select().from(userProgress).where(eq(userProgress.userId, userId));
    
    if (concorsoId) {
      query = db
        .select()
        .from(userProgress)
        .where(and(eq(userProgress.userId, userId), eq(userProgress.concorsoId, concorsoId)));
    } else {
      // Se non c'è concorsoId, prendiamo l'ultimo aggiornato o quello globale
      // In questa implementazione semplificata, ritorniamo il più recente
      // In futuro potremmo volere un record 'globale' o aggregare i dati
      return (await query.orderBy(desc(userProgress.updatedAt)).limit(1))[0];
    }
    
    const [progress] = await query;
    return progress;
  }

  async upsertUserProgress(progress: Partial<UserProgress> & { userId: string }): Promise<UserProgress> {
    // Cerca se esiste già un record per questo utente (e concorso se specificato)
    let existing;
    
    if (progress.concorsoId) {
      [existing] = await db
        .select()
        .from(userProgress)
        .where(and(eq(userProgress.userId, progress.userId), eq(userProgress.concorsoId, progress.concorsoId)));
    } else {
      // Se non è specificato il concorso, cerchiamo un record generico o l'ultimo
      // Ma per upsert, se manca concorsoId, assumiamo che si voglia aggiornare un record esistente o crearne uno nuovo
      // Per semplicità, richiediamo concorsoId per creare nuovi record specifici, 
      // o usiamo una logica diversa.
      // Qui: se manca concorsoId, cerchiamo l'ultimo modificato
       [existing] = await db
        .select()
        .from(userProgress)
        .where(eq(userProgress.userId, progress.userId))
        .orderBy(desc(userProgress.updatedAt))
        .limit(1);
    }

    if (existing) {
      const [updated] = await db
        .update(userProgress)
        .set({ ...progress, updatedAt: new Date() })
        .where(eq(userProgress.id, existing.id))
        .returning();
      return updated;
    }

    // Se non esiste, crea nuovo (richiede concorsoId per essere utile nel nostro schema attuale)
    // Se manca concorsoId in creazione, potrebbe fallire se il DB lo richiede not null
    // Nel nostro schema, concorsoId è references concorsi, quindi potrebbe essere null?
    // Controlliamo schema: concorsoId: uuid('concorso_id').references(() => concorsi.id), (nullable by default)
    const [newProgress] = await db.insert(userProgress).values(progress as any).returning();
    return newProgress;
  }

  async createMaterial(material: InsertMaterial): Promise<Material> {
    const [newMaterial] = await db.insert(materials).values(material).returning();
    return newMaterial;
  }

  async getMaterials(userId: string, concorsoId: string): Promise<Material[]> {
    return await db
      .select()
      .from(materials)
      .where(and(eq(materials.userId, userId), eq(materials.concorsoId, concorsoId)))
      .orderBy(desc(materials.createdAt));
  }
  
  async getMaterial(id: string, userId: string): Promise<Material | undefined> {
    const [material] = await db
      .select()
      .from(materials)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)));
    return material;
  }

  async deleteMaterial(id: string, userId: string): Promise<boolean> {
    // 1. Get material to know concorsoId for progress update
    const material = await this.getMaterial(id, userId);
    if (!material) return false;

    // 2. Delete associated flashcards (match by materialId OR fonte name for backward compatibility)
    await db
      .delete(flashcards)
      .where(
        and(
          eq(flashcards.userId, userId),
          or(
            eq(flashcards.materialId, id),
            eq(flashcards.fonte, material.nome)
          )
        )
      );

    // 3. Delete the material
    const [deleted] = await db
      .delete(materials)
      .where(and(eq(materials.id, id), eq(materials.userId, userId)))
      .returning();
      
    // 4. Update progress stats (recalculate totals for the concorso)
    if (deleted && material.concorsoId) {
        // Get remaining flashcards for this concorso
        const allFlashcards = await this.getFlashcards(userId, material.concorsoId);
        const flashcardMasterate = allFlashcards.filter(f => f.masterate).length;
        
        await this.upsertUserProgress({
            userId,
            concorsoId: material.concorsoId,
            flashcardTotali: allFlashcards.length,
            flashcardMasterate
        });
    }

    return !!deleted;
  }
  
  async updateMaterial(id: string, userId: string, data: Partial<InsertMaterial>): Promise<Material | undefined> {
    const [updated] = await db
      .update(materials)
      .set({ ...data })
      .where(and(eq(materials.id, id), eq(materials.userId, userId)))
      .returning();
    return updated;
  }

  async createFlashcards(newFlashcards: InsertFlashcard[]): Promise<Flashcard[]> {
    if (newFlashcards.length === 0) return [];
    return await db.insert(flashcards).values(newFlashcards).returning();
  }

  async deleteFlashcardsByMaterialId(userId: string, materialId: string): Promise<number> {
    const deleted = await db
      .delete(flashcards)
      .where(and(eq(flashcards.userId, userId), eq(flashcards.materialId, materialId)))
      .returning();
    return deleted.length;
  }

  async getFlashcards(userId: string, concorsoId?: string): Promise<Flashcard[]> {
    if (concorsoId) {
      return await db
        .select()
        .from(flashcards)
        .where(and(eq(flashcards.userId, userId), eq(flashcards.concorsoId, concorsoId)))
        .orderBy(desc(flashcards.createdAt));
    }
    return await db
      .select()
      .from(flashcards)
      .where(eq(flashcards.userId, userId))
      .orderBy(desc(flashcards.createdAt));
  }
  
  async getFlashcard(id: string, userId: string): Promise<Flashcard | undefined> {
    const [flashcard] = await db
      .select()
      .from(flashcards)
      .where(and(eq(flashcards.id, id), eq(flashcards.userId, userId)));
    return flashcard;
  }
  
  async updateFlashcard(id: string, userId: string, data: Partial<InsertFlashcard>): Promise<Flashcard | undefined> {
    const [updated] = await db
      .update(flashcards)
      .set({ ...data })
      .where(and(eq(flashcards.id, id), eq(flashcards.userId, userId)))
      .returning();
    return updated;
  }
  
  async deleteFlashcard(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(flashcards)
      .where(and(eq(flashcards.id, id), eq(flashcards.userId, userId)))
      .returning();
    return !!deleted;
  }

  async deleteFlashcardsByMateria(userId: string, concorsoId: string, materia: string): Promise<number> {
    // 1. Delete flashcards
    const deleted = await db
      .delete(flashcards)
      .where(
        and(
          eq(flashcards.userId, userId),
          eq(flashcards.concorsoId, concorsoId),
          eq(flashcards.materia, materia)
        )
      )
      .returning();
      
    // 2. Update materials stats (reset flashcardGenerate count for materials of this subject)
    if (deleted.length > 0) {
      await db.update(materials)
        .set({ flashcardGenerate: 0 })
        .where(
          and(
             eq(materials.userId, userId),
             eq(materials.concorsoId, concorsoId),
             eq(materials.materia, materia)
          )
        );

      // 3. Update user progress
      const allFlashcards = await this.getFlashcards(userId, concorsoId);
      const flashcardMasterate = allFlashcards.filter(f => f.masterate).length;
      
      await this.upsertUserProgress({
          userId,
          concorsoId,
          flashcardTotali: allFlashcards.length,
          flashcardMasterate
      });
    }

    return deleted.length;
  }

  // Calendar Events Implementation
  async getCalendarEvents(userId: string): Promise<CalendarEventItem[]> {
    return await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.userId, userId))
      .orderBy(desc(calendarEvents.date));
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEventItem> {
    const [newEvent] = await db.insert(calendarEvents).values(event).returning();
    return newEvent;
  }

  async updateCalendarEvent(id: string, userId: string, data: Partial<InsertCalendarEvent>): Promise<CalendarEventItem | undefined> {
    const [updated] = await db
      .update(calendarEvents)
      .set(data)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
      .returning();
    return updated;
  }

  async deleteCalendarEvent(id: string, userId: string): Promise<boolean> {
    const [deleted] = await db
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
      .returning();
    return !!deleted;
  }
}

export const storage = new DatabaseStorage();
export { simulazioniStorage } from './storage-simulazioni';
// Export SQ3R storage 
export { storageSQ3R } from './storage-sq3r';
// Export Libreria storage 
export { storageLibreria } from './storage-libreria';
export { storageNormativa } from './storage-normativa';
