import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const connectionString = process.env.DATABASE_URL;

export const pool: pg.Pool | null = connectionString
  ? new pg.Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    })
  : null;

// Add error handler to prevent app crash on connection loss
if (pool) {
  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });
}

export const db = pool ? drizzle(pool, { schema }) : (null as any);
