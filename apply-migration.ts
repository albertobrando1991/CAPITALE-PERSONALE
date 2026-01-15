import 'dotenv/config'; // Load env vars
import { pool } from './server/db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function run() {
  try {
    const sqlPath = join(process.cwd(), 'migrations', '0004_add_generated_questions_to_drill_sessions.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    console.log('Applying migration...');
    await pool.query(sql);
    console.log('Migration applied successfully!');
  } catch (e) {
    console.error('Error applying migration:', e);
  } finally {
    process.exit(0);
  }
}

run();
