
import 'dotenv/config';
import { db } from "./server/db";
import { concorsi, materials, users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function restore() {
  if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL is missing");
      process.exit(1);
  }

  const user = await db.select().from(users).where(eq(users.email, 'albertobrando1991@gmail.com')).limit(1);
  if (!user.length) {
    console.error("User not found");
    process.exit(1);
  }
  const userId = user[0].id;
  console.log(`Restoring data for user: ${userId}`);

  // 1. DELETE EXISTING
  console.log("Deleting existing materials and concorsi...");
  await db.delete(materials).where(eq(materials.userId, userId));
  await db.delete(concorsi).where(eq(concorsi.userId, userId));

  // 2. INSERT CLEAN DATA
  console.log("Inserting clean data...");
  
  // Concorso 1: Agenzia Entrate
  const [c1] = await db.insert(concorsi).values({
    userId,
    nome: "Concorso Agenzia Entrate",
    ente: "Agenzia delle Entrate",
    dataScadenza: new Date("2025-12-31"),
    descrizione: "Concorso per funzionari tributari",
    stato: "attivo",
    colore: "#3b82f6",
    icona: "building",
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  // Concorso 2: INPS
  const [c2] = await db.insert(concorsi).values({
    userId,
    nome: "Concorso INPS",
    ente: "INPS",
    dataScadenza: new Date("2025-11-30"),
    descrizione: "Concorso per assistenti amministrativi",
    stato: "attivo",
    colore: "#10b981",
    icona: "users",
    createdAt: new Date(),
    updatedAt: new Date()
  }).returning();

  // Materials for C1
  await db.insert(materials).values([
    {
        userId,
        concorsoId: c1.id,
        nome: "Manuale Diritto Tributario",
        materia: "Diritto Tributario",
        tipo: "dispensa",
        stato: "da_iniziare",
        dataCaricamento: new Date()
    },
    {
        userId,
        concorsoId: c1.id,
        nome: "Quiz Logica e Matematica",
        materia: "Logica",
        tipo: "quiz",
        stato: "in_corso",
        dataCaricamento: new Date()
    }
  ]);

  // Materials for C2
  await db.insert(materials).values([
    {
        userId,
        concorsoId: c2.id,
        nome: "Diritto Amministrativo Completo",
        materia: "Diritto Amministrativo",
        tipo: "libro",
        stato: "completato",
        dataCaricamento: new Date()
    }
  ]);

  console.log("Restore complete!");
}

restore().catch(console.error).finally(() => process.exit());
