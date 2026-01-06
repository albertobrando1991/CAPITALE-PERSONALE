import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function cleanDb() {
  const client = await pool.connect();
  try {
    console.log("Cleaning database...");
    
    // Drop known conflicting tables
    await client.query("DROP TABLE IF EXISTS simulazioni CASCADE");
    console.log("Dropped table simulazioni");

    // Drop known conflicting columns from materials
    try {
      await client.query("ALTER TABLE materials DROP COLUMN IF EXISTS file_url");
      console.log("Dropped column file_url from materials");
    } catch (e) {
      console.log("Column file_url might not exist or other error", e);
    }

    // Drop known conflicting columns from flashcards
    const flashcardColumns = [
      "intervallo_giorni",
      "numero_ripetizioni",
      "ease_factor",
      "ultimo_ripasso",
      "prossimo_ripasso"
    ];

    for (const col of flashcardColumns) {
      try {
        await client.query(`ALTER TABLE flashcards DROP COLUMN IF EXISTS ${col}`);
        console.log(`Dropped column ${col} from flashcards`);
      } catch (e) {
        console.log(`Column ${col} might not exist`, e);
      }
    }

    console.log("Database cleanup complete.");
  } catch (err) {
    console.error("Error cleaning database:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDb();
