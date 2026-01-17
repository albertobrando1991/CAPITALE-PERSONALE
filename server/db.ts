import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

// Add error handler to prevent app crash on connection loss
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });
