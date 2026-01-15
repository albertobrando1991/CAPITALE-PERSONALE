
import "dotenv/config";
import { db } from "./db";
import { users, concorsi } from "@shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("Connecting to DB...");
  
  try {
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach(u => console.log(` - ID: ${u.id}, Email: ${u.email}, Name: ${u.firstName} ${u.lastName}`));

    const allConcorsi = await db.select().from(concorsi);
    console.log(`Found ${allConcorsi.length} concorsi:`);
    allConcorsi.forEach(c => console.log(` - ID: ${c.id}, UserID: ${c.userId}, Name: ${c.nome}`));

    if (allUsers.length > 0) {
      const firstUser = allUsers[0];
      const userConcorsi = await db.select().from(concorsi).where(eq(concorsi.userId, firstUser.id));
      console.log(`User ${firstUser.id} has ${userConcorsi.length} concorsi.`);
    }

  } catch (err) {
    console.error("Error querying DB:", err);
  }
  process.exit(0);
}

main();
