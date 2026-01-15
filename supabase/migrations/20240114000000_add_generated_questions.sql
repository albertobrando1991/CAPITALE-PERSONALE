-- Add generated_questions column to fase3_drill_sessions table
-- Only run if table exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fase3_drill_sessions') THEN
        ALTER TABLE fase3_drill_sessions ADD COLUMN IF NOT EXISTS generated_questions JSONB DEFAULT '[]'::jsonb;
        UPDATE fase3_drill_sessions SET generated_questions = '[]'::jsonb WHERE generated_questions IS NULL;
    END IF;
END $$;