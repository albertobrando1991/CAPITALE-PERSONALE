import { defineConfig } from "drizzle-kit";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const connectionString = process.env.DATABASE_URL;

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: { rejectUnauthorized: false },
  },
});
