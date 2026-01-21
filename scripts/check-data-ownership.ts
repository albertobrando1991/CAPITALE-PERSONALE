import "dotenv/config";
import { db } from "../server/db";
import { concorsi, flashcards, materials } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkUserData() {
    console.log("=== Checking User Data Ownership ===\n");

    // Get all concorsi with their user IDs
    const allConcorsi = await db.select().from(concorsi).limit(20);
    console.log(`Found ${allConcorsi.length} concorsi:\n`);

    for (const c of allConcorsi) {
        console.log(`Concorso: ${c.nome}`);
        console.log(`  ID: ${c.id}`);
        console.log(`  User ID: ${c.userId}`);
        console.log(`  Created At: ${c.createdAt}`);

        // Check flashcards for this concorso
        const fc = await db.select().from(flashcards).where(eq(flashcards.concorsoId, c.id)).limit(5);
        console.log(`  Flashcards count: ${fc.length}`);

        // Check materials for this concorso
        const mat = await db.select().from(materials).where(eq(materials.concorsoId, c.id)).limit(5);
        console.log(`  Materials count: ${mat.length}`);
        console.log("---");
    }

    // Also list unique user IDs that own data
    const uniqueOwners = [...new Set(allConcorsi.map(c => c.userId))];
    console.log("\nUnique User IDs that own concorsi:");
    uniqueOwners.forEach(id => console.log(`  - ${id}`));

    process.exit(0);
}

checkUserData().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
});
