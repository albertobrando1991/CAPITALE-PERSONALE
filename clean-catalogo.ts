import 'dotenv/config';
import { db } from './server/db';
import { catalogoEdises } from './shared/schema-sq3r';

async function clean() {
  try {
    console.log('🗑️ Cleaning catalogo_edises...');
    await db.delete(catalogoEdises);
    console.log('✅ Cleaned.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

clean();
