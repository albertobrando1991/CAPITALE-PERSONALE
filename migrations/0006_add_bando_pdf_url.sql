-- Migration: Add bando_pdf_url to official_concorsi
-- Stores the URL to the PDF bando file in Supabase Storage

ALTER TABLE "official_concorsi" ADD COLUMN IF NOT EXISTS "bando_pdf_url" text;
