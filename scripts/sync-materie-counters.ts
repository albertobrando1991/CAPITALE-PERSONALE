/**
 * Script per risincronizzare i contatori capitoliCompletati di tutte le materie
 * basandosi sullo stato reale (campo completato) dei capitoli.
 */
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });

import { eq, sql } from "drizzle-orm";

async function syncMaterieCounters() {
    console.log("🔄 Risincronizzazione contatori materie...");

    // Dynamic import dopo env load
    const { db } = await import("../server/db");
    const { materieSQ3R, capitoliSQ3R } = await import("../shared/schema-sq3r");

    if (!db) {
        console.error("❌ DB connection failed");
        return;
    }

    // Ottieni tutte le materie
    const materie = await db.select().from(materieSQ3R);
    console.log(`📚 Trovate ${materie.length} materie`);

    for (const materia of materie) {
        // Conta i capitoli reali
        const capitoli = await db
            .select({
                id: capitoliSQ3R.id,
                completato: capitoliSQ3R.completato
            })
            .from(capitoliSQ3R)
            .where(eq(capitoliSQ3R.materiaId, materia.id));

        const totale = capitoli.length;
        const completati = capitoli.filter(c => c.completato).length;

        // Aggiorna se diverso
        if (materia.capitoliTotali !== totale || materia.capitoliCompletati !== completati) {
            console.log(`📝 ${materia.nomeMateria}: ${materia.capitoliCompletati}/${materia.capitoliTotali} -> ${completati}/${totale}`);

            await db.update(materieSQ3R)
                .set({
                    capitoliTotali: totale,
                    capitoliCompletati: completati,
                    updatedAt: new Date()
                })
                .where(eq(materieSQ3R.id, materia.id));
        }
    }

    console.log("✅ Risincronizzazione completata");
    process.exit(0);
}

syncMaterieCounters().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
