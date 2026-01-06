import 'dotenv/config';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function verify() {
  try {
    const result = await db.execute(sql`SELECT isbn, titolo, materia, prezzo, popolare FROM catalogo_edises ORDER BY popolare DESC, titolo;`);
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

verify();
