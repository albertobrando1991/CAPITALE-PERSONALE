import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Tabella legacy per prevenire data loss durante migrazioni
export const normativaIndex = pgTable("normativa_index", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  urn: text("urn"),
  titolo: text("titolo"),
  descrizione: text("descrizione"),
  estremi: text("estremi"),
  anno: integer("anno"),
  tipo: text("tipo"),
  keywords: text("keywords").array(),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow(),
});
