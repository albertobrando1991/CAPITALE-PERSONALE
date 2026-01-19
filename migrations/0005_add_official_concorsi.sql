-- Migration: Add Official Concorsi Catalog
-- Creates the official_concorsi table and adds official_concorso_id to concorsi

-- Create official_concorsi table
CREATE TABLE IF NOT EXISTS "official_concorsi" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titolo" text NOT NULL,
	"ente" text NOT NULL,
	"descrizione" text,
	"scadenza_domanda" timestamp,
	"data_prova" timestamp,
	"posti" integer,
	"link_bando" text,
	"link_pagina_ufficiale" text,
	"active" boolean DEFAULT true,
	"bando_analysis" jsonb,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

-- Add official_concorso_id column to concorsi table
ALTER TABLE "concorsi" ADD COLUMN IF NOT EXISTS "official_concorso_id" varchar;
