
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL?.replace('?sslmode=require', ''),
  ssl: { rejectUnauthorized: false },
});

async function createTables() {
  const client = await pool.connect();
  try {
    console.log("Creating tables...");
    
    // Create user_roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL UNIQUE,
        role varchar(50) NOT NULL DEFAULT 'user',
        assigned_by varchar,
        assigned_at timestamptz DEFAULT now()
      );
    `);
    console.log("Table user_roles created or already exists.");

    // Create role_permissions
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        role varchar(50) NOT NULL,
        permission varchar(100) NOT NULL,
        UNIQUE(role, permission)
      );
    `);
    console.log("Table role_permissions created or already exists.");

    // Create admin_activity_log
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_activity_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id varchar NOT NULL,
        action varchar(100) NOT NULL,
        entity_type varchar(50),
        entity_id varchar,
        details jsonb,
        ip_address text,
        created_at timestamptz DEFAULT now()
      );
    `);
    console.log("Table admin_activity_log created or already exists.");

    // Create admin_settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key varchar(100) NOT NULL UNIQUE,
        value jsonb NOT NULL,
        description text,
        updated_by varchar,
        updated_at timestamptz DEFAULT now()
      );
    `);
    console.log("Table admin_settings created or already exists.");

    // Create user_suspensions
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_suspensions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        reason text NOT NULL,
        suspended_by varchar NOT NULL,
        suspended_at timestamptz DEFAULT now(),
        expires_at timestamptz,
        is_active boolean DEFAULT true
      );
    `);
    console.log("Table user_suspensions created or already exists.");

  } catch (err) {
    console.error("Error creating tables:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

createTables().then(() => {
    console.log("Tables setup complete.");
});
