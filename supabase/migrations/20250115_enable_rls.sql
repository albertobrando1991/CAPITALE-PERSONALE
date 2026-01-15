-- Enable RLS and create policies for user-specific tables

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid()::text = id);
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid()::text = id);

-- CONCORSI
ALTER TABLE concorsi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own concorsi" ON concorsi;
CREATE POLICY "Users can manage own concorsi" ON concorsi FOR ALL USING (auth.uid()::text = user_id);

-- MATERIALS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own materials" ON materials;
CREATE POLICY "Users can manage own materials" ON materials FOR ALL USING (auth.uid()::text = user_id);

-- FLASHCARDS
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own flashcards" ON flashcards;
CREATE POLICY "Users can manage own flashcards" ON flashcards FOR ALL USING (auth.uid()::text = user_id);

-- USER_PROGRESS
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own progress" ON user_progress;
CREATE POLICY "Users can manage own progress" ON user_progress FOR ALL USING (auth.uid()::text = user_id);

-- USER_SUBSCRIPTIONS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own subscriptions" ON user_subscriptions;
CREATE POLICY "Users can read own subscriptions" ON user_subscriptions FOR SELECT USING (auth.uid()::text = user_id);

-- CALENDAR_EVENTS
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own events" ON calendar_events;
CREATE POLICY "Users can manage own events" ON calendar_events FOR ALL USING (auth.uid()::text = user_id);

-- MNEMOTECNICHE
ALTER TABLE mnemoniche_numeri ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own mnemoniche" ON mnemoniche_numeri;
CREATE POLICY "Users can manage own mnemoniche" ON mnemoniche_numeri FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE palazzi_memoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own palazzi" ON palazzi_memoria;
CREATE POLICY "Users can manage own palazzi" ON palazzi_memoria FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE film_mentali ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own film mentali" ON film_mentali;
CREATE POLICY "Users can manage own film mentali" ON film_mentali FOR ALL USING (auth.uid()::text = user_id);

-- BENESSERE
ALTER TABLE breathing_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own breathing" ON breathing_sessions;
CREATE POLICY "Users can manage own breathing" ON breathing_sessions FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE reframing_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own reframing" ON reframing_logs;
CREATE POLICY "Users can manage own reframing" ON reframing_logs FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own sleep" ON sleep_logs;
CREATE POLICY "Users can manage own sleep" ON sleep_logs FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE hydration_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own hydration" ON hydration_logs;
CREATE POLICY "Users can manage own hydration" ON hydration_logs FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own nutrition" ON nutrition_logs;
CREATE POLICY "Users can manage own nutrition" ON nutrition_logs FOR ALL USING (auth.uid()::text = user_id);

-- SQ3R
ALTER TABLE materie_sq3r ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own materie sq3r" ON materie_sq3r;
CREATE POLICY "Users can manage own materie sq3r" ON materie_sq3r FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE capitoli_sq3r ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own capitoli sq3r" ON capitoli_sq3r;
CREATE POLICY "Users can manage own capitoli sq3r" ON capitoli_sq3r FOR ALL USING (auth.uid()::text = user_id);

-- SIMULAZIONI
ALTER TABLE simulazioni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own simulazioni" ON simulazioni;
CREATE POLICY "Users can manage own simulazioni" ON simulazioni FOR ALL USING (auth.uid()::text = user_id);

-- FASE 3
ALTER TABLE fase3_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own fase3 progress" ON fase3_progress;
CREATE POLICY "Users can manage own fase3 progress" ON fase3_progress FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE fase3_error_bins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own fase3 bins" ON fase3_error_bins;
CREATE POLICY "Users can manage own fase3 bins" ON fase3_error_bins FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE fase3_errors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own fase3 errors" ON fase3_errors;
CREATE POLICY "Users can manage own fase3 errors" ON fase3_errors FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE fase3_drill_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own fase3 sessions" ON fase3_drill_sessions;
CREATE POLICY "Users can manage own fase3 sessions" ON fase3_drill_sessions FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE fase3_srs_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own fase3 srs" ON fase3_srs_items;
CREATE POLICY "Users can manage own fase3 srs" ON fase3_srs_items FOR ALL USING (auth.uid()::text = user_id);

ALTER TABLE fase3_generated_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own fase3 generated" ON fase3_generated_questions;
CREATE POLICY "Users can manage own fase3 generated" ON fase3_generated_questions FOR ALL USING (auth.uid()::text = user_id);

-- FONTI STUDIO
ALTER TABLE fonti_studio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own fonti" ON fonti_studio;
CREATE POLICY "Users can manage own fonti" ON fonti_studio FOR ALL USING (auth.uid()::text = user_id);

-- NESTED TABLES (QUIZZES, QUESTIONS, ANSWERS)
-- Quizzes
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own quizzes" ON quizzes;
CREATE POLICY "Users can manage own quizzes" ON quizzes FOR ALL USING (
  capitolo_id IN (SELECT id FROM capitoli_sq3r WHERE user_id = auth.uid()::text)
);

-- Questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own questions" ON questions;
CREATE POLICY "Users can manage own questions" ON questions FOR ALL USING (
  quiz_id IN (
    SELECT q.id FROM quizzes q
    JOIN capitoli_sq3r c ON q.capitolo_id = c.id
    WHERE c.user_id = auth.uid()::text
  )
);

-- Answers
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own answers" ON answers;
CREATE POLICY "Users can manage own answers" ON answers FOR ALL USING (
  question_id IN (
    SELECT qn.id FROM questions qn
    JOIN quizzes q ON qn.quiz_id = q.id
    JOIN capitoli_sq3r c ON q.capitolo_id = c.id
    WHERE c.user_id = auth.uid()::text
  )
);
