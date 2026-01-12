
import "dotenv/config";
import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Fixing database schema...");
    
    // Add material_id to flashcards
    await db.execute(sql`ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS material_id varchar;`);
    console.log("Added material_id to flashcards");

    // Add user_id to flashcards
    await db.execute(sql`ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS user_id varchar;`);
    console.log("Added user_id to flashcards");

    // Add user_id to materials
    await db.execute(sql`ALTER TABLE materials ADD COLUMN IF NOT EXISTS user_id varchar;`);
    console.log("Added user_id to materials");

    console.log("Database fix completed successfully.");
  } catch (error) {
    console.error("Error executing database fix:", error);
  }
  process.exit(0);
}

main();
