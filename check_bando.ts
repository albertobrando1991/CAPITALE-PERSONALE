
import 'dotenv/config';
import { db } from "./server/db";
import { concorsi } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkBando() {
  if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is missing");
      process.exit(1);
  }
  const allConcorsi = await db.select().from(concorsi);
  allConcorsi.forEach(c => {
      console.log(`Concorso: ${c.nome}`);
      console.log(`Bando Analysis:`, c.bandoAnalysis);
  });
}

checkBando().catch(console.error).finally(() => process.exit());
