import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';

// Tipi di atti normativi
export const tipiNormaEnum = [
  'Legge',
  'Decreto Legge',
  'Decreto Legislativo',
  'DPR',
  'DPCM',
  'Decreto Ministeriale',
  'Costituzione',
  'Codice',
  'Regolamento UE',
  'Direttiva UE',
  'Altro'
] as const;

// Tabella indice norme (SOLO METADATI)
export const norme = pgTable('norme', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // URN (Uniform Resource Name) - identificativo ufficiale
  // Esempio: urn:nir:stato:legge:2003-06-30;196
  urn: text('urn').notNull().unique(),
  
  // Metadati norma
  tipo: text('tipo').notNull(), // uno dei tipiNormaEnum
  numero: text('numero'), // es. "196"
  anno: integer('anno').notNull(), // es. 2003
  data: text('data'), // es. "2003-06-30"
  
  // Titolo e descrizione
  titolo: text('titolo').notNull(),
  titoloBreve: text('titolo_breve'), // es. "Codice Privacy"
  
  // Keywords per ricerca full-text
  keywords: text('keywords').array(), // ["privacy", "dati personali", "gdpr"]
  
  // URL fonte ufficiale (Normattiva)
  urlNormattiva: text('url_normattiva').notNull(),
  
  // Metadata
  gazzettaUfficiale: text('gazzetta_ufficiale'), // es. "GU Serie Generale n.174 del 29-07-2003"
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Indici per performance
// CREATE INDEX idx_norme_anno ON norme(anno);
// CREATE INDEX idx_norme_tipo ON norme(tipo);
// CREATE INDEX idx_norme_keywords ON norme USING GIN(keywords);
