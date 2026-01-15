
import dotenv from 'dotenv';
dotenv.config();
import { pool } from './server/db';

async function checkColumns() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'fase3_error_bins';
    `);
    console.log("Columns in fase3_error_bins:");
    console.table(result.rows);
  } catch (err) {
    console.error("Error checking columns:", err);
  } finally {
    await pool.end();
  }
}

checkColumns();
