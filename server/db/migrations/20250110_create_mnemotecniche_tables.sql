-- ===================================================== 
 -- TABELLA: mnemoniche_numeri 
 -- Descrizione: Salva conversioni numeri → parole mnemoniche 
 -- ===================================================== 
 CREATE TABLE IF NOT EXISTS mnemoniche_numeri ( 
   id SERIAL PRIMARY KEY, 
   user_id VARCHAR(255) NOT NULL, -- Changed from INTEGER to match users table
   concorso_id VARCHAR(255), -- Changed from INTEGER to match concorsi table
   numero_articolo VARCHAR(10) NOT NULL, 
   codice_fonetico VARCHAR(50) NOT NULL, 
   parola_mnemonica VARCHAR(100) NOT NULL, 
   contesto TEXT, -- es. "Art. 328 CP - Rifiuto atti d'ufficio" 
   note TEXT, 
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
   
   CONSTRAINT fk_mnemoniche_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, 
   CONSTRAINT fk_mnemoniche_concorso FOREIGN KEY (concorso_id) REFERENCES concorsi(id) ON DELETE SET NULL 
 ); 
 
 CREATE INDEX idx_mnemoniche_user_id ON mnemoniche_numeri(user_id); 
 CREATE INDEX idx_mnemoniche_concorso_id ON mnemoniche_numeri(concorso_id); 
 
 -- ===================================================== 
 -- TABELLA: palazzi_memoria 
 -- Descrizione: Salva palazzi della memoria con stanze 
 -- ===================================================== 
 CREATE TABLE IF NOT EXISTS palazzi_memoria ( 
   id SERIAL PRIMARY KEY, 
   user_id VARCHAR(255) NOT NULL, 
   concorso_id VARCHAR(255), 
   nome_palazzo VARCHAR(200) NOT NULL, 
   descrizione TEXT, 
   stanze JSONB NOT NULL DEFAULT '[]', -- [{nome, articolo, immagine, ordine}] 
   -- totale_stanze INTEGER GENERATED ALWAYS AS (jsonb_array_length(stanze)) STORED, -- Removing generated column for compatibility if needed, or keeping if postgres version supports it. Let's keep it simple or check if supported.
   is_preferito BOOLEAN DEFAULT FALSE, 
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
   
   CONSTRAINT fk_palazzi_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, 
   CONSTRAINT fk_palazzi_concorso FOREIGN KEY (concorso_id) REFERENCES concorsi(id) ON DELETE SET NULL 
 ); 
 
 CREATE INDEX idx_palazzi_user_id ON palazzi_memoria(user_id); 
 CREATE INDEX idx_palazzi_concorso_id ON palazzi_memoria(concorso_id); 
 
 -- ===================================================== 
 -- TABELLA: film_mentali 
 -- Descrizione: Salva visualizzazioni cinematografiche di reati/concetti 
 -- ===================================================== 
 CREATE TABLE IF NOT EXISTS film_mentali ( 
   id SERIAL PRIMARY KEY, 
   user_id VARCHAR(255) NOT NULL, 
   concorso_id VARCHAR(255), 
   titolo VARCHAR(200) NOT NULL, 
   articolo VARCHAR(50) NOT NULL, 
   setting TEXT, 
   soggetto_attivo TEXT NOT NULL, 
   condotta TEXT NOT NULL, 
   evento TEXT NOT NULL, 
   nesso_causale TEXT, 
   elemento_psicologico TEXT, 
   tags TEXT[], -- Changed from VARCHAR(50)[] to TEXT[] for better compatibility
   is_preferito BOOLEAN DEFAULT FALSE, 
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
   
   CONSTRAINT fk_film_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, 
   CONSTRAINT fk_film_concorso FOREIGN KEY (concorso_id) REFERENCES concorsi(id) ON DELETE SET NULL 
 ); 
 
 CREATE INDEX idx_film_user_id ON film_mentali(user_id); 
 CREATE INDEX idx_film_concorso_id ON film_mentali(concorso_id); 
 CREATE INDEX idx_film_articolo ON film_mentali(articolo); 
 
 -- ===================================================== 
 -- TRIGGER: aggiorna updated_at automaticamente 
 -- ===================================================== 
 CREATE OR REPLACE FUNCTION update_mnemotecniche_updated_at() 
 RETURNS TRIGGER AS $$ 
 BEGIN 
   NEW.updated_at = CURRENT_TIMESTAMP; 
   RETURN NEW; 
 END; 
 
 $$ LANGUAGE plpgsql; 
 
 DROP TRIGGER IF EXISTS trigger_update_mnemoniche_numeri ON mnemoniche_numeri;
 CREATE TRIGGER trigger_update_mnemoniche_numeri 
   BEFORE UPDATE ON mnemoniche_numeri 
   FOR EACH ROW EXECUTE FUNCTION update_mnemotecniche_updated_at(); 
 
 DROP TRIGGER IF EXISTS trigger_update_palazzi_memoria ON palazzi_memoria;
 CREATE TRIGGER trigger_update_palazzi_memoria 
   BEFORE UPDATE ON palazzi_memoria 
   FOR EACH ROW EXECUTE FUNCTION update_mnemotecniche_updated_at(); 
 
 DROP TRIGGER IF EXISTS trigger_update_film_mentali ON film_mentali;
 CREATE TRIGGER trigger_update_film_mentali 
   BEFORE UPDATE ON film_mentali 
   FOR EACH ROW EXECUTE FUNCTION update_mnemotecniche_updated_at();
