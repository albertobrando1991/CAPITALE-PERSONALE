
-- Migrazione per assegnare tutti i dati esistenti al nuovo utente Premium di test
UPDATE concorsi SET user_id = 'dev-user-123';
UPDATE materials SET user_id = 'dev-user-123';
UPDATE flashcards SET user_id = 'dev-user-123';
UPDATE simulazioni SET user_id = 'dev-user-123';
UPDATE user_progress SET user_id = 'dev-user-123';

-- Aggiorna anche l'utente nel sistema se necessario (upsert)
INSERT INTO users (id, email, first_name, last_name, created_at)
VALUES ('dev-user-123', 'premium@trae-ai.com', 'Premium', 'User', NOW())
ON CONFLICT (id) DO NOTHING;
