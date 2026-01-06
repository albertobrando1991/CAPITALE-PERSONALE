/**
 * Implementazione dell'algoritmo SM-2 (SuperMemo 2)
 * per il sistema di ripetizione spaziata (Spaced Repetition System)
 * 
 * L'algoritmo calcola automaticamente quando rivedere ogni flashcard
 * basandosi sulla facilità di ricordo e sul numero di ripetizioni corrette.
 * 
 * @see https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

export interface SM2Response {
  intervalloGiorni: number;
  numeroRipetizioni: number;
  easeFactor: number;
  prossimoRipasso: Date;
}

/**
 * Calcola il prossimo intervallo e aggiorna i parametri SM-2
 * 
 * @param quality - Qualità della risposta (0-3):
 *   0: Non Ricordo
 *   3: Facile
 * @param prevEaseFactor - Facilità di ricordo precedente (default 2.5)
 * @param prevIntervalloGiorni - Intervallo in giorni precedente (default 0)
 * @param prevNumeroRipetizioni - Numero di ripetizioni precedente (default 0)
 * @returns Nuovi parametri SM-2 e data del prossimo ripasso
 */
export function calculateSM2(
  quality: number, // 0 = Non Ricordo, 3 = Facile
  prevEaseFactor: number = 2.5,
  prevIntervalloGiorni: number = 0,
  prevNumeroRipetizioni: number = 0
): SM2Response {
  // Calcola nuovo easeFactor
  let newEaseFactor = prevEaseFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
  
  // Limita easeFactor tra 1.3 e 2.5
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;
  if (newEaseFactor > 2.5) newEaseFactor = 2.5;
  
  let newIntervalloGiorni: number;
  let newNumeroRipetizioni: number;
  
  if (quality < 3) {
    // Non Ricordo (quality = 0) → reset
    newNumeroRipetizioni = 0;
    // MODIFICA RICHIESTA: Se non ricordo, voglio rivederla SUBITO, non domani.
    // Impostiamo intervallo a 0 giorni (oggi)
    newIntervalloGiorni = 0; 
  } else {
    // Facile (quality = 3) → avanza
    newNumeroRipetizioni = prevNumeroRipetizioni + 1;
    
    if (newNumeroRipetizioni === 1) {
      newIntervalloGiorni = 1; // Prima ripetizione: 1 giorno
    } else if (newNumeroRipetizioni === 2) {
      newIntervalloGiorni = 6; // Seconda ripetizione: 6 giorni
    } else {
      // Successive: intervallo precedente * easeFactor
      newIntervalloGiorni = Math.round(prevIntervalloGiorni * newEaseFactor);
    }
  }
  
  // Calcola data prossimo ripasso
  const prossimoRipasso = new Date();
  
  // Se l'intervallo è 0 (Non Ricordo), vogliamo che sia disponibile ORA, non a mezzanotte.
  // Se l'intervallo > 0, va bene mezzanotte del giorno futuro.
  if (newIntervalloGiorni === 0) {
    // Lasciamo data/ora attuale (o anche un minuto fa per sicurezza)
    // Non facciamo setHours(0,0,0,0) così appare subito nelle query "prossimoRipasso <= now"
  } else {
    prossimoRipasso.setDate(prossimoRipasso.getDate() + newIntervalloGiorni);
    prossimoRipasso.setHours(0, 0, 0, 0); // Reset a mezzanotte per i giorni futuri
  }
  
  return {
    intervalloGiorni: newIntervalloGiorni,
    numeroRipetizioni: newNumeroRipetizioni,
    easeFactor: Math.round(newEaseFactor * 100) / 100, // Arrotonda a 2 decimali
    prossimoRipasso
  };
}

/**
 * Converte il livello SRS semplice (0-3) in qualità SM-2 (0-3)
 * per retrocompatibilità con il sistema esistente
 * 
 * @param livelloSRS - Livello SRS semplice (0=non ricordato, 3=facile)
 * @returns Qualità SM-2 equivalente (0 o 3)
 */
export function livelloSRSToQuality(livelloSRS: number): number {
  // 0 = Non Ricordo → quality 0
  // 3 = Facile → quality 3
  return livelloSRS === 3 ? 3 : 0;
}

/**
 * Inizializza i parametri SM-2 per una nuova flashcard
 */
export function initializeSM2() {
  return {
    easeFactor: 2.5,
    intervalloGiorni: 0,
    numeroRipetizioni: 0,
  };
}

