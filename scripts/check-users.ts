import "dotenv/config";
import { db } from "../server/db";
import { users, userRoles, userSubscriptions } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkUsers() {
    console.log("=== Checking Users Database ===\n");

    // Get all users
    const allUsers = await db.select().from(users).limit(20);
    console.log(`Found ${allUsers.length} users:\n`);

    for (const user of allUsers) {
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Name: ${user.firstName} ${user.lastName}`);
        console.log(`Supabase Auth ID: ${user.supabaseAuthId || "N/A"}`);

        // Check roles
        const [role] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id)).limit(1);
        console.log(`Role: ${role?.role || "none"}`);

        // Check subscription
        const [sub] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, user.id)).limit(1);
        console.log(`Subscription: ${sub?.tier || "free"}`);

        console.log("---");
    }

    process.exit(0);
}

checkUsers().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
