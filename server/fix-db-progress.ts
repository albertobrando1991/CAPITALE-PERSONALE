
import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    const dbUrl = process.env.DATABASE_URL;
    console.log("DATABASE_URL exists:", !!dbUrl);
    if (dbUrl) {
      console.log("DATABASE_URL starts with:", dbUrl.substring(0, 15));
      console.log("DATABASE_URL contains localhost:", dbUrl.includes("localhost"));
      console.log("DATABASE_URL contains 5432:", dbUrl.includes("5432"));
    }

    console.log("Fixing database schema for user_progress...");
    
    // Add columns to user_progress
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS streak_days integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS last_activity_date timestamp;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS total_study_minutes integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS livello_percentuale integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS fase_corrente integer DEFAULT 1;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS fase1_completata boolean DEFAULT false;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS fase2_completata boolean DEFAULT false;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS fase3_completata boolean DEFAULT false;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS fase4_completata boolean DEFAULT false;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS flashcard_masterate integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS flashcard_totali integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS quiz_completati integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS ore_studio_totali integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS serie_attiva integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS record_serie integer DEFAULT 0;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS flashcard_session jsonb;`);
    await db.execute(sql`ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();`);

    console.log("Database fix completed successfully.");
  } catch (error) {
    console.error("Error executing database fix:", error);
  }
  process.exit(0);
}

main();
