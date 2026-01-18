-- Migration: Create Libreria Pubblica tables
-- This migration creates the tables needed for the public library feature

-- 1. Create materie table (folders/categories for documents)
CREATE TABLE IF NOT EXISTS "materie" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "nome" text NOT NULL UNIQUE,
    "ordine" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 2. Create documenti_pubblici table (public documents)
CREATE TABLE IF NOT EXISTS "documenti_pubblici" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "titolo" text NOT NULL,
    "descrizione" text,
    "materia" text NOT NULL,
    "tags" text[],
    "pdf_url" text,
    "pdf_base64" text,
    "file_name" text NOT NULL,
    "file_size" integer NOT NULL,
    "num_pages" integer,
    "uploaded_by" varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "is_staff_only" boolean DEFAULT false,
    "downloads_count" integer DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- 3. Create download_log table (analytics for downloads)
CREATE TABLE IF NOT EXISTS "download_log" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "documento_id" uuid REFERENCES "documenti_pubblici"("id") ON DELETE CASCADE,
    "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_documenti_pubblici_materia" ON "documenti_pubblici"("materia");
CREATE INDEX IF NOT EXISTS "idx_documenti_pubblici_created_at" ON "documenti_pubblici"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_download_log_documento_id" ON "download_log"("documento_id");

-- 5. Seed initial materie (cartelle) based on the enum values
INSERT INTO "materie" ("nome", "ordine") VALUES
    ('Diritto Amministrativo', 1),
    ('Diritto Costituzionale', 2),
    ('Diritto Civile', 3),
    ('Contabilità Pubblica', 4),
    ('Economia Aziendale', 5),
    ('Informatica', 6),
    ('Lingua Inglese', 7),
    ('Logica', 8),
    ('Storia', 9),
    ('Geografia', 10),
    ('Testi Specifici per Concorsi Pubblici', 11),
    ('Altro', 12)
ON CONFLICT ("nome") DO NOTHING;

-- 6. Enable Row Level Security (RLS) for the tables
ALTER TABLE "materie" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documenti_pubblici" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "download_log" ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies

-- Materie: Everyone can read, only authenticated users with admin/staff role can modify
CREATE POLICY "materie_select_all" ON "materie" FOR SELECT USING (true);
CREATE POLICY "materie_insert_staff" ON "materie" FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);
CREATE POLICY "materie_update_staff" ON "materie" FOR UPDATE USING (
    auth.uid() IS NOT NULL
);
CREATE POLICY "materie_delete_staff" ON "materie" FOR DELETE USING (
    auth.uid() IS NOT NULL
);

-- Documenti pubblici: Everyone can read non-staff-only docs, staff can manage all
CREATE POLICY "documenti_select_public" ON "documenti_pubblici" FOR SELECT USING (
    is_staff_only = false OR auth.uid() IS NOT NULL
);
CREATE POLICY "documenti_insert_staff" ON "documenti_pubblici" FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);
CREATE POLICY "documenti_update_staff" ON "documenti_pubblici" FOR UPDATE USING (
    auth.uid() IS NOT NULL
);
CREATE POLICY "documenti_delete_staff" ON "documenti_pubblici" FOR DELETE USING (
    auth.uid() IS NOT NULL
);

-- Download log: Users can insert their own logs, admins can read all
CREATE POLICY "download_log_insert" ON "download_log" FOR INSERT WITH CHECK (true);
CREATE POLICY "download_log_select" ON "download_log" FOR SELECT USING (
    auth.uid() IS NOT NULL
);

COMMENT ON TABLE "materie" IS 'Categorie/cartelle per i documenti della libreria pubblica';
COMMENT ON TABLE "documenti_pubblici" IS 'Documenti PDF caricati nella libreria pubblica';
COMMENT ON TABLE "download_log" IS 'Log dei download per analytics';
