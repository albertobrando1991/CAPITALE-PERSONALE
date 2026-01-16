
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL?.replace('?sslmode=require', ''),
  ssl: { rejectUnauthorized: false },
});

async function createAuditTables() {
  const client = await pool.connect();
  try {
    console.log("Creating Audit & Security tables...");
    
    // Create audit_logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar,
        user_email text,
        user_role text,
        action_type text NOT NULL,
        action_category text NOT NULL,
        action_description text,
        entity_type text,
        entity_id varchar,
        entity_name text,
        old_value jsonb,
        new_value jsonb,
        ip_address varchar(45),
        user_agent text,
        request_path text,
        request_method text,
        metadata jsonb DEFAULT '{}'::jsonb,
        status text DEFAULT 'success',
        error_message text,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log("Table audit_logs created or already exists.");

    // Create security_alerts
    await client.query(`
      CREATE TABLE IF NOT EXISTS security_alerts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_name text NOT NULL,
        severity text NOT NULL,
        message text NOT NULL,
        data jsonb,
        resolved boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        resolved_at timestamptz,
        resolved_by varchar
      );
    `);
    console.log("Table security_alerts created or already exists.");

  } catch (err) {
    console.error("Error creating tables:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

createAuditTables().then(() => {
    console.log("Audit tables setup complete.");
});
