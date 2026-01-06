CREATE TABLE IF NOT EXISTS quizzes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  capitolo_id VARCHAR NOT NULL REFERENCES capitoli_sq3r(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id VARCHAR NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  correct_answer_index INTEGER NOT NULL,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS answers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id VARCHAR NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_capitolo_id ON quizzes(capitolo_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON answers(question_id);

-- RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON quizzes TO anon, authenticated, service_role;
GRANT ALL ON questions TO anon, authenticated, service_role;
GRANT ALL ON answers TO anon, authenticated, service_role;

-- Policies
CREATE POLICY "Enable all for users" ON quizzes FOR ALL USING (true);
CREATE POLICY "Enable all for users" ON questions FOR ALL USING (true);
CREATE POLICY "Enable all for users" ON answers FOR ALL USING (true);
