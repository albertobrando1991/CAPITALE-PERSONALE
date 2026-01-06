import { db } from './db';
import { documentiPubblici, downloadLog } from '@shared/schema-libreria';
import { eq, and, desc, sql } from 'drizzle-orm';

export class StorageLibreria {
  // ========== DOCUMENTI ==========
  
  async createDocumento(data: {
    titolo: string;
    descrizione?: string;
    materia: string;
    tags?: string[];
    pdfUrl?: string;
    pdfBase64?: string;
    fileName: string;
    fileSize: number;
    numPages?: number;
    uploadedBy: string;
    isStaffOnly?: boolean;
  }) {
    const [documento] = await db.insert(documentiPubblici)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    console.log('✅ Documento pubblico creato:', documento.id);
    return documento;
  }

  async getDocumenti(filters?: {
    materia?: string;
    search?: string;
    staffOnly?: boolean;
    limit?: number;
  }) {
    // Start with a base query builder
    let query = db.select().from(documentiPubblici).$dynamic();
    
    const conditions = [];
    
    if (filters?.materia) {
      conditions.push(eq(documentiPubblici.materia, filters.materia));
    }
    
    if (filters?.search) {
      conditions.push(
        sql`${documentiPubblici.titolo} ILIKE ${`%${filters.search}%`}`
      );
    }
    
    if (!filters?.staffOnly) {
      conditions.push(eq(documentiPubblici.isStaffOnly, false));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    query = query.orderBy(desc(documentiPubblici.createdAt));
    
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    return await query;
  }

  async getDocumento(id: string) {
    const [documento] = await db
      .select()
      .from(documentiPubblici)
      .where(eq(documentiPubblici.id, id));
    
    return documento;
  }

  async updateDocumento(id: string, data: Partial<typeof documentiPubblici.$inferInsert>) {
    const [updated] = await db
      .update(documentiPubblici)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documentiPubblici.id, id))
      .returning();
    
    console.log('✅ Documento aggiornato:', id);
    return updated;
  }

  async deleteDocumento(id: string) {
    await db.delete(documentiPubblici).where(eq(documentiPubblici.id, id));
    console.log('🗑️ Documento eliminato:', id);
  }

  // Incrementa counter download
  async incrementDownloads(documentoId: string, userId?: string) {
    await db
      .update(documentiPubblici)
      .set({ downloadsCount: sql`${documentiPubblici.downloadsCount} + 1` })
      .where(eq(documentiPubblici.id, documentoId));
    
    // Log download (opzionale)
    if (userId) {
      await db.insert(downloadLog).values({
        documentoId,
        userId,
        createdAt: new Date(),
      });
    }
  }
}

export const storageLibreria = new StorageLibreria();
