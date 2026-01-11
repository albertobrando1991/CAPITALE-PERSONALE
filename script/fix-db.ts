import * as dotenv from "dotenv";
dotenv.config();
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    console.log("Fixing DB schema...");
    
    // Flashcards
    console.log("Updating flashcards table...");
    await db.execute(sql`ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS user_id varchar`);
    await db.execute(sql`UPDATE flashcards SET user_id = 'user-dev' WHERE user_id IS NULL`);
    // await db.execute(sql`ALTER TABLE flashcards ALTER COLUMN user_id SET NOT NULL`);

    // Materials
    console.log("Updating materials table...");
    await db.execute(sql`ALTER TABLE materials ADD COLUMN IF NOT EXISTS user_id varchar`);
    await db.execute(sql`UPDATE materials SET user_id = 'user-dev' WHERE user_id IS NULL`);

    console.log("DB Fixed successfully");
    process.exit(0);
  } catch (e) {
    console.error("Error fixing DB:", e);
    process.exit(1);
  }
}

main();
