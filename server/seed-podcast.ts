import { db } from './db';
import { podcastDatabase } from '../shared/schema';

const podcastDemo = [
  {
    titolo: 'Introduzione al Procedimento Amministrativo',
    descrizione: 'Podcast completo sui principi fondamentali del procedimento amministrativo: trasparenza, partecipazione, economicità.',
    materia: 'Diritto Amministrativo',
    argomento: 'Procedimento Amministrativo',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', // Demo MP3
    audioFileName: 'procedimento_amministrativo.mp3',
    audioFileSize: 5242880, // 5MB
    durata: 900, // 15 minuti (900 secondi)
    trascrizione: 'Il procedimento amministrativo è l\'insieme di atti e fatti giuridici che precedono e preparano l\'emanazione di un provvedimento amministrativo...',
    uploadedBy: 'dev-user-123', // Staff user
    isPublic: true,
    isPremiumOnly: true,
    ascoltiTotali: 45,
    downloadTotali: 12,
  },
  {
    titolo: 'Gli Organi della Pubblica Amministrazione',
    descrizione: 'Analisi degli organi centrali e periferici: Ministeri, Regioni, Province, Comuni. Competenze e funzioni.',
    materia: 'Diritto Amministrativo',
    argomento: 'Organi Amministrativi',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    audioFileName: 'organi_pa.mp3',
    audioFileSize: 6291456, // 6MB
    durata: 1200, // 20 minuti
    trascrizione: 'La pubblica amministrazione si articola in una pluralità di organi, ciascuno con proprie competenze...',
    uploadedBy: 'dev-user-123',
    isPublic: true,
    isPremiumOnly: true,
    ascoltiTotali: 38,
    downloadTotali: 8,
  },
  {
    titolo: 'Bilancio dello Stato e Legge di Bilancio',
    descrizione: 'Principi costituzionali, struttura del bilancio, legge di bilancio e nota di aggiornamento.',
    materia: 'Contabilità Pubblica',
    argomento: 'Bilancio Pubblico',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    audioFileName: 'bilancio_stato.mp3',
    audioFileSize: 7340032, // 7MB
    durata: 1500, // 25 minuti
    trascrizione: 'Il bilancio dello Stato è il documento contabile che rappresenta le entrate e le spese previste...',
    uploadedBy: 'dev-user-123',
    isPublic: true,
    isPremiumOnly: true,
    ascoltiTotali: 52,
    downloadTotali: 15,
  },
  {
    titolo: 'Costituzione Italiana - Parte I: Diritti e Doveri',
    descrizione: 'Analisi dei diritti fondamentali: libertà personale, manifestazione del pensiero, diritto di associazione.',
    materia: 'Diritto Costituzionale',
    argomento: 'Diritti Fondamentali',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    audioFileName: 'costituzione_diritti.mp3',
    audioFileSize: 8388608, // 8MB
    durata: 1800, // 30 minuti
    trascrizione: 'La Costituzione italiana dedica ampio spazio ai diritti fondamentali dei cittadini...',
    uploadedBy: 'dev-user-123',
    isPublic: true,
    isPremiumOnly: true,
    ascoltiTotali: 67,
    downloadTotali: 21,
  },
  {
    titolo: 'Contratto di Lavoro Subordinato',
    descrizione: 'Elementi essenziali del contratto, obblighi del lavoratore e del datore, tipi di contratto.',
    materia: 'Diritto del Lavoro',
    argomento: 'Contratto di Lavoro',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    audioFileName: 'contratto_lavoro.mp3',
    audioFileSize: 5767168, // 5.5MB
    durata: 1100, // 18 minuti
    trascrizione: 'Il contratto di lavoro subordinato si caratterizza per il vincolo di subordinazione...',
    uploadedBy: 'dev-user-123',
    isPublic: true,
    isPremiumOnly: true,
    ascoltiTotali: 41,
    downloadTotali: 10,
  },
];

async function seedPodcastDatabase() {
  try {
    console.log('🎧 Popolamento Banca Dati Podcast...');
    
    for (const podcast of podcastDemo) {
      await db.insert(podcastDatabase).values(podcast).onConflictDoNothing();
      console.log(`  ✅ Inserito: ${podcast.titolo} (${Math.floor(podcast.durata / 60)} min)`);
    }
    
    console.log('✅ Banca Dati Podcast popolata con successo!');
    console.log(`🎧 Totale podcast: ${podcastDemo.length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore popolamento podcast:', error);
    process.exit(1);
  }
}

seedPodcastDatabase();
