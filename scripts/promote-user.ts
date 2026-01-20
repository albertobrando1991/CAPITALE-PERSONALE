
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { users, userRoles, userSubscriptions } from "../shared/schema";

// Load environment variables FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Import db dynamically after env vars are loaded
const { db } = await import("../server/db");

async function promoteUser(email: string) {
    console.log(`Promoting user: ${email}...\n`);

    // 1. Find User
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
        console.error(`❌ User ${email} not found in database!`);
        console.error("Please run the migration script first or ensure the user has logged in.");
        process.exit(1);
    }

    console.log(`Found User ID: ${user.id}`);

    // 2. Assign Super Admin Role
    const [existingRole] = await db.select().from(userRoles).where(eq(userRoles.userId, user.id)).limit(1);

    if (existingRole) {
        await db.update(userRoles)
            .set({ role: 'super_admin', assignedAt: new Date() })
            .where(eq(userRoles.userId, user.id));
        console.log("✅ Updated existing role to 'super_admin'");
    } else {
        await db.insert(userRoles).values({
            userId: user.id,
            role: 'super_admin',
            assignedBy: 'system-script',
        });
        console.log("✅ Inserted new 'super_admin' role");
    }

    // 3. Assign Enterprise/Premium Subscription (to fix 'Free Plan' UI)
    const [existingSub] = await db.select().from(userSubscriptions).where(eq(userSubscriptions.userId, user.id)).limit(1);

    if (existingSub) {
        await db.update(userSubscriptions)
            .set({
                tier: 'enterprise',
                status: 'active',
                startDate: new Date(),
                currentPeriodEnd: new Date('2099-12-31') // Lifetime
            })
            .where(eq(userSubscriptions.userId, user.id));
        console.log("✅ Updated subscription to 'enterprise'");
    } else {
        await db.insert(userSubscriptions).values({
            userId: user.id,
            tier: 'enterprise',
            status: 'active',
            startDate: new Date(),
            currentPeriodEnd: new Date('2099-12-31'),
        });
        console.log("✅ Created new 'enterprise' subscription");
    }

    console.log("\n🎉 User successfully promoted!");
    process.exit(0);
}

const targetEmail = process.argv[2] || "albertobrando1991@gmail.com";
promoteUser(targetEmail).catch(console.error);
