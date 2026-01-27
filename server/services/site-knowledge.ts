
export const SITE_KNOWLEDGE = `
# CAPITALE PERSONALE - PIATTAFORMA DI PREPARAZIONE CONCORSI

## MISSIONE
Capitale Personale è una piattaforma all-in-one per la preparazione ai concorsi pubblici italiani. Il metodo si basa su 4 fasi distinte per massimizzare l'apprendimento e la memorizzazione.

## FASI DEL METODO DI STUDIO

### FASE 0: SETUP & ORGANIZZAZIONE
- **Obiettivo**: Organizzare il materiale e il piano di studi.
- **Funzionalità**:
  - **Integrazione Bando**: Caricamento automatico dei dettagli del concorso (scadenze, materie) da cataloghi ufficiali o inserimento manuale.
  - **Analisi Bando AI**: L'AI analizza il PDF del bando per estrarre materie e argomenti chiave.
  - **Diario di Studio**: Strumento per tracciare ore di studio e progressi.

### FASE 1: APPRENDIMENTO ATTIVO (SQ3R)
- **Metodo**: Survey, Question, Read, Recite, Review.
- **Funzionalità "Studio Guidato AI"**:
  - L'utente carica i materiali (PDF, DOC).
  - L'AI guida l'utente attraverso i 5 step del metodo SQ3R.
  - Generazione automatica di domande di attivazione pre-lettura.
  - Estrazione concetti chiave.

### FASE 2: MEMORIZZAZIONE (FLASHCARDS & MNEMOTECNICHE)
- **Flashcards AI**:
  - Generazione automatica di flashcard dai materiali di studio.
  - Algoritmo SM2 (Spaced Repetition) per ottimizzare i ripassi.
  - Possibilità di chiedere all'AI di "Spiegare meglio" una carta.
- **Mnemotecniche Avanzate**:
  - **Conversioni Fonetiche**: Strumento per convertire numeri (es. articoli di legge) in parole facili da ricordare.
  - **Palazzi della Memoria**: Creazione guidata di luoghi mentali per associare concetti.
  - **Film Mentali**: Tecnica per memorizzare sequenze giuridiche (Soggetto, Condotta, Evento) come scene di un film.
  - **Acronimi**: Generatore di acronimi per liste.

### FASE 3: DRILL & QUIZ
- **Quiz AI**: Generazione infinita di quiz a risposta multipla basati sul materiale caricato.
- **Sessioni Drill**: Modalità intensiva per allenarsi su specifici argomenti.
- **Distrattori Intelligenti**: Le risposte errate sono generate per essere plausibili e difficili.

### FASE 4: SIMULAZIONE
- **Simulazione Esame**: Replica l'ambiente di prova reale (timer, numero domande, punteggio).
- **Reportistica**: Analisi dettagliata delle aree di forza e debolezza.

### ESAME ORALE (MODALITÀ VOCALE)
- **Interrogazione AI**: L'utente può simulare un esame orale.
- **Voce Naturale**: L'AI pone domande con voce umana (TTS) e ascolta le risposte (STT).
- **Feedback Immediato**: Valutazione della risposta su contenuto ed esposizione.

## ALTRE FUNZIONALITÀ CHIAVE

### LIBRERIA PUBBLICA
- Accesso a codici (Civile, Penale), Costituzione e leggi speciali.
- Integrazione cataloghi Edises (simulazioni esterne).

### WELLNESS SUITE (BENESSERE PSICOFISICO)
- **Respirazione Guidata**: Esercizi di respirazione (es. 4-7-8) per gestire l'ansia pre-esame o pre-studio.
- **Reframing Pensieri**: Strumento CBT (Cognitive Behavioral Therapy) per riformulare pensieri ansiosi ("Non ce la farò mai" -> "Mi sono preparato bene").
- **Monitoraggio**: Log di sonno, idratazione e nutrizione per ottimizzare le performance cognitive.

## SUPPORTO AI & CONTATTI
- **Assistente Virtuale**: Tu sei l'assistente che guida l'utente nell'uso di queste funzioni.
- **Contatto Umano**: Se l'utente ha problemi tecnici bloccanti o richieste amministrative, può contattare lo staff via Email o WhatsApp.
`;

export const SUPPORT_OPTIONS = {
    whatsapp: {
        number: "393513998959", // Sostituire con numero reale se diverso
        text: "Ciao, ho bisogno di assistenza con la piattaforma Capitale Personale.",
        link: "https://wa.me/393513998959?text=Ciao%2C%20ho%20bisogno%20di%20assistenza%20con%20la%20piattaforma%20Capitale%20Personale." // Encode URI component
    },
    email: {
        address: "info@capitalepersonale.it", // Sostituire con email reale
        subject: "Richiesta Assistenza Capitale Personale",
        body: "Salve, avrei bisogno di supporto per..."
    }
};
