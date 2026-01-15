-- ============================================================================
-- FASE 3: CONSOLIDAMENTO & PRATICA INTENSA
-- Migration: 0002_create_fase3_tables.sql
-- Descrizione: Tabelle per Binning, Active Recall, Spaced Repetition Avanzata
-- ============================================================================

-- ============================================================================
-- 1. FASE3_PROGRESS: Tracking progresso consolidamento per concorso
-- ============================================================================
CREATE TABLE IF NOT EXISTS fase3_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concorso_id VARCHAR NOT NULL REFERENCES concorsi(id) ON DELETE CASCADE,
    
    -- Metriche chiave
    total_errors INTEGER DEFAULT 0,
    weak_areas_count INTEGER DEFAULT 0,
    retention_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentuale 0-100
    total_drill_hours DECIMAL(6,2) DEFAULT 0.00,
    total_drill_sessions INTEGER DEFAULT 0,
    total_srs_reviews INTEGER DEFAULT 0,
    
    -- Stato consolidamento
    status VARCHAR(20) DEFAULT 'WEAK' CHECK (status IN ('WEAK', 'REVIEW', 'SOLID')),
    
    -- Unlock Simulazioni
    can_access_fase4 BOOLEAN DEFAULT FALSE,
    fase4_unlocked_at TIMESTAMP,
    
    -- Timestamps
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: un solo record per user+concorso
    UNIQUE(user_id, concorso_id)
);

-- Indici per performance
CREATE INDEX idx_fase3_progress_user_id ON fase3_progress(user_id);
CREATE INDEX idx_fase3_progress_concorso_id ON fase3_progress(concorso_id);
CREATE INDEX idx_fase3_progress_status ON fase3_progress(status);

