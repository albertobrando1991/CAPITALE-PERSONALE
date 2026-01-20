/**
 * Script to check and fix Supabase Auth user
 * Usage: npx tsx scripts/check-supabase-user.ts
 */
import "dotenv/config";

// Disable SSL cert validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { db } from "../server/db";
import { users, userRoles } from "../shared/schema";
import { eq, or } from "drizzle-orm";

const SUPABASE_AUTH_ID = "420961b7-1aed-4c30-bc5f-7863f7f193c7";
const EMAIL = "albertobrando1991@gmail.com";

async function checkSupabaseUser() {
    console.log(`\n=== Checking Supabase Auth User ===\n`);
    console.log(`Supabase Auth ID: ${SUPABASE_AUTH_ID}`);
    console.log(`Email: ${EMAIL}\n`);

    // Find all users with this email or supabase auth id
    const matchingUsers = await db.select().from(users).where(
        or(
            eq(users.email, EMAIL),
            eq(users.supabaseAuthId, SUPABASE_AUTH_ID),
            eq(users.id, SUPABASE_AUTH_ID)
        )
    );

    console.log(`Found ${matchingUsers.length} matching users:\n`);

    for (const user of matchingUsers) {
        console.log(`  ID: ${user.id}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Name: ${user.firstName} ${user.lastName}`);
        console.log(`  Supabase Auth ID: ${user.supabaseAuthId || "NOT LINKED"}`);

        // Check role
        const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id)).limit(1);
        console.log(`  Role: ${role?.role || "NONE"}`);
        console.log("  ---");
    }

    // If user with email exists but not linked to Supabase
    const [userByEmail] = matchingUsers.filter(u => u.email === EMAIL && !u.supabaseAuthId);
    const [userBySupabaseId] = matchingUsers.filter(u => u.supabaseAuthId === SUPABASE_AUTH_ID || u.id === SUPABASE_AUTH_ID);

    if (userByEmail && !userByEmail.supabaseAuthId) {
        console.log(`\n⚠️ User with email exists but NOT linked to Supabase Auth`);
        console.log(`Linking user ${userByEmail.id} to Supabase Auth ID ${SUPABASE_AUTH_ID}...`);

        await db.update(users)
            .set({ supabaseAuthId: SUPABASE_AUTH_ID })
            .where(eq(users.id, userByEmail.id));

        console.log("✅ User linked to Supabase Auth");
    }

    // Check if user with Supabase ID has super_admin role
    const targetUser = userBySupabaseId || userByEmail;
    if (targetUser) {
        const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, targetUser.id)).limit(1);

        if (!role || role.role !== 'super_admin') {
            console.log(`\n⚠️ User does not have super_admin role`);
            console.log(`Assigning super_admin role...`);

            if (role) {
                await db.update(userRoles)
                    .set({ role: 'super_admin', updatedAt: new Date() })
                    .where(eq(userRoles.userId, targetUser.id));
            } else {
                await db.insert(userRoles).values({
                    userId: targetUser.id,
                    role: 'super_admin',
                });
            }

            console.log("✅ super_admin role assigned");
        }
    }

    // Final verification
    console.log("\n=== Final State ===\n");
    const finalUsers = await db.select().from(users).where(
        or(
            eq(users.email, EMAIL),
            eq(users.supabaseAuthId, SUPABASE_AUTH_ID)
        )
    );

    for (const user of finalUsers) {
        const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id)).limit(1);
        console.log(`${user.id} | ${user.email} | Supabase: ${user.supabaseAuthId || "N/A"} | Role: ${role?.role || "none"}`);
    }

    process.exit(0);
}

checkSupabaseUser().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
