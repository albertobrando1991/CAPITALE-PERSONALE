// Run migration 0006: Add bando_pdf_url to official_concorsi
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

async function runMigration() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    console.log('Running migration 0006...');
    const migrationPath = path.join(__dirname, '..', 'migrations', '0006_add_bando_pdf_url.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('SQL:', sql);
    await client.query(sql);

    console.log('Migration 0006 completed successfully!');
    client.release();
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