-- ============================================================================
-- 2. FASE3_ERROR_BINS: Raggruppamenti errori per argomento
-- ============================================================================
CREATE TABLE IF NOT EXISTS fase3_error_bins (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concorso_id VARCHAR NOT NULL REFERENCES concorsi(id) ON DELETE CASCADE,
    materia_id VARCHAR REFERENCES materie_sq3r(id) ON DELETE SET NULL,
    
    -- Identificazione argomento
    topic_name VARCHAR(200) NOT NULL, -- es: "Codice Civile - Obbligazioni"
    topic_slug VARCHAR(200), -- es: "codice-civile-obbligazioni"
    
    -- Metriche errori
    error_count INTEGER DEFAULT 0,
    error_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentuale errori su tentativi
    total_attempts INTEGER DEFAULT 0,
    
    -- Difficoltà percepita
    difficulty_score INTEGER DEFAULT 0 CHECK (difficulty_score BETWEEN 0 AND 100),
    
    -- Piano recupero AI
    recovery_plan TEXT, -- Generato da Gemini AI
    recovery_plan_generated_at TIMESTAMP,
    
    -- Stato risoluzione
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici
CREATE INDEX idx_fase3_error_bins_user_id ON fase3_error_bins(user_id);
CREATE INDEX idx_fase3_error_bins_concorso_id ON fase3_error_bins(concorso_id);
CREATE INDEX idx_fase3_error_bins_topic_slug ON fase3_error_bins(topic_slug);
CREATE INDEX idx_fase3_error_bins_is_resolved ON fase3_error_bins(is_resolved);

-- ============================================================================
-- 3. FASE3_ERRORS: Singoli errori tracciati
-- ============================================================================
CREATE TABLE IF NOT EXISTS fase3_errors (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concorso_id VARCHAR NOT NULL REFERENCES concorsi(id) ON DELETE CASCADE,
    error_bin_id INTEGER REFERENCES fase3_error_bins(id) ON DELETE CASCADE,
    
    -- Origine errore
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('quiz', 'flashcard', 'drill', 'simulazione', 'blind_retrieval')),
    source_id VARCHAR, -- ID del quiz/flashcard/drill originale
    
    -- Dettagli errore
    question_text TEXT,
    wrong_answer TEXT,
    correct_answer TEXT,
    explanation TEXT,
    
    -- Classificazione errore
    mistake_type VARCHAR(50) CHECK (mistake_type IN ('memoria', 'comprensione', 'distrazione', 'tempo', 'confusione_concetti', 'altro')),
    
    -- Tracciamento ricorrenza
    is_recurring BOOLEAN DEFAULT FALSE, -- Errore ripetuto > 2 volte
    recurrence_count INTEGER DEFAULT 1,
    
    -- Timestamps
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici
CREATE INDEX idx_fase3_errors_user_id ON fase3_errors(user_id);
CREATE INDEX idx_fase3_errors_concorso_id ON fase3_errors(concorso_id);
CREATE INDEX idx_fase3_errors_error_bin_id ON fase3_errors(error_bin_id);
CREATE INDEX idx_fase3_errors_source_type ON fase3_errors(source_type);
CREATE INDEX idx_fase3_errors_is_recurring ON fase3_errors(is_recurring);

-- ============================================================================
-- 4. FASE3_DRILL_SESSIONS: Sessioni pratica mirata
-- ============================================================================
CREATE TABLE IF NOT EXISTS fase3_drill_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concorso_id VARCHAR NOT NULL REFERENCES concorsi(id) ON DELETE CASCADE,
    topic_id VARCHAR, -- ID argomento/materia/error_bin
    
    -- Modalità drill
    mode VARCHAR(50) DEFAULT 'topic' CHECK (mode IN ('weak', 'topic', 'mixed')), 
    -- weak: solo aree deboli
    -- topic: argomento specifico
    -- mixed: random da tutto
    
    -- Parametri sessione
    total_questions INTEGER DEFAULT 20,
    correct_answers INTEGER DEFAULT 0,
    wrong_answers INTEGER DEFAULT 0,
    skipped_questions INTEGER DEFAULT 0,
    
    -- Timing
    duration_seconds INTEGER, -- Durata totale sessione
    avg_time_per_question DECIMAL(6,2), -- Tempo medio per domanda (secondi)
    
    -- Performance
    score_percentage DECIMAL(5,2), -- % risposte corrette
    improvement_rate DECIMAL(6,2), -- % miglioramento vs sessione precedente sullo stesso topic
    
    -- Nuovi errori trovati
    new_errors_found INTEGER DEFAULT 0,
    new_error_bins_created INTEGER DEFAULT 0,
    
    -- Stato completamento
    is_completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indici
CREATE INDEX idx_fase3_drill_sessions_user_id ON fase3_drill_sessions(user_id);
CREATE INDEX idx_fase3_drill_sessions_concorso_id ON fase3_drill_sessions(concorso_id);
CREATE INDEX idx_fase3_drill_sessions_mode ON fase3_drill_sessions(mode);
CREATE INDEX idx_fase3_drill_sessions_completed_at ON fase3_drill_sessions(completed_at);

-- ============================================================================
-- 5. FASE3_SRS_ITEMS: Spaced Repetition System Unificato
-- ============================================================================
CREATE TABLE IF NOT EXISTS fase3_srs_items (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    concorso_id VARCHAR NOT NULL REFERENCES concorsi(id) ON DELETE CASCADE,
    
    -- Tipo e riferimento item
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('flashcard', 'quiz_topic', 'capitolo', 'error_bin')),
    item_id VARCHAR NOT NULL, -- ID della flashcard/capitolo/error_bin originale
    item_reference TEXT, -- Testo/titolo per display
    
    -- Algoritmo SM-2 (SuperMemo 2)
    ease_factor DECIMAL(4,2) DEFAULT 2.50, -- Facilità (default 2.5)
    interval_days INTEGER DEFAULT 1, -- Intervallo prossima review (giorni)
    repetitions INTEGER DEFAULT 0, -- Numero ripetizioni corrette consecutive
    
    -- Scheduling
    next_review_date DATE NOT NULL,
    last_reviewed_at TIMESTAMP,
    
    -- Rating ultima review (1-5)
    -- 1: Again (dimenticato, ripeti oggi)
    -- 2: Hard (difficile, rivedi presto)
    -- 3: Good (bene, intervallo normale)
    -- 4: Easy (facile, intervallo lungo)
    -- 5: Perfect (perfetto, intervallo massimo)
    last_rating INTEGER CHECK (last_rating BETWEEN 1 AND 5),
    
    -- Statistiche
    total_reviews INTEGER DEFAULT 0,
    times_forgotten INTEGER DEFAULT 0, -- Quante volte rating = 1
    current_streak INTEGER DEFAULT 0, -- Serie consecutive rating >= 3
    best_streak INTEGER DEFAULT 0,
    
    -- Stato
    is_mastered BOOLEAN DEFAULT FALSE, -- Considerato "padroneggiato" dopo 5+ review con rating >= 4
    mastered_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: un solo SRS item per tipo+id+user+concorso
    UNIQUE(user_id, concorso_id, item_type, item_id)
);

