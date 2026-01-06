
import pg from 'pg';
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkTables() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in DB:', res.rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

checkTables();
