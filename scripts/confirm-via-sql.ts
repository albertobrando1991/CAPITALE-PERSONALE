
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Import db dynamically
const { db } = await import("../server/db");

async function confirmUserViaSQL(email: string) {
    console.log(`Promoting (Confirming) user via SQL: ${email}...`);

    try {
        // Attempt to update auth.users table directly
        // This requires the database user to have permissions on auth schema (usually true for service_role/postgres)
        const result = await db.execute(sql`
            UPDATE auth.users 
            SET email_confirmed_at = now(), updated_at = now()
            WHERE email = ${email}
            RETURNING id, email, email_confirmed_at;
        `);

        console.log("SQL Execution Result:", result);
        console.log("✅ User confirmed via SQL manual update.");
    } catch (error: any) {
        console.error("❌ SQL Update Failed:", error);
        console.error("Possible reasons: DB user lacks permission on 'auth.users' or user not found.");
    }

    process.exit(0);
}

const targetEmail = process.argv[2] || "albertobrando1991@gmail.com";
confirmUserViaSQL(targetEmail).catch(console.error);
