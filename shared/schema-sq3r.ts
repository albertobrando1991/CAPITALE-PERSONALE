import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, real, pgEnum } from 'drizzle-orm/pg-core';
import { users, concorsi } from './schema';
import { documentiPubblici } from './schema-libreria';
import { uuid } from 'drizzle-orm/pg-core';

export const materiaEnum = pgEnum('materia', [
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
  'Diritto del Lavoro',
  'Altro'
]);

// ============================================
// CATALOGO EDISES
// ============================================
export const catalogoEdises = pgTable('catalogo_edises', {
  id: uuid('id').defaultRandom().primaryKey(),
  isbn: text('isbn').notNull().unique(),
  titolo: text('titolo').notNull(),
  autore: text('autore'),
  materia: materiaEnum('materia').notNull(),
  descrizione: text('descrizione'),
  copertina: text('copertina'), // URL immagine
  prezzo: integer('prezzo'), // in centesimi
  linkAcquisto: text('link_acquisto').notNull(), // link affiliato
  linkAffiliato: text('link_affiliato').notNull(), // con UTM
  numPagine: integer('num_pagine'),
  anno: integer('anno'),
  popolare: boolean('popolare').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export type CatalogoEdises = typeof catalogoEdises.$inferSelect;
export type InsertCatalogoEdises = typeof catalogoEdises.$inferInsert;

// ============================================
// FONTI DI STUDIO
// ============================================
export const fontiStudio = pgTable('fonti_studio', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  concorsoId: varchar('concorso_id').notNull().references(() => concorsi.id, { onDelete: 'cascade' }),
  
  // Tipo fonte
  tipo: text('tipo').notNull(), // 'edises' | 'personale' | 'notebooklm' | 'libreria'
  titolo: text('titolo').notNull(),
  autore: text('autore'),
  materia: text('materia'),
  descrizione: text('descrizione'),
  
  // File (se tipo = 'personale' o 'libreria')
  fileUrl: text('file_url'),
  fileSize: integer('file_size'), // bytes
  fileType: text('file_type'), // 'pdf' | 'docx' | 'txt'
  numeroTotalePagine: integer('numero_totale_pagine'),
  
  // Collegamento a Libreria Pubblica
  documentoLibreriaId: uuid('documento_libreria_id').references(() => documentiPubblici.id, { onDelete: 'set null' }),

  // Metadata Edises (se tipo = 'edises')
  edisesProductId: text('edises_product_id'),
  edisesISBN: text('edises_isbn'),
  edisesLinkAcquisto: text('edises_link_acquisto'),
  edisesPrezzo: real('edises_prezzo'),
  
  // NotebookLM (se tipo = 'notebooklm')
  notebookLmSourceId: text('notebooklm_source_id'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type FonteStudio = typeof fontiStudio.$inferSelect;
export type InsertFonteStudio = typeof fontiStudio.$inferInsert;

// ============================================
// MATERIE SQ3R
// ============================================
export const materieSQ3R = pgTable('materie_sq3r', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  concorsoId: varchar('concorso_id').notNull().references(() => concorsi.id, { onDelete: 'cascade' }),
  
  nomeMateria: text('nome_materia').notNull(),
  fonteId: varchar('fonte_id').references(() => fontiStudio.id, { onDelete: 'set null' }),
  
  // UI
  ordine: integer('ordine').default(0),
  colore: text('colore').default('#3B82F6'),
  icona: text('icona'), // emoji o nome icona
  
  // Statistiche
  capitoliTotali: integer('capitoli_totali').default(0).notNull(),
  capitoliCompletati: integer('capitoli_completati').default(0).notNull(),
  oreStudioTotali: integer('ore_studio_totali').default(0), // minuti
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type MateriaSQ3R = typeof materieSQ3R.$inferSelect;
export type InsertMateriaSQ3R = typeof materieSQ3R.$inferInsert;

// ============================================
// CAPITOLI SQ3R
// ============================================
export const capitoliSQ3R = pgTable('capitoli_sq3r', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  materiaId: varchar('materia_id').notNull().references(() => materieSQ3R.id, { onDelete: 'cascade' }),
  
  // Informazioni capitolo
  numeroCapitolo: integer('numero_capitolo').notNull(),
  titolo: text('titolo').notNull(),
  pagineInizio: integer('pagine_inizio'),
  pagineFine: integer('pagine_fine'),
  
  // PDF
  pdfUrl: text('pdf_url'),
  pdfFileName: text('pdf_file_name'),
  pdfFileSize: integer('pdf_file_size'),
  pdfNumPages: integer('pdf_num_pages'),

  // ==========================================
  // FASE 1: SURVEY (Scansione - 5 min)
  // ==========================================
  surveyCompletato: boolean('survey_completato').default(false).notNull(),
  surveyDurata: integer('survey_durata'), // secondi
  surveyConcettiChiave: jsonb('survey_concetti_chiave').$type<string[]>(), // ["concetto1", "concetto2"]
  surveyChecklist: jsonb('survey_checklist').$type<{
    titoli: boolean;
    grassetti: boolean;
    schemi: boolean;
    sommario: boolean;
  }>(),
  surveyDataCompletamento: timestamp('survey_data_completamento'),
  
  // ==========================================
  // FASE 2: QUESTION (Domande Attive)
  // ==========================================
  questionCompletato: boolean('question_completato').default(false).notNull(),
  domande: jsonb('domande').$type<Array<{
    domanda: string;
    risposta?: string;
    datoManuale: boolean;
  }>>(), // domande create dall'utente
  domandeAI: jsonb('domande_ai').$type<Array<{
    concetto: string;
    suggerimenti: string[];
  }>>(), // suggerimenti AI
  questionDataCompletamento: timestamp('question_data_completamento'),
  
  // ==========================================
  // FASE 3: READ (Lettura Mirata)
  // ==========================================
  readCompletato: boolean('read_completato').default(false).notNull(),
  readPaginaCorrente: integer('read_pagina_corrente').default(0),
  readHighlights: jsonb('read_highlights').$type<Array<{
    id: string;
    pagina: number;
    testo: string;
    nota?: string;
    colore: string;
    posizione: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    timestamp: string;
  }>>(),
  readNote: jsonb('read_note').$type<Array<{
    id: string;
    pagina: number;
    contenuto: string;
    timestamp: string;
  }>>(),
  readTempoLettura: integer('read_tempo_lettura'), // minuti
  readDataCompletamento: timestamp('read_data_completamento'),
  
  // ==========================================
  // FASE 4: RECITE (Spiegazione Feynman)
  // ==========================================
  reciteCompletato: boolean('recite_completato').default(false).notNull(),
  reciteData: text('recite_data').$type<{ 
    tempoSecondi: number; 
    audioUrl?: string; 
    valutazione: number; // 1-5 
    noteRiflessione: string; 
    concettiDaRivedere: string[]; 
    completatoAt: Date; 
  }>(),
  reciteAudioUrl: text('recite_audio_url'),
  reciteDurata: integer('recite_durata'), // secondi
  reciteTranscript: text('recite_transcript'), // trascrizione audio
  reciteValutazioneAI: jsonb('recite_valutazione_ai').$type<{
    punteggio: number; // 0-10
    giudizio: string;
    puntiForza: string[];
    areeMigliorare: string[];
    lacune: string[];
  }>(),
  reciteDataCompletamento: timestamp('recite_data_completamento'),
  
  // ==========================================
  // FASE 5: REVIEW (Quiz di Verifica)
  // ==========================================
  reviewCompletato: boolean('review_completato').default(false).notNull(),
  reviewData: text('review_data').$type<{ 
    domande: Array<{ 
      domanda: string; 
      opzioni: string[]; 
      rispostaCorretta: number; 
      rispostaUtente?: number; 
      spiegazione: string; 
    }>; 
    punteggio?: number; 
    percentualeCorrette?: number; 
    completatoAt?: Date; 
  }>(),
  reviewQuizDomande: jsonb('review_quiz_domande').$type<Array<{
    domanda: string;
    opzioni: string[];
    rispostaCorretta: number;
    spiegazione: string;
  }>>(),
  reviewQuizRisultato: jsonb('review_quiz_risultato').$type<{
    risposteUtente: number[];
    risposteCorrette: number;
    totale: number;
    percentuale: number;
    timestamp: string;
  }>(),
  reviewDataCompletamento: timestamp('review_data_completamento'),
  
  // ==========================================
  // STATO GENERALE
  // ==========================================
  completato: boolean('completato').default(false).notNull(),
  faseCorrente: text('fase_corrente').default('survey'), // 'survey' | 'question' | 'read' | 'recite' | 'review'
  
  // Timestamp
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type CapitoloSQ3R = typeof capitoliSQ3R.$inferSelect;
export type InsertCapitoloSQ3R = typeof capitoliSQ3R.$inferInsert;

// ============================================
// NOTEBOOKLM SESSIONS
// ============================================
export const notebookLmSessions = pgTable('notebooklm_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  concorsoId: varchar('concorso_id').references(() => concorsi.id, { onDelete: 'cascade' }),
  
  // Fonte del file
  fonteFileUrl: text('fonte_file_url').notNull(), // PDF caricato
  fonteFileName: text('fonte_file_name'),
  fonteFileSize: integer('fonte_file_size'),
  
  // Tipo di output
  tipoOutput: text('tipo_output').notNull(), // 'podcast' | 'mind_map'
  
  // Impostazioni generazione
  lingua: text('lingua').default('IT'),
  durataPodcast: integer('durata_podcast'), // minuti (solo per podcast)
  stile: text('stile').default('conversazionale'), // conversazionale/formale
  
  // Risultati
  status: text('status').default('pending'), // pending/processing/completed/failed
  notebookId: text('notebook_id'), // ID Google NotebookLM
  
  // Output Podcast
  podcastUrl: text('podcast_url'), // URL
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type NotebookLmSession = typeof notebookLmSessions.$inferSelect;
export type InsertNotebookLmSession = typeof notebookLmSessions.$inferInsert;

// ==========================================
// BANCA DATI PODCAST (Caricati da Staff)
// ==========================================
export const podcastDatabase = pgTable('podcast_database', {
  id: uuid('id').defaultRandom().primaryKey(),
  
  // Metadata
  titolo: text('titolo').notNull(), // "Diritto Amministrativo - Procedimento Amministrativo"
  descrizione: text('descrizione'),
  materia: materiaEnum('materia').notNull(),
  argomento: text('argomento').notNull(), // "Procedimento Amministrativo", "Organi Amministrativi"
  
  // File Audio
  audioUrl: text('audio_url').notNull(), // URL MP3 (Supabase Storage o base64)
  audioFileName: text('audio_file_name'),
  audioFileSize: integer('audio_file_size'), // bytes
  durata: integer('durata'), // secondi
  
  // Trascrizione (opzionale, per ricerca full-text)
  trascrizione: text('trascrizione'),
  
  // Metadata
  uploadedBy: varchar('uploaded_by').notNull(), // Staff user ID (varchar per coerenza)
  isPublic: boolean('is_public').default(true), // Visibile a tutti premium
  isPremiumOnly: boolean('is_premium_only').default(true), // Solo per utenti premium
  
  // Analytics
  ascoltiTotali: integer('ascolti_totali').default(0),
  downloadTotali: integer('download_totali').default(0),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type PodcastDatabase = typeof podcastDatabase.$inferSelect;
export type InsertPodcastDatabase = typeof podcastDatabase.$inferInsert;

// ==========================================
// RICHIESTE PODCAST CUSTOM (da utenti premium)
// ==========================================
export const podcastRequests = pgTable('podcast_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  concorsoId: varchar('concorso_id').references(() => concorsi.id, { onDelete: 'cascade' }),
  
  // Richiesta
  materia: materiaEnum('materia').notNull(),
  argomento: text('argomento').notNull(), // "Vorrei un podcast su..."
  descrizione: text('descrizione'), // Dettagli aggiuntivi
  
  // Stato
  status: text('status').default('pending'), // pending/in_progress/completed/rejected
  priorita: text('priorita').default('normale'), // alta/normale/bassa
  
  // Risultato
  podcastId: uuid('podcast_id').references(() => podcastDatabase.id, { onDelete: 'set null' }),
  noteStaff: text('note_staff'), // Note interne
  
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

export type PodcastRequest = typeof podcastRequests.$inferSelect;
export type InsertPodcastRequest = typeof podcastRequests.$inferInsert;

// ==========================================
// LOG ASCOLTI PODCAST (analytics)
// ==========================================
export const podcastListens = pgTable('podcast_listens', {
  id: uuid('id').defaultRandom().primaryKey(),
  podcastId: uuid('podcast_id').references(() => podcastDatabase.id, { onDelete: 'cascade' }),
  userId: varchar('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  progressoSecondi: integer('progresso_secondi').default(0), // Per riprendere da dove interrotto
  completato: boolean('completato').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export type PodcastListen = typeof podcastListens.$inferSelect;
export type InsertPodcastListen = typeof podcastListens.$inferInsert;

// ============================================
// QUIZ SYSTEM (Relational)
// ============================================

export const quizzes = pgTable('quizzes', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  capitoloId: varchar('capitolo_id').notNull().references(() => capitoliSQ3R.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const questions = pgTable('questions', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  quizId: varchar('quiz_id').notNull().references(() => quizzes.id, { onDelete: 'cascade' }),
  questionText: text('question_text').notNull(),
  correctAnswerIndex: integer('correct_answer_index').notNull(),
  explanation: text('explanation'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const answers = pgTable('answers', {
  id: varchar('id').primaryKey().default(sql`gen_random_uuid()`),
  questionId: varchar('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  answerText: text('answer_text').notNull(),
  isCorrect: boolean('is_correct').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export type Quiz = typeof quizzes.$inferSelect;
export type InsertQuiz = typeof quizzes.$inferInsert;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

export type Answer = typeof answers.$inferSelect;
export type InsertAnswer = typeof answers.$inferInsert;
