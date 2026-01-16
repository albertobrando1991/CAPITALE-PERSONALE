
import { db } from "./server/db";
import { users, concorsi, materials } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("--- USERS ---");
  const allUsers = await db.select().from(users);
  allUsers.forEach(u => console.log(`${u.id} | ${u.email} | ${u.firstName} ${u.lastName}`));

  console.log("\n--- CONCORSI ---");
  const allConcorsi = await db.select().from(concorsi);
  allConcorsi.forEach(c => console.log(`${c.id} | ${c.nome} | userId: ${c.userId}`));

  console.log("\n--- MATERIALS ---");
  const allMaterials = await db.select().from(materials);
  console.log(`Total materials: ${allMaterials.length}`);
  allMaterials.forEach(m => console.log(`${m.id} | ${m.nome} | concorsoId: ${m.concorsoId}`));
}

main().catch(console.error).finally(() => process.exit());
