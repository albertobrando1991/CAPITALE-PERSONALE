-- ============================================================================
-- FASE 3: GENERATED QUESTIONS CACHE
-- Migration: 0003_create_fase3_generated_questions.sql
-- Descrizione: Cache per domande generate (distrattori AI) per risparmiare token
-- ============================================================================

CREATE TABLE IF NOT EXISTS fase3_generated_questions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concorso_id VARCHAR NOT NULL REFERENCES concorsi(id) ON DELETE CASCADE,
    flashcard_id VARCHAR REFERENCES flashcards(id) ON DELETE CASCADE,
    
    -- Contenuto domanda
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    distractors JSONB NOT NULL, -- Array JSON ["A", "B", "C"]
    
    -- Metadati
    explanation TEXT,
    topic VARCHAR(200),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Vincolo: una sola versione "cached" per flashcard per utente
    UNIQUE(user_id, flashcard_id)
);

-- Indici
CREATE INDEX idx_fase3_gen_questions_user_fc ON fase3_generated_questions(user_id, flashcard_id);
CREATE INDEX idx_fase3_gen_questions_topic ON fase3_generated_questions(topic);
