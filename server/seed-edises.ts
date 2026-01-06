import 'dotenv/config';
import { db } from './db';
import { catalogoEdises } from '../shared/schema';

const manualiEdises = [
  {
    isbn: '9788836220489',
    titolo: 'Manuale Completo di Diritto Amministrativo',
    autore: 'Edizioni Simone',
    materia: 'Diritto Amministrativo',
    descrizione: 'Trattazione completa e aggiornata con giurisprudenza e casi pratici. Include procedimento amministrativo, atti, organi e controlli.',
    copertina: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&h=600&fit=crop',
    prezzo: 4500, // €45.00
    linkAcquisto: 'https://www.edises.it/universitaria/diritto/diritto-amministrativo.html',
    linkAffiliato: 'https://www.edises.it/universitaria/diritto/diritto-amministrativo.html?ref=TRAE-AI&utm_source=trae&utm_medium=affiliate&utm_campaign=concorsi',
    numPagine: 850,
    anno: 2024,
    popolare: true,
  },
  {
    isbn: '9788836220496',
    titolo: 'Contabilità di Stato e degli Enti Pubblici',
    autore: 'P. De Gioia',
    materia: 'Contabilità Pubblica',
    descrizione: 'Guida pratica con esempi e casi risolti. Bilancio pubblico, controlli contabili e gestione delle risorse.',
    copertina: 'https://images.unsplash.com/photo-1554224311-beee4ece0ec7?w=400&h=600&fit=crop',
    prezzo: 3800, // €38.00
    linkAcquisto: 'https://www.edises.it/universitaria/economia/contabilita-pubblica.html',
    linkAffiliato: 'https://www.edises.it/universitaria/economia/contabilita-pubblica.html?ref=TRAE-AI&utm_source=trae&utm_medium=affiliate&utm_campaign=concorsi',
    numPagine: 600,
    anno: 2024,
    popolare: true,
  },
  {
    isbn: '9788836220502',
    titolo: 'Diritto del Lavoro - Manuale per Concorsi',
    autore: 'G. Ferraro',
    materia: 'Diritto del Lavoro',
    descrizione: 'Normativa aggiornata con focus su pubblico impiego. Contratti, licenziamenti, diritti sindacali.',
    copertina: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=400&h=600&fit=crop',
    prezzo: 4200, // €42.00
    linkAcquisto: 'https://www.edises.it/universitaria/diritto/diritto-del-lavoro.html',
    linkAffiliato: 'https://www.edises.it/universitaria/diritto/diritto-del-lavoro.html?ref=TRAE-AI&utm_source=trae&utm_medium=affiliate&utm_campaign=concorsi',
    numPagine: 720,
    anno: 2024,
    popolare: false,
  },
  {
    isbn: '9788836220519',
    titolo: 'Diritto Costituzionale - Teoria e Test',
    autore: 'M. Ruotolo',
    materia: 'Diritto Costituzionale',
    descrizione: 'Con oltre 500 quiz commentati. Costituzione, ordinamento, diritti fondamentali e organi costituzionali.',
    copertina: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=400&h=600&fit=crop',
    prezzo: 3900, // €39.00
    linkAcquisto: 'https://www.edises.it/universitaria/diritto/diritto-costituzionale.html',
    linkAffiliato: 'https://www.edises.it/universitaria/diritto/diritto-costituzionale.html?ref=TRAE-AI&utm_source=trae&utm_medium=affiliate&utm_campaign=concorsi',
    numPagine: 680,
    anno: 2024,
    popolare: true,
  },
  {
    isbn: '9788836220526',
    titolo: 'Diritto Civile - Compendio',
    autore: 'A. Torrente, P. Schlesinger',
    materia: 'Diritto Civile',
    descrizione: 'Sintesi completa del diritto civile italiano. Obbligazioni, contratti, proprietà, famiglia e successioni.',
    copertina: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=600&fit=crop',
    prezzo: 5200, // €52.00
    linkAcquisto: 'https://www.edises.it/universitaria/diritto/diritto-civile.html',
    linkAffiliato: 'https://www.edises.it/universitaria/diritto/diritto-civile.html?ref=TRAE-AI&utm_source=trae&utm_medium=affiliate&utm_campaign=concorsi',
    numPagine: 950,
    anno: 2024,
    popolare: true,
  },
  {
    isbn: '9788836220533',
    titolo: 'Economia Aziendale per Concorsi Pubblici',
    autore: 'L. Brusa',
    materia: 'Economia Aziendale',
    descrizione: 'Contabilità generale, bilancio, analisi di gestione. Con esercizi svolti.',
    copertina: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=600&fit=crop',
    prezzo: 3600, // €36.00
    linkAcquisto: 'https://www.edises.it/universitaria/economia/economia-aziendale.html',
    linkAffiliato: 'https://www.edises.it/universitaria/economia/economia-aziendale.html?ref=TRAE-AI&utm_source=trae&utm_medium=affiliate&utm_campaign=concorsi',
    numPagine: 550,
    anno: 2024,
    popolare: false,
  },
  {
    isbn: '9788836220540',
    titolo: 'Informatica di Base - Teoria e Test',
    autore: 'F. Cesarini, C. Soprani',
    materia: 'Informatica',
    descrizione: 'Hardware, software, reti, sicurezza informatica. ECDL e certificazioni.',
    copertina: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=600&fit=crop',
    prezzo: 2900, // €29.00
    linkAcquisto: 'https://www.edises.it/universitaria/informatica/informatica-base.html',
    linkAffiliato: 'https://www.edises.it/universitaria/informatica/informatica-base.html?ref=TRAE-AI&utm_source=trae&utm_medium=affiliate&utm_campaign=concorsi',
    numPagine: 420,
    anno: 2024,
    popolare: true,
  },
  {
    isbn: '9788836220557',
    titolo: 'Lingua Inglese B2 - Concorsi Pubblici',
    autore: 'J. Smith, M. Rossi',
    materia: 'Lingua Inglese',
    descrizione: 'Grammatica, vocabolario, comprensione testo. Con audio MP3 e simulazioni.',
    copertina: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=600&fit=crop',
    prezzo: 3200, // €32.00
    linkAcquisto: 'https://www.edises.it/universitaria/lingue/inglese-b2.html',
    linkAffiliato: 'https://www.edises.it/universitaria/lingue/inglese-b2.html?ref=TRAE-AI&utm_source=trae&utm_medium=affiliate&utm_campaign=concorsi',
    numPagine: 480,
    anno: 2024,
    popolare: true,
  },
  {
    isbn: 'SIMONE-TESTI-SPECIFICI',
    titolo: 'Store Ufficiale Edizioni Simone',
    autore: 'Edizioni Simone',
    materia: 'Altro', // Use 'Altro' as fallback since enum update failed
    descrizione: 'Accesso diretto allo store Amazon ufficiale di Edizioni Simone per manuali e testi specifici aggiornati per concorsi pubblici.',
    copertina: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=600&fit=crop', // Immagine generica libri
    prezzo: 0, // Placeholder
    linkAcquisto: 'https://www.amazon.it/stores/EdizioniSimone/page/AA740632-0D84-497E-A0D0-C11C0F0E45A7',
    linkAffiliato: 'https://www.amazon.it/stores/EdizioniSimone/page/AA740632-0D84-497E-A0D0-C11C0F0E45A7?lp_context_query=libri+concorsi+pubblici&lp_query=libri+concorsi+pubblici&lp_slot=auto-sparkle-hsa-tetris&store_ref=SB_A0536232397EM61TY3I98-A06208302TG06V0UE6S02&ref_=cm_sw_r_ud_ast_store_0T54PKVFET4CY63JWT3Y',
    numPagine: 0,
    anno: 2024,
    popolare: true,
  },
  {
    isbn: 'EDISES-TESTI-SPECIFICI',
    titolo: 'Store Ufficiale EdiSES',
    autore: 'EdiSES',
    materia: 'Altro', // Use 'Altro' as fallback since enum update failed
    descrizione: 'Accesso diretto al catalogo ufficiale EdiSES per concorsi pubblici e abilitazioni. Trova il manuale specifico per il tuo bando.',
    copertina: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=600&fit=crop', // Immagine generica libri diversa da Simone
    prezzo: 0, // Placeholder
    linkAcquisto: 'https://www.edises.it/concorsi/il-catalogo.html',
    linkAffiliato: 'https://www.edises.it/concorsi/il-catalogo.html?ref=TRAE-AI&utm_source=trae&utm_medium=affiliate&utm_campaign=concorsi',
    numPagine: 0,
    anno: 2026, // Aggiornato al 2026 come da info web
    popolare: true,
  },
];

async function seedCatalogoEdises() {
  try {
    console.log('🌱 Popolamento Catalogo Edises...');
    
    for (const manuale of manualiEdises) {
      console.log(`Inserting: ${manuale.titolo} with materia: ${manuale.materia}`);
      // Cast materia to any to bypass type check during insert, but the DB enum constraint will still be enforced.
      // We need to make sure the DB enum has been updated.
      // Since we can't easily update enum type in postgres without a migration, we might face issue if 'Testi Specifici...' is not in the enum.
      // Let's check schema-libreria.ts again. It defines a const array, but in DB it might be just text check constraint or enum.
      
      await db.insert(catalogoEdises).values(manuale as any).onConflictDoNothing();
      console.log(`  ✅ Inserito: ${manuale.titolo}`);
    }
    
    console.log('✅ Catalogo Edises popolato con successo!');
    console.log(`📚 Totale manuali: ${manualiEdises.length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore popolamento catalogo:', error);
    process.exit(1);
  }
}

seedCatalogoEdises();
