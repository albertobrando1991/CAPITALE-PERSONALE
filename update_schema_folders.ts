
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL?.replace('?sslmode=require', ''),
  ssl: { rejectUnauthorized: false },
});

async function updateSchema() {
  const client = await pool.connect();
  try {
    console.log("Updating Schema for Folders...");
    
    // Create cartelle_libreria table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cartelle_libreria (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text NOT NULL,
        descrizione text,
        colore text DEFAULT '#3b82f6',
        icona text DEFAULT 'folder',
        parent_id uuid,
        created_at timestamptz DEFAULT now() NOT NULL
      );
    `);

    // Add folder_id to documenti_pubblici
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documenti_pubblici' AND column_name = 'folder_id') THEN
          ALTER TABLE documenti_pubblici ADD COLUMN folder_id text;
        END IF;
      END
      $$;
    `);

    console.log("Schema update complete.");

  } catch (err) {
    console.error("Error updating schema:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

updateSchema();
