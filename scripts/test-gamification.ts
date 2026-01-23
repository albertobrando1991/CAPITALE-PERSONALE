import * as dotenv from "dotenv";
import path from "path";
import { eq } from "drizzle-orm"; // Safe static import

// Load env FIRST
dotenv.config({ path: path.join(process.cwd(), ".env") });

async function testGamification() {
    console.log("🧪 Testing Gamification Logic...");

    // Dynamic import for DB after env is loaded
    const { db } = await import("../server/db");
    const { users } = await import("../shared/schema-base");

    if (!db) {
        console.error("❌ DB connection failed (db is null)");
        return;
    }

    // 1. Find test user
    let user = await db.query.users.findFirst();
    if (!user) {
        console.log("No users found. Skipping test.");
        return;
    }

    // Save original XP to restore later
    const originalXP = user.xp;
    console.log(`👤 Testing with user: ${user.email} (Original XP: ${originalXP})`);

    // 2. Test Cases
    const testCases = [
        { xp: 0, expectedLevel: 0 },
        { xp: 50, expectedLevel: 0 },
        { xp: 100, expectedLevel: 1 },
        { xp: 199, expectedLevel: 1 },
        { xp: 400, expectedLevel: 2 },
        { xp: 899, expectedLevel: 2 },
        { xp: 900, expectedLevel: 3 },
        { xp: 10000, expectedLevel: 10 },
    ];

    for (const test of testCases) {
        // Update XP
        await db.update(users).set({ xp: test.xp }).where(eq(users.id, user.id));

        // Re-fetch to ensure persistence
        const updatedUser = await db.query.users.findFirst({
            where: eq(users.id, user.id)
        });

        if (!updatedUser) continue;

        // Logic must match backend route
        const calculatedLevel = Math.floor(Math.sqrt(updatedUser.xp / 100));

        const passed = calculatedLevel === test.expectedLevel;
        const icon = passed ? "✅" : "❌";

        console.log(`${icon} XP: ${test.xp.toString().padEnd(5)} -> Level: ${calculatedLevel} (Expected: ${test.expectedLevel})`);
    }

    // 3. Reset
    console.log(`🔄 Resetting XP to original: ${originalXP}...`);
    await db.update(users).set({ xp: originalXP }).where(eq(users.id, user.id));

    console.log("✨ Test Completed");
    process.exit(0);
}

testGamification().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
