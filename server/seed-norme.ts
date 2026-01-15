import { db } from './db';
import { norme } from '../shared/schema-normativa';
import { eq } from 'drizzle-orm';
import { extraNorme } from './seed-extra';

// Norme più comuni per concorsi pubblici
const normeComuniBase = [
  {
    urn: 'urn:nir:stato:legge:2003-06-30;196',
    tipo: 'Legge',
    numero: '196',
    anno: 2003,
    data: '2003-06-30',
    titolo: 'Codice in materia di protezione dei dati personali',
    titoloBreve: 'Codice Privacy',
    keywords: ['privacy', 'dati personali', 'trattamento', 'gdpr', 'protezione'],
    urlNormattiva: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2003-06-30;196',
    gazzettaUfficiale: 'GU Serie Generale n.174 del 29-07-2003',
  },
  {
    urn: 'urn:nir:stato:decreto.legislativo:2001-03-30;165',
    tipo: 'Decreto Legislativo',
    numero: '165',
    anno: 2001,
    data: '2001-03-30',
    titolo: 'Norme generali sull\'ordinamento del lavoro alle dipendenze delle amministrazioni pubbliche',
    titoloBreve: 'TU Pubblico Impiego',
    keywords: ['pubblico impiego', 'amministrazione', 'dipendenti', 'concorsi', 'procedimento'],
    urlNormattiva: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2001-03-30;165',
    gazzettaUfficiale: 'GU Serie Generale n.106 del 09-05-2001',
  },
  {
    urn: 'urn:nir:stato:legge:1990-08-07;241',
    tipo: 'Legge',
    numero: '241',
    anno: 1990,
    data: '1990-08-07',
    titolo: 'Nuove norme in materia di procedimento amministrativo e di diritto di accesso ai documenti amministrativi',
    titoloBreve: 'Legge sul Procedimento Amministrativo',
    keywords: ['procedimento amministrativo', 'accesso', 'trasparenza', 'responsabile', 'termine'],
    urlNormattiva: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:1990-08-07;241',
    gazzettaUfficiale: 'GU Serie Generale n.192 del 18-08-1990',
  },
  {
    urn: 'urn:nir:stato:costituzione:1947-12-27;1',
    tipo: 'Costituzione',
    numero: '1',
    anno: 1947,
    data: '1947-12-27',
    titolo: 'Costituzione della Repubblica Italiana',
    titoloBreve: 'Costituzione',
    keywords: ['costituzione', 'diritti', 'libertà', 'repubblica', 'parlamento', 'presidente'],
    urlNormattiva: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:costituzione:1947-12-27;1',
    gazzettaUfficiale: 'GU Serie Generale n.298 del 27-12-1947',
  },
  {
    urn: 'urn:nir:stato:decreto.legislativo:2013-03-14;33',
    tipo: 'Decreto Legislativo',
    numero: '33',
    anno: 2013,
    data: '2013-03-14',
    titolo: 'Riordino della disciplina riguardante il diritto di accesso civico e gli obblighi di pubblicità, trasparenza e diffusione di informazioni da parte delle pubbliche amministrazioni',
    titoloBreve: 'Trasparenza PA',
    keywords: ['trasparenza', 'accesso civico', 'pubblicità', 'amministrazione trasparente', 'foia'],
    urlNormattiva: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2013-03-14;33',
    gazzettaUfficiale: 'GU Serie Generale n.80 del 05-04-2013',
  },
  {
    urn: 'urn:nir:stato:decreto.del.presidente.della.repubblica:2000-12-28;445',
    tipo: 'DPR',
    numero: '445',
    anno: 2000,
    data: '2000-12-28',
    titolo: 'Testo unico delle disposizioni legislative e regolamentari in materia di documentazione amministrativa',
    titoloBreve: 'TU Documentazione Amministrativa',
    keywords: ['autocertificazione', 'dichiarazione', 'documento', 'identità', 'residenza'],
    urlNormattiva: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.del.presidente.della.repubblica:2000-12-28;445',
    gazzettaUfficiale: 'GU Serie Generale n.42 del 20-02-2001',
  },
  {
    urn: 'urn:nir:stato:decreto.legislativo:2023-03-31;36',
    tipo: 'Decreto Legislativo',
    numero: '36',
    anno: 2023,
    data: '2023-03-31',
    titolo: 'Codice dei contratti pubblici',
    titoloBreve: 'Nuovo Codice Appalti',
    keywords: ['appalti', 'contratti pubblici', 'gare', 'procedura', 'offerta', 'nuovo codice'],
    urlNormattiva: 'https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2023-03-31;36',
    gazzettaUfficiale: 'GU Serie Generale n.77 del 31-03-2023',
  },
];

const normeComuni = [...normeComuniBase, ...extraNorme];

export async function seedNorme() {
  console.log('🌱 Seeding norme...');
  
  try {
    for (const norma of normeComuni) {
      // Verifica se esiste già
      const existing = await db.select().from(norme).where(eq(norme.urn, norma.urn));
      
      if (existing.length === 0) {
        await db.insert(norme).values(norma);
        console.log(`✅ Inserita: ${norma.titoloBreve}`);
      } else {
        console.log(`⏭️  Già esistente: ${norma.titoloBreve}`);
      }
    }
    
    console.log('✅ Seeding completato!');
  } catch (error) {
    console.error('❌ Errore seeding:', error);
    // Don't rethrow to avoid noisy exit, just log
    // throw error; 
  }
}

import { fileURLToPath } from 'url';

// Esegui se lanciato direttamente
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Use a direct connection client for seeding script to bypass pool issues with SSL
  const { Client } = await import('pg');
  
  if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL mancante. Impossibile eseguire il seeding.");
      process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
      await client.connect();
      console.log("✅ Connesso al DB per seed diretto");
      
      // Cleanup vecchie normative obsolete
      await client.query("DELETE FROM norme WHERE urn = 'urn:nir:stato:decreto.legislativo:2016-04-18;50'");
      console.log("🧹 Rimossa vecchia versione Codice Appalti (D.Lgs 50/2016)");

      // Use raw SQL for seeding to ensure it works
      for (const norma of normeComuni) {
          const check = await client.query('SELECT id FROM norme WHERE urn = $1', [norma.urn]);
          if (check.rows.length === 0) {
              await client.query(
                  `INSERT INTO norme (urn, tipo, numero, anno, data, titolo, titolo_breve, keywords, url_normattiva, gazzetta_ufficiale) 
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                  [
                      norma.urn, 
                      norma.tipo, 
                      norma.numero, 
                      norma.anno, 
                      norma.data, 
                      norma.titolo, 
                      norma.titoloBreve, 
                      norma.keywords, 
                      norma.urlNormattiva, 
                      norma.gazzettaUfficiale
                  ]
              );
              console.log(`✅ Inserita: ${norma.titoloBreve}`);
          } else {
              console.log(`⏭️  Già esistente: ${norma.titoloBreve}`);
          }
      }
      
      await client.end();
      process.exit(0);
  } catch(e) {
      console.error(e);
      process.exit(1);
  }
}
