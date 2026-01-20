
import { createClient } from "@supabase/supabase-js";
import { eq, isNull } from "drizzle-orm";
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

async function migrateUsers() {
    console.log("Starting user migration to Supabase Auth...");

    // Get all users that haven't been linked to Supabase Auth yet (or all users to be safe)
    // We filter for those with valid emails
    const allUsers = await db.select().from(users);

    console.log(`Found ${allUsers.length} users in local database.`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of allUsers) {
        if (!user.email) {
            console.log(`Skipping user ${user.id} (no email)`);
            skippedCount++;
            continue;
        }

        // Check if validation via email regex is needed, but assuming DB has valid emails
        console.log(`Processing user: ${user.email} (${user.id})`);

        try {
            // 1. Check if user exists in Supabase Auth
            // We can't search by email directly with admin API easily without listing, 
            // so we try to create (or invite) and handle error, or just use createUser

            // Note: createUser will return error if email exists
            const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: user.email,
                email_confirm: true, // Auto-confirm email so they can login immediately after password reset
                user_metadata: {
                    first_name: user.firstName,
                    last_name: user.lastName,
                    full_name: [user.firstName, user.lastName].filter(Boolean).join(" "),
                    avatar_url: user.profileImageUrl,
                    legacy_id: user.id // Store old ID in metadata just in case
                }
            });

            let supabaseId = authUser?.user?.id;

            if (createError) {
                // If user already registered, likely migrated or signed up manually
                if (createError.message.includes("already has been registered") || createError.status === 422) {
                    console.log(`User ${user.email} already exists in Supabase Auth. Attempting to fetch ID...`);
                    // To fetch ID, we can list users or sadly we have to ask user to login.
                    // But for migration script, we can list users filter by email
                    // This is an expensive operation if we have many users, but fine for migration
                    /* 
                       Alternative: We assume we can't get the ID easily without listUsers.
                       For now, let's try to link if we find them in list.
                    */
                    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
                    const existingAuthUser = listData.users.find(u => u.email === user.email);

                    if (existingAuthUser) {
                        supabaseId = existingAuthUser.id;
                    } else {
                        console.error(`Could not find ID for existing user ${user.email}: ${createError.message}`);
                        errorCount++;
                        continue;
                    }
                } else {
                    console.error(`Failed to create user ${user.email}:`, createError.message);
                    errorCount++;
                    continue;
                }
            } else {
                console.log(`Created Supabase Auth user for ${user.email}`);

                // Send password reset email so they can set a password
                // Uncomment below if you want to send emails immediately
                // await supabaseAdmin.auth.resetPasswordForEmail(user.email);
                console.log(`> REMINDER: User needs to reset password.`);
            }

            // 2. Link in local DB
            if (supabaseId) {
                if (user.supabaseAuthId !== supabaseId) {
                    await db
                        .update(users)
                        .set({ supabaseAuthId: supabaseId })
                        .where(eq(users.id, user.id));
                    console.log(`Linked local user ${user.id} to Supabase ID ${supabaseId}`);
                    migratedCount++;
                } else {
                    console.log(`User ${user.email} already linked.`);
                    skippedCount++;
                }
            }

        } catch (err: any) {
            console.error(`Unexpected error for ${user.email}:`, err.message);
            errorCount++;
        }
    }

    console.log(`Migration complete.`);
    console.log(`Migrated/Linked: ${migratedCount}`);
    console.log(`Skipped/Already Done: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

    process.exit(0);
}

migrateUsers().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
