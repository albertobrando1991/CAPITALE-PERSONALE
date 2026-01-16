
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
    console.log("Updating User Schema...");
    
    // Add password column if not exists
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password') THEN
          ALTER TABLE users ADD COLUMN password text;
        END IF;
      END
      $$;
    `);

    // Add is_verified column if not exists
    await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_verified') THEN
            ALTER TABLE users ADD COLUMN is_verified boolean DEFAULT false;
          END IF;
        END
        $$;
      `);

    // Add verification_token column if not exists
    await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'verification_token') THEN
            ALTER TABLE users ADD COLUMN verification_token text;
          END IF;
        END
        $$;
      `);

    console.log("Creating Staff Invitations Table...");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_invitations (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL,
        role text NOT NULL DEFAULT 'staff',
        token text NOT NULL UNIQUE,
        invited_by varchar NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now()
      );
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
