
-- Aggiorna l'enum 'materia' se esiste, altrimenti modifica il check constraint se usato
-- Nota: In Postgres gli enum sono tipi statici. Bisogna aggiungere il valore.

-- Prova a rimuovere il constraint se esiste (per sicurezza)
ALTER TABLE "documenti_pubblici" DROP CONSTRAINT IF EXISTS "documenti_pubblici_materia_check";

-- Se non usiamo enum ma check constraint (Drizzle default), aggiorniamo il check
DO $$
BEGIN
    -- Se esiste la tabella
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documenti_pubblici') THEN
       -- Aggiungiamo un nuovo check constraint con tutti i valori aggiornati
       ALTER TABLE "documenti_pubblici" ADD CONSTRAINT "documenti_pubblici_materia_check" 
       CHECK (materia IN ('Diritto Amministrativo', 'Diritto Costituzionale', 'Diritto Civile', 'Contabilità Pubblica', 'Economia Aziendale', 'Informatica', 'Lingua Inglese', 'Logica', 'Storia', 'Geografia', 'Testi Specifici per Concorsi Pubblici', 'Altro'));
    END IF;
END$$;

