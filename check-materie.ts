import "dotenv/config";
import { db } from "./server/db";
import { materieSQ3R } from "@shared/schema-sq3r";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🔍 Checking materie in DB...");
  const targetId = "b88809028-39c9-434b-91ae-2c164bfc073f";
  try {
    const allMaterie = await db.select().from(materieSQ3R);
    console.log(`✅ Total materie in DB: ${allMaterie.length}`);
    
    const targetMaterie = allMaterie.filter(m => m.concorsoId === targetId);
    console.log(`🎯 Materie for concorso ${targetId}: ${targetMaterie.length}`);
    targetMaterie.forEach(m => {
        console.log(`- ${m.nomeMateria} (ID: ${m.id})`);
    });

    if (targetMaterie.length === 0) {
        console.log("⚠️ No materie found for this concorso. Listing all concorsoIds:");
        const ids = new Set(allMaterie.map(m => m.concorsoId));
        ids.forEach(id => console.log(`- ${id}`));
    }

  } catch (error) {
    console.error("❌ Error querying DB:", error);
  }
}

main();
