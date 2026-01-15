-- Update the CHECK constraint for 'mode' column in fase3_drill_sessions table
-- Use raw SQL without PL/pgSQL block to ensure compatibility with migration tools
-- This assumes table exists, which is standard for migrations modifying tables

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'fase3_drill_sessions') THEN
        ALTER TABLE fase3_drill_sessions DROP CONSTRAINT IF EXISTS fase3_drill_sessions_mode_check;
        ALTER TABLE fase3_drill_sessions ADD CONSTRAINT fase3_drill_sessions_mode_check CHECK (mode IN ('weak', 'topic', 'mixed', 'pdf', 'text'));
    END IF;
END $$;