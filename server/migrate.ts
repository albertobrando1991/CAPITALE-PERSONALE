import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./db";

export async function runMigrations() {
  if (!db) {
    console.log("Skipping migrations: No database connection");
    return;
  }

  try {
    console.log("Running migrations...");
    // migrationsFolder must be relative to the process cwd
    await migrate(db, { migrationsFolder: "migrations" });
    console.log("Migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    // Don't exit process, let the app try to start even if migrations fail
    // (though it might fail later)
  }
}
