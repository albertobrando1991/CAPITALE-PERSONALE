
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function confirmUser(email: string) {
    console.log(`Searching for user: ${email}...`);

    // 1. Find User ID
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
        console.error("Error listing users:", listError.message);
        process.exit(1);
    }

    const user = listData.users.find(u => u.email === email);

    if (!user) {
        console.error(`❌ User ${email} not found in Supabase Auth!`);
        console.error("Make sure you have clicked 'Sign Up' first.");
        process.exit(1);
    }

    console.log(`Found User ID: ${user.id}`);
    console.log(`Current Status: ${user.email_confirmed_at ? 'Confirmed' : 'Unconfirmed'}`);

    if (user.email_confirmed_at) {
        console.log("✅ User implies already confirmed.");
        process.exit(0);
    }

    // 2. Confirm Email manually
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { email_confirm: true }
    );

    if (error) {
        console.error("❌ Failed to confirm user:", error.message);
        process.exit(1);
    }

    console.log("✅ User email manually confirmed!");
    process.exit(0);
}

const targetEmail = process.argv[2] || "albertobrando1991@gmail.com";
confirmUser(targetEmail).catch(console.error);
