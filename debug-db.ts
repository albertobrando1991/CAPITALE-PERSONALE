
import { db } from './server/db';
import { materieSQ3R, capitoliSQ3R } from './shared/schema-sq3r';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('--- MATERIE ---');
  const materie = await db.select().from(materieSQ3R);
  materie.forEach(m => {
    console.log(`ID: ${m.id} | Nome: ${m.nomeMateria} | CapTot: ${m.capitoliTotali}`);
  });

  console.log('\n--- CAPITOLI ---');
  const capitoli = await db.select().from(capitoliSQ3R);
  capitoli.forEach(c => {
    console.log(`ID: ${c.id} | MatID: ${c.materiaId} | Num: ${c.numeroCapitolo} | Titolo: ${c.titolo}`);
  });
  
  process.exit(0);
}

main().catch(console.error);
