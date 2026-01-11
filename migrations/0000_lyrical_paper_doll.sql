CREATE TABLE IF NOT EXISTS "film_mentali" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"concorso_id" varchar,
	"titolo" varchar(200) NOT NULL,
	"articolo" varchar(50) NOT NULL,
	"setting" text,
	"soggetto_attivo" text NOT NULL,
	"condotta" text NOT NULL,
	"evento" text NOT NULL,
	"nesso_causale" text,
	"elemento_psicologico" text,
	"tags" text[],
	"is_preferito" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mnemoniche_numeri" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"concorso_id" varchar,
	"numero_articolo" varchar(10) NOT NULL,
	"codice_fonetico" varchar(50) NOT NULL,
	"parola_mnemonica" varchar(100) NOT NULL,
	"contesto" text,
	"note" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "palazzi_memoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"concorso_id" varchar,
	"nome_palazzo" varchar(200) NOT NULL,
	"descrizione" text,
	"stanze" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_preferito" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "film_mentali" ADD CONSTRAINT "film_mentali_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "film_mentali" ADD CONSTRAINT "film_mentali_concorso_id_concorsi_id_fk" FOREIGN KEY ("concorso_id") REFERENCES "public"."concorsi"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mnemoniche_numeri" ADD CONSTRAINT "mnemoniche_numeri_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mnemoniche_numeri" ADD CONSTRAINT "mnemoniche_numeri_concorso_id_concorsi_id_fk" FOREIGN KEY ("concorso_id") REFERENCES "public"."concorsi"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palazzi_memoria" ADD CONSTRAINT "palazzi_memoria_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "palazzi_memoria" ADD CONSTRAINT "palazzi_memoria_concorso_id_concorsi_id_fk" FOREIGN KEY ("concorso_id") REFERENCES "public"."concorsi"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
