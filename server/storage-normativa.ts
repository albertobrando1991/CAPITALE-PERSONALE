import { db } from './db';
import { norme } from '../shared/schema-normativa';
import { eq, or, ilike, sql } from 'drizzle-orm';

export class StorageNormativa {
  
  async searchNorme(filters: {
    query?: string;
    tipo?: string;
    anno?: number;
    limit?: number;
  }) {
    let queryBuilder = db.select().from(norme).$dynamic();
    
    const conditions: any[] = [];
    
    // Ricerca full-text su titolo e keywords
    if (filters.query) {
      const searchTerm = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(norme.titolo, searchTerm),
          ilike(norme.titoloBreve, searchTerm),
          ilike(norme.numero, searchTerm),
          sql`${filters.query} = ANY(${norme.keywords})`
        )
      );
    }
    
    // Filtro tipo
    if (filters.tipo) {
      conditions.push(eq(norme.tipo, filters.tipo));
    }
    
    // Filtro anno
    if (filters.anno) {
      conditions.push(eq(norme.anno, filters.anno));
    }
    
    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(or(...conditions));
    }
    
    // Ordina per anno decrescente
    queryBuilder = queryBuilder.orderBy(sql`${norme.anno} DESC, ${norme.data} DESC`);
    
    // Limita risultati
    if (filters.limit) {
      queryBuilder = queryBuilder.limit(filters.limit);
    }
    
    const risultati = await queryBuilder;
    console.log(`🔍 Trovate ${risultati.length} norme per query: ${filters.query}`);
    
    return risultati;
  }

  async getNorma(id: string) {
    const [norma] = await db.select().from(norme).where(eq(norme.id, id));
    return norma;
  }

  async getNormaByUrn(urn: string) {
    const [norma] = await db.select().from(norme).where(eq(norme.urn, urn));
    return norma;
  }

  async createNorma(data: {
    urn: string;
    tipo: string;
    numero?: string;
    anno: number;
    data?: string;
    titolo: string;
    titoloBreve?: string;
    keywords?: string[];
    urlNormattiva: string;
    gazzettaUfficiale?: string;
  }) {
    const [norma] = await db.insert(norme).values({
      ...data,
    }).returning();
    return norma;
  }

  async updateNorma(id: string, data: Partial<{
    urn: string;
    tipo: string;
    numero: string;
    anno: number;
    data: string;
    titolo: string;
    titoloBreve: string;
    keywords: string[];
    urlNormattiva: string;
    gazzettaUfficiale: string;
  }>) {
    const [norma] = await db
      .update(norme)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(norme.id, id))
      .returning();
    return norma;
  }

  async deleteNorma(id: string) {
    const [deleted] = await db
      .delete(norme)
      .where(eq(norme.id, id))
      .returning();
    return deleted;
  }

  async getAllNorme(filters: {
    tipo?: string;
    anno?: number;
    limit?: number;
    offset?: number;
  }) {
    let queryBuilder = db.select().from(norme).$dynamic();

    const conditions: any[] = [];

    if (filters.tipo) {
      conditions.push(eq(norme.tipo, filters.tipo));
    }

    if (filters.anno) {
      conditions.push(eq(norme.anno, filters.anno));
    }

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(or(...conditions));
    }

    queryBuilder = queryBuilder.orderBy(sql`${norme.anno} DESC, ${norme.data} DESC`);

    if (filters.limit) {
      queryBuilder = queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder = queryBuilder.offset(filters.offset);
    }

    return await queryBuilder;
  }
}

export const storageNormativa = new StorageNormativa();
