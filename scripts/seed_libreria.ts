
import 'dotenv/config';
import { db } from '../server/db';
import { cartelleLibreria, documentiPubblici, norme } from '@shared/schema';
import { count } from 'drizzle-orm';

async function main() {
  console.log('🌱 Starting seed for Libreria Pubblica...');

  try {
    // Check existing data
    const foldersCount = await db.select({ count: count() }).from(cartelleLibreria);
    console.log(`Current folders: ${foldersCount[0].count}`);

    if (foldersCount[0].count > 0) {
      console.log('Database already has folders. Skipping seed.');
      process.exit(0);
    }

    // Create Root Folders
    console.log('Creating root folders...');
    const [ammFolder] = await db.insert(cartelleLibreria).values({
      nome: 'Diritto Amministrativo',
      descrizione: 'Dispense e schemi di diritto amministrativo',
      colore: '#3b82f6', // Blue
    }).returning();

    const [costFolder] = await db.insert(cartelleLibreria).values({
      nome: 'Diritto Costituzionale',
      descrizione: 'Materiale per costituzionale',
      colore: '#10b981', // Green
    }).returning();

    // Create Subfolder
    console.log('Creating subfolders...');
    const [l241Folder] = await db.insert(cartelleLibreria).values({
      nome: 'Legge 241/90',
      descrizione: 'Approfondimenti sulla legge del procedimento',
      colore: '#6366f1',
      parentId: ammFolder.id
    }).returning();

    // Create Documents
    console.log('Creating documents...');
    await db.insert(documentiPubblici).values({
      titolo: 'Schema Sintetico L. 241/90',
      descrizione: 'Riassunto dei punti chiave',
      materia: 'Diritto Amministrativo',
      fileName: 'schema_241.pdf',
      fileSize: 1024 * 500, // 500KB
      uploadedBy: 'seed',
      folderId: l241Folder.id,
      isStaffOnly: false
    });

    await db.insert(documentiPubblici).values({
      titolo: 'La Costituzione in Breve',
      descrizione: 'Principi fondamentali spiegati',
      materia: 'Diritto Costituzionale',
      fileName: 'costituzione_breve.pdf',
      fileSize: 1024 * 200,
      uploadedBy: 'seed',
      folderId: costFolder.id,
      isStaffOnly: false
    });

    // Create Normative
    console.log('Creating normative...');
    await db.insert(norme).values({
      titolo: 'Nuove norme in materia di procedimento amministrativo',
      tipo: 'Legge',
      numero: '241',
      anno: 1990,
      data: '1990-08-07',
      urn: 'urn:nir:stato:legge:1990-08-07;241',
      urlNormattiva: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1990-08-07;241',
      stato: 'disponibile',
      articoliAnalizzati: 30
    });

    console.log('✅ Seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
