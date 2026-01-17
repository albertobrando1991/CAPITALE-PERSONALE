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
}

export const storageNormativa = new StorageNormativa();
