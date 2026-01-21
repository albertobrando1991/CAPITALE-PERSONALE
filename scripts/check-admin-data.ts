import "dotenv/config";
import { db } from "../server/db";
import { concorsi, flashcards, materials } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

async function checkAdminUserData() {
    const ADMIN_USER_ID = "admin-user-123";

    console.log(`=== Checking Data for User ID: ${ADMIN_USER_ID} ===\n`);

    // Get concorsi for admin user
    const adminConcorsi = await db.select().from(concorsi).where(eq(concorsi.userId, ADMIN_USER_ID));
    console.log(`Concorsi owned by ${ADMIN_USER_ID}: ${adminConcorsi.length}`);

    for (const c of adminConcorsi) {
        console.log(`  - ${c.nome} (ID: ${c.id})`);
    }

    // Get flashcards for admin user
    const adminFlashcards = await db.select().from(flashcards).where(eq(flashcards.userId, ADMIN_USER_ID));
    console.log(`\nFlashcards owned by ${ADMIN_USER_ID}: ${adminFlashcards.length}`);

    // Get materials for admin user
    const adminMaterials = await db.select().from(materials).where(eq(materials.userId, ADMIN_USER_ID));
    console.log(`Materials owned by ${ADMIN_USER_ID}: ${adminMaterials.length}`);

    // Summary of all data by user
    console.log("\n=== Summary: Concorsi count by User ID ===");
    const summary = await db.select({
        userId: concorsi.userId,
        count: sql<number>`count(*)`
    }).from(concorsi).groupBy(concorsi.userId);

    for (const row of summary) {
        console.log(`  ${row.userId}: ${row.count} concorsi`);
    }

    process.exit(0);
}

checkAdminUserData().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
