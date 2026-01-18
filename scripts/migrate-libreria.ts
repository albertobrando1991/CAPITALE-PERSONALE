/**
 * Script per creare le tabelle della Libreria Pubblica
 * Esegui con: npx tsx scripts/migrate-libreria.ts
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Allow self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL non trovata');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🔄 Avvio migrazione tabelle Libreria Pubblica...\n');

    // 1. Create materie table
    console.log('📁 Creazione tabella materie...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "materie" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "nome" text NOT NULL UNIQUE,
        "ordine" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('✅ Tabella materie creata');

    // 2. Create documenti_pubblici table
    console.log('📄 Creazione tabella documenti_pubblici...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "documenti_pubblici" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "titolo" text NOT NULL,
        "descrizione" text,
        "materia" text NOT NULL,
        "tags" text[],
        "pdf_url" text,
        "pdf_base64" text,
        "file_name" text NOT NULL,
        "file_size" integer NOT NULL,
        "num_pages" integer,
        "uploaded_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
        "is_staff_only" boolean DEFAULT false,
        "downloads_count" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('✅ Tabella documenti_pubblici creata');

    // 3. Create download_log table
    console.log('📊 Creazione tabella download_log...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "download_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "documento_id" uuid REFERENCES "documenti_pubblici"("id") ON DELETE CASCADE,
        "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('✅ Tabella download_log creata');

    // 4. Create indexes
    console.log('🔍 Creazione indici...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_documenti_pubblici_materia" ON "documenti_pubblici"("materia");
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_documenti_pubblici_created_at" ON "documenti_pubblici"("created_at" DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_download_log_documento_id" ON "download_log"("documento_id");
    `);
    console.log('✅ Indici creati');

    // 5. Seed initial materie
    console.log('🌱 Inserimento materie iniziali...');
    const materieIniziali = [
      ['Diritto Amministrativo', 1],
      ['Diritto Costituzionale', 2],
      ['Diritto Civile', 3],
      ['Contabilità Pubblica', 4],
      ['Economia Aziendale', 5],
      ['Informatica', 6],
      ['Lingua Inglese', 7],
      ['Logica', 8],
      ['Storia', 9],
      ['Geografia', 10],
      ['Testi Specifici per Concorsi Pubblici', 11],
      ['Altro', 12]
    ];

    for (const [nome, ordine] of materieIniziali) {
      await client.query(`
        INSERT INTO "materie" ("nome", "ordine")
        VALUES ($1, $2)
        ON CONFLICT ("nome") DO NOTHING
      `, [nome, ordine]);
    }
    console.log('✅ Materie iniziali inserite');

    // 6. Verify
    const result = await client.query('SELECT COUNT(*) FROM materie');
    console.log(`\n🎉 Migrazione completata! ${result.rows[0].count} materie nel database.`);

  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
