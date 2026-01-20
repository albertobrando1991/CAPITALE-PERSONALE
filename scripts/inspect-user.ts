
import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { users } from "../shared/schema";

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Import db dynamically after env vars are loaded
const { db } = await import("../server/db");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function inspectUser(email: string) {
    console.log(`Inspecting user: ${email}...\n`);

    // 1. Check DB
    console.log("--- DATABASE RECORD ---");
    const dbUsers = await db.select().from(users).where(eq(users.email, email));

    if (dbUsers.length === 0) {
        console.log("❌ No user found in 'users' table.");
    } else {
        dbUsers.forEach(u => {
            console.log(JSON.stringify(u, null, 2));
        });
    }

    // 2. Check Supabase Auth
    console.log("\n--- SUPABASE AUTH RECORD ---");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) {
        console.error("Error listing users:", error.message);
    } else {
        const authUser = data.users.find(u => u.email === email);
        if (authUser) {
            console.log(JSON.stringify({
                id: authUser.id,
                email: authUser.email,
                metadata: authUser.user_metadata,
                last_sign_in: authUser.last_sign_in_at
            }, null, 2));
        } else {
            console.log("❌ User not found in Supabase Auth.");
        }
    }

    process.exit(0);
}

const targetEmail = process.argv[2] || "albertobrando1991@gmail.com";
inspectUser(targetEmail).catch(console.error);
