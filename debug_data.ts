
import "dotenv/config";
import { db } from "./server/db";
import { users, concorsi } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("🔍 Inspecting Users and Concorsi...");

  // 1. Get all users
  const allUsers = await db.select().from(users);
  console.log(`\n👥 Users found: ${allUsers.length}`);
  allUsers.forEach(u => {
    console.log(`- ID: ${u.id}, Email: ${u.email}, Name: ${u.firstName} ${u.lastName}`);
  });

  // 2. Get all concorsi
  const allConcorsi = await db.select().from(concorsi);
  console.log(`\n🏆 Concorsi found: ${allConcorsi.length}`);
  allConcorsi.forEach(c => {
    console.log(`- ID: ${c.id}, Nome: ${c.nome}, UserID: ${c.userId}`);
  });

  // 3. Check for mismatches
  if (allUsers.length > 0 && allConcorsi.length > 0) {
      console.log("\n⚠️ Checking for ownership...");
      allConcorsi.forEach(c => {
          const owner = allUsers.find(u => u.id === c.userId);
          if (owner) {
              console.log(`  ✅ Concorso "${c.nome}" belongs to ${owner.email}`);
          } else {
              console.log(`  ❌ Concorso "${c.nome}" belongs to UNKNOWN user (${c.userId})`);
          }
      });
  }
}

main().catch(console.error);
