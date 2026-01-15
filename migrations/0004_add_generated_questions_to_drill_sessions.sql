-- ============================================================================
-- FASE 3: ADD GENERATED QUESTIONS TO DRILL SESSIONS
-- Migration: 0004_add_generated_questions_to_drill_sessions.sql
-- Descrizione: Aggiunge colonna per salvare le domande generate nella sessione
-- ============================================================================

ALTER TABLE fase3_drill_sessions 
ADD COLUMN IF NOT EXISTS generated_questions TEXT;
