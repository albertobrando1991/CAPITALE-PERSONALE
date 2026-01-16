
import 'dotenv/config';
import { db } from "./server/db";
import { concorsi, materials, fontiStudio, materieSQ3R, capitoliSQ3R, users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function populateChapters() {
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
  console.log(`Populating chapters for user: ${userId}`);

  // 1. Get Concorsi
  const userConcorsi = await db.select().from(concorsi).where(eq(concorsi.userId, userId));
  
  for (const concorso of userConcorsi) {
    console.log(`Processing Concorso: ${concorso.nome}`);

    // 2. Get Materials for Concorso
    const userMaterials = await db.select().from(materials).where(eq(materials.concorsoId, concorso.id));

    // 3. Create Fonti Studio from Materials (if needed, but SQ3R seems to rely on fontiStudio/materieSQ3R/capitoliSQ3R structure)
    // It seems materials table is for Phase 2, but SQ3R (Phase 1) uses its own tables.
    // Let's create SQ3R structure for each "Materia" in the Bando or derived from Materials.
    
    // For simplicity, let's create a "Materia SQ3R" for each unique materia in userMaterials
    const uniqueMaterias = [...new Set(userMaterials.map(m => m.materia).filter(Boolean))];

    for (const matName of uniqueMaterias) {
        if (!matName) continue;
        console.log(`  > Processing Materia: ${matName}`);

        // Check/Create MateriaSQ3R
        let materiaId: string;
        const existingMateria = await db.select().from(materieSQ3R)
            .where(eq(materieSQ3R.concorsoId, concorso.id))
            .limit(1)
            .execute(); // simplified check, normally should check name too but schema might not enforce unique name per concorso easily in check

        // Better check
        const specificMateria = existingMateria.find(m => m.nomeMateria === matName);

        if (specificMateria) {
            materiaId = specificMateria.id;
        } else {
            const [newMat] = await db.insert(materieSQ3R).values({
                userId,
                concorsoId: concorso.id,
                nomeMateria: matName,
                capitoliTotali: 3, // Dummy count
                capitoliCompletati: 0
            }).returning();
            materiaId = newMat.id;
            console.log(`    + Created MateriaSQ3R: ${newMat.id}`);
        }

        // Create Chapters
        // We will create 3 dummy chapters for this materia
        const chapters = [
            { num: 1, title: "Introduzione e Principi Generali" },
            { num: 2, title: "Approfondimento Normativo" },
            { num: 3, title: "Casi Pratici e Giurisprudenza" }
        ];

        for (const chap of chapters) {
            // Check if exists
            const existingChap = await db.select().from(capitoliSQ3R)
                .where(eq(capitoliSQ3R.materiaId, materiaId))
                .execute();
            
            const found = existingChap.find(c => c.numeroCapitolo === chap.num);
            
            if (!found) {
                await db.insert(capitoliSQ3R).values({
                    userId,
                    materiaId,
                    numeroCapitolo: chap.num,
                    titolo: chap.title,
                    surveyCompletato: false,
                    questionCompletato: false,
                    readCompletato: false,
                    reciteCompletato: false,
                    reviewCompletato: false,
                    completato: false,
                    faseCorrente: 'survey'
                });
                console.log(`    + Created Chapter ${chap.num}: ${chap.title}`);
            } else {
                console.log(`    . Chapter ${chap.num} already exists`);
            }
        }
    }
  }

  console.log("Chapters population complete!");
}

populateChapters().catch(console.error).finally(() => process.exit());
