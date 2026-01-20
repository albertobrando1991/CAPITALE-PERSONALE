/**
 * Script to set a user as super_admin
 * Usage: npx tsx scripts/set-admin-role.ts <email>
 */
import "dotenv/config";

// Disable SSL cert validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { db } from "../server/db";
import { users, userRoles } from "../shared/schema";
import { eq } from "drizzle-orm";

async function setAdminRole() {
    const email = process.argv[2] || "albertobrando1991@gmail.com";

    console.log(`\n=== Setting super_admin role for: ${email} ===\n`);

    // Find user by email
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
        console.error(`User not found with email: ${email}`);
        console.log("\nAvailable users:");
        const allUsers = await db.select({ id: users.id, email: users.email }).from(users).limit(10);
        allUsers.forEach(u => console.log(`  - ${u.email} (${u.id})`));
        process.exit(1);
    }

    console.log(`Found user: ${user.id} (${user.firstName} ${user.lastName})`);

    // Check current role
    const [existingRole] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id)).limit(1);

    if (existingRole) {
        console.log(`Current role: ${existingRole.role}`);

        if (existingRole.role === 'super_admin') {
            console.log("User is already super_admin!");
            process.exit(0);
        }

        // Update role
        await db.update(userRoles)
            .set({ role: 'super_admin', updatedAt: new Date() })
            .where(eq(userRoles.userId, user.id));
        console.log("✅ Role updated to super_admin");
    } else {
        // Insert new role
        await db.insert(userRoles).values({
            userId: user.id,
            role: 'super_admin',
        });
        console.log("✅ Role super_admin assigned");
    }

    // Verify
    const [newRole] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id)).limit(1);
    console.log(`\nVerification - Current role: ${newRole?.role}`);

    process.exit(0);
}

setAdminRole().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
