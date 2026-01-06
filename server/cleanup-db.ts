
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

async function dropTables() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("Dropping tables...");
    // Drop tables that were changed significantly to allow clean recreation
    await pool.query(`DROP TABLE IF EXISTS notebooklm_sessions CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS catalogo_edises CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS podcast_database CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS podcast_requests CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS podcast_listens CASCADE;`);
    await pool.query(`DROP TABLE IF EXISTS user_subscriptions CASCADE;`);
    console.log("Tables dropped successfully.");
  } catch (err) {
    console.error("Error dropping tables:", err);
  } finally {
    await pool.end();
  }
}

dropTables();
