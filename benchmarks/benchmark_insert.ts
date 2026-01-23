
import { db } from "../server/db";
import { users, concorsi } from "../shared/schema-base";
import { materieSQ3R, capitoliSQ3R } from "../shared/schema-sq3r";
import { eq } from "drizzle-orm";

async function main() {
  if (!db) {
    console.error("Database connection not established");
    process.exit(1);
  }

  console.log("Setting up benchmark...");

  // 1. Setup Data
  const timestamp = Date.now();
  const testEmail = `bench_user_${timestamp}@example.com`;

  // Create User
  const [user] = await db.insert(users).values({
    email: testEmail,
    firstName: "Benchmark",
    lastName: "User",
  }).returning();

  // Create Concorso
  const [concorso] = await db.insert(concorsi).values({
    userId: user.id,
    nome: "Benchmark Concorso",
  }).returning();

  // Create Materia
  const [materia] = await db.insert(materieSQ3R).values({
    userId: user.id,
    concorsoId: concorso.id,
    nomeMateria: "Benchmark Materia",
  }).returning();

  const numChapters = 100;
  const chapters = Array.from({ length: numChapters }, (_, i) => ({
    numero: i + 1,
    titolo: `Capitolo ${i + 1}`,
    pagineInizio: i * 10 + 1,
    pagineFine: i * 10 + 10,
  }));

  // 2. Measure Baseline (Sequential Insert)
  console.log(`\nStarting Baseline: Inserting ${numChapters} chapters sequentially...`);
  const startBaseline = performance.now();

  for (const cap of chapters) {
    await db.insert(capitoliSQ3R).values({
      userId: user.id,
      materiaId: materia.id,
      numeroCapitolo: cap.numero,
      titolo: cap.titolo,
      pagineInizio: cap.pagineInizio,
      pagineFine: cap.pagineFine,
      faseCorrente: 'survey',
      pdfFileName: "test.pdf",
      pdfFileSize: 1024,
      pdfNumPages: 1000,
    });
  }

  const endBaseline = performance.now();
  const durationBaseline = endBaseline - startBaseline;
  console.log(`Baseline Duration: ${durationBaseline.toFixed(2)} ms`);

  // Cleanup chapters
  await db.delete(capitoliSQ3R).where(eq(capitoliSQ3R.materiaId, materia.id));

  // 3. Measure Optimization (Batch Insert)
  console.log(`\nStarting Optimization: Inserting ${numChapters} chapters in batch...`);
  const startOpt = performance.now();

  const valuesToInsert = chapters.map(cap => ({
    userId: user.id,
    materiaId: materia.id,
    numeroCapitolo: cap.numero,
    titolo: cap.titolo,
    pagineInizio: cap.pagineInizio,
    pagineFine: cap.pagineFine,
    faseCorrente: 'survey',
    pdfFileName: "test.pdf",
    pdfFileSize: 1024,
    pdfNumPages: 1000,
  }));

  await db.insert(capitoliSQ3R).values(valuesToInsert);

  const endOpt = performance.now();
  const durationOpt = endOpt - startOpt;
  console.log(`Optimization Duration: ${durationOpt.toFixed(2)} ms`);

  // 4. Report
  const improvement = durationBaseline / durationOpt;
  console.log(`\nSpeedup: ${improvement.toFixed(2)}x`);

  // 5. Cleanup
  console.log("\nCleaning up...");
  await db.delete(materieSQ3R).where(eq(materieSQ3R.id, materia.id));
  await db.delete(concorsi).where(eq(concorsi.id, concorso.id));
  await db.delete(users).where(eq(users.id, user.id));

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
