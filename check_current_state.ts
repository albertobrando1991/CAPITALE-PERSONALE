
import 'dotenv/config'; // Load .env
import { db } from "./server/db";
import { concorsi, materials, users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkState() {
  if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is missing");
      process.exit(1);
  }

  const user = await db.select().from(users).where(eq(users.email, 'albertobrando1991@gmail.com')).limit(1);
  if (!user.length) {
    console.log("User not found");
    return;
  }
  const userId = user[0].id;
  console.log(`Checking data for user: ${userId}`);

  const userConcorsi = await db.select().from(concorsi).where(eq(concorsi.userId, userId));
  console.log(`\nFound ${userConcorsi.length} concorsi:`);
  userConcorsi.forEach(c => console.log(`- [${c.id}] ${c.nome} (Created: ${c.createdAt})`));

  const userMaterials = await db.select().from(materials).where(eq(materials.userId, userId));
  console.log(`\nFound ${userMaterials.length} materials:`);
  userMaterials.forEach(m => console.log(`- [${m.id}] ${m.nome} (Concorso: ${m.concorsoId})`));
}

checkState().catch(console.error).finally(() => process.exit());
