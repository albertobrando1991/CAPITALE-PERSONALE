
import 'dotenv/config';
import { db } from '../server/db';
import { cartelleLibreria, documentiPubblici } from '@shared/schema';

async function main() {
  const folders = await db.select().from(cartelleLibreria);
  console.log('Folders found:', folders);
  
  const docs = await db.select().from(documentiPubblici);
  console.log('Documents found:', docs);
  
  process.exit(0);
}

main();
