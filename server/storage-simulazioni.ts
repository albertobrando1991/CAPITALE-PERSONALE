import {
  type Simulazione,
  type InsertSimulazione,
  simulazioni,
} from "../shared/schema-simulazioni";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

/**
 * Storage functions per gestire le simulazioni d'esame
 */
export class SimulazioniStorage {
  /**
   * Crea una nuova simulazione
   */
  async createSimulazione(data: InsertSimulazione): Promise<Simulazione> {
    const [created] = await db.insert(simulazioni).values(data).returning();
    return created;
  }

  /**
   * Recupera una simulazione specifica per ID e userId
   */
  async getSimulazione(id: string, userId: string): Promise<Simulazione | undefined> {
    const [simulazione] = await db
      .select()
      .from(simulazioni)
      .where(and(eq(simulazioni.id, id), eq(simulazioni.userId, userId)))
      .limit(1);
    return simulazione;
  }

  /**
   * Recupera tutte le simulazioni di un utente, opzionalmente filtrate per concorso
   */
  async getSimulazioni(userId: string, concorsoId?: string): Promise<Simulazione[]> {
    if (concorsoId) {
      return await db
        .select()
        .from(simulazioni)
        .where(
          and(
            eq(simulazioni.userId, userId),
            eq(simulazioni.concorsoId, concorsoId)
          )
        )
        .orderBy(desc(simulazioni.createdAt));
    }
    return await db
      .select()
      .from(simulazioni)
      .where(eq(simulazioni.userId, userId))
      .orderBy(desc(simulazioni.createdAt));
  }

  /**
   * Aggiorna una simulazione esistente
   */
  async updateSimulazione(
    id: string,
    userId: string,
    data: Partial<InsertSimulazione>
  ): Promise<Simulazione | undefined> {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    const [updated] = await db
      .update(simulazioni)
      .set(updateData)
      .where(and(eq(simulazioni.id, id), eq(simulazioni.userId, userId)))
      .returning();
    return updated;
  }

  /**
   * Elimina una simulazione
   */
  async deleteSimulazione(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(simulazioni)
      .where(and(eq(simulazioni.id, id), eq(simulazioni.userId, userId)))
      .returning();
    return result.length > 0;
  }
}

export const simulazioniStorage = new SimulazioniStorage();


