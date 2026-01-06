
-- Banca Dati Podcast (caricati da staff)
CREATE TABLE IF NOT EXISTS podcast_database (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo TEXT NOT NULL,
  descrizione TEXT,
  materia TEXT NOT NULL,
  argomento TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  audio_file_name TEXT,
  audio_file_size INTEGER,
  durata INTEGER,
  trascrizione TEXT,
  uploaded_by VARCHAR NOT NULL,
  is_public BOOLEAN DEFAULT true,
  is_premium_only BOOLEAN DEFAULT true,
  ascolti_totali INTEGER DEFAULT 0,
  download_totali INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Richieste Podcast Custom (da utenti premium)
CREATE TABLE IF NOT EXISTS podcast_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  concorso_id VARCHAR NOT NULL, -- Rimosso vincolo FK stretto per evitare errori se la tabella concorsi non esiste o ha ID diversi
  materia TEXT NOT NULL,
  argomento TEXT NOT NULL,
  descrizione TEXT,
  status TEXT DEFAULT 'pending',
  priorita TEXT DEFAULT 'normale',
  podcast_id UUID REFERENCES podcast_database(id) ON DELETE SET NULL,
  note_staff TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Log Ascolti Podcast (analytics)
CREATE TABLE IF NOT EXISTS podcast_listens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id UUID REFERENCES podcast_database(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL,
  progresso_secondi INTEGER DEFAULT 0,
  completato BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Abbonamenti Utenti (se non esiste già)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE,
  tier TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active',
  sintesi_usate INTEGER DEFAULT 0,
  sintesi_limite INTEGER DEFAULT 5,
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  last_reset TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
