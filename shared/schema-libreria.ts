import { pgTable, uuid, text, timestamp, integer, boolean, varchar } from 'drizzle-orm/pg-core';
import { users } from './schema-base';

// Materie disponibili (enum centralizzato)
export const materieEnum = [
  'Diritto Amministrativo',
  'Diritto Costituzionale',
  'Diritto Civile',
  'Contabilità Pubblica',
  'Economia Aziendale',
  'Informatica',
  'Lingua Inglese',
  'Logica',
  'Storia',
  'Geografia',
  'Testi Specifici per Concorsi Pubblici',
  'Altro'
] as const;

// Helper type per il cast in frontend se necessario
export type MateriaEnum = typeof materieEnum[number];

// Tabella documenti pubblici
export const documentiPubblici = pgTable('documenti_pubblici', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Metadati documento
  titolo: text('titolo').notNull(),
  descrizione: text('descrizione'),
  materia: text('materia').notNull(), // una delle materieEnum
  tags: text('tags').array(), // ["concorso", "quiz", "teoria"]
  
  // File
  pdfUrl: text('pdf_url'), // URL storage cloud (opzionale se usiamo base64)
  pdfBase64: text('pdf_base64'), // Storage base64 temporaneo
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(), // bytes
  numPages: integer('num_pages'), // numero pagine PDF
  
  // Metadata
  uploadedBy: varchar('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  isStaffOnly: boolean('is_staff_only').default(false), // documento riservato staff
  downloadsCount: integer('downloads_count').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabella log download (opzionale - per analytics)
export const downloadLog = pgTable('download_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentoId: uuid('documento_id').references(() => documentiPubblici.id, { onDelete: 'cascade' }),
  userId: varchar('user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
