CREATE TABLE "breathing_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"concorso_id" varchar,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"cycles_completed" integer DEFAULT 0,
	"duration_seconds" integer,
	"context" varchar(50),
	"heart_rate_before" integer,
	"heart_rate_after" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hydration_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"glasses_count" integer DEFAULT 0,
	"target_glasses" integer DEFAULT 8,
	"last_drink_at" timestamp,
	"last_reminder_at" timestamp,
	"reminder_enabled" boolean DEFAULT true,
	"reminder_interval_minutes" integer DEFAULT 60,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "nutrition_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"meal_time" timestamp NOT NULL,
	"meal_type" varchar(20),
	"description" text,
	"energy_level_before" integer,
	"energy_level_after" integer,
	"brain_fog" boolean DEFAULT false,
	"glycemic_spike" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reframing_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"concorso_id" varchar,
	"anxious_thought" text NOT NULL,
	"reframed_thought" text NOT NULL,
	"ai_suggestion" text,
	"ai_model" varchar(50),
	"effectiveness_rating" integer,
	"context" varchar(50),
	"tags" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sleep_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"bedtime" text,
	"wake_time" text,
	"total_hours" real,
	"quality_rating" integer,
	"rem_sleep_hours" real,
	"deep_sleep_hours" real,
	"interruptions" integer DEFAULT 0,
	"notes" text,
	"mood_on_waking" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "breathing_sessions" ADD CONSTRAINT "breathing_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breathing_sessions" ADD CONSTRAINT "breathing_sessions_concorso_id_concorsi_id_fk" FOREIGN KEY ("concorso_id") REFERENCES "public"."concorsi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hydration_logs" ADD CONSTRAINT "hydration_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_logs" ADD CONSTRAINT "nutrition_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reframing_logs" ADD CONSTRAINT "reframing_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reframing_logs" ADD CONSTRAINT "reframing_logs_concorso_id_concorsi_id_fk" FOREIGN KEY ("concorso_id") REFERENCES "public"."concorsi"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_logs" ADD CONSTRAINT "sleep_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;