-- Indici
CREATE INDEX idx_fase3_srs_items_user_id ON fase3_srs_items(user_id);
CREATE INDEX idx_fase3_srs_items_concorso_id ON fase3_srs_items(concorso_id);
CREATE INDEX idx_fase3_srs_items_next_review_date ON fase3_srs_items(next_review_date);
CREATE INDEX idx_fase3_srs_items_item_type ON fase3_srs_items(item_type);
CREATE INDEX idx_fase3_srs_items_is_mastered ON fase3_srs_items(is_mastered);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================================

-- Trigger per fase3_progress
CREATE OR REPLACE FUNCTION update_fase3_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fase3_progress_updated_at
    BEFORE UPDATE ON fase3_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_fase3_progress_updated_at();

-- Trigger per fase3_error_bins
CREATE TRIGGER trigger_update_fase3_error_bins_updated_at
    BEFORE UPDATE ON fase3_error_bins
    FOR EACH ROW
    EXECUTE FUNCTION update_fase3_progress_updated_at();

-- Trigger per fase3_drill_sessions
CREATE TRIGGER trigger_update_fase3_drill_sessions_updated_at
    BEFORE UPDATE ON fase3_drill_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_fase3_progress_updated_at();

-- Trigger per fase3_srs_items
CREATE TRIGGER trigger_update_fase3_srs_items_updated_at
    BEFORE UPDATE ON fase3_srs_items
    FOR EACH ROW
    EXECUTE FUNCTION update_fase3_progress_updated_at();

-- ============================================================================
-- TRIGGER: Auto-update error_rate in fase3_error_bins
-- ============================================================================
CREATE OR REPLACE FUNCTION update_error_bin_rate()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE fase3_error_bins
    SET
        error_count = (SELECT COUNT(*) FROM fase3_errors WHERE error_bin_id = NEW.error_bin_id),
        error_rate = CASE
            WHEN total_attempts > 0 THEN (error_count::DECIMAL / total_attempts * 100)
            ELSE 0
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.error_bin_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_error_bin_rate
    AFTER INSERT ON fase3_errors
    FOR EACH ROW
    WHEN (NEW.error_bin_id IS NOT NULL)
    EXECUTE FUNCTION update_error_bin_rate();

-- ============================================================================
-- FUNZIONE HELPER: Calcola stato Fase 3
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_fase3_status(p_concorso_id VARCHAR, p_user_id VARCHAR)
RETURNS VARCHAR(20) AS $$
DECLARE
    v_weak_areas INTEGER;
    v_retention DECIMAL(5,2);
    v_drill_hours DECIMAL(6,2);
BEGIN
    SELECT
        weak_areas_count,
        retention_rate,
        total_drill_hours
    INTO v_weak_areas, v_retention, v_drill_hours
    FROM fase3_progress
    WHERE concorso_id = p_concorso_id AND user_id = p_user_id;
    
    -- Logica stato
    IF v_weak_areas >= 5 OR v_retention < 70 THEN
        RETURN 'WEAK';
    ELSIF v_weak_areas >= 3 OR v_retention < 85 THEN
        RETURN 'REVIEW';
    ELSE
        RETURN 'SOLID';
    END IF;
END;
$$ LANGUAGE plpgsql;
