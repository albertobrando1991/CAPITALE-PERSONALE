import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Changed to varchar
  userEmail: text("user_email"),
  userRole: text("user_role"),
  
  actionType: text("action_type").notNull(),
  actionCategory: text("action_category").notNull(),
  actionDescription: text("action_description"),
  
  entityType: text("entity_type"),
  entityId: varchar("entity_id"), // Changed to varchar
  entityName: text("entity_name"),
  
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  
  ipAddress: varchar("ip_address", { length: 45 }), // IPv6 support
  userAgent: text("user_agent"),
  requestPath: text("request_path"),
  requestMethod: text("request_method"),
  
  metadata: jsonb("metadata").default({}),
  
  status: text("status").default('success'),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ 
  id: true, 
  createdAt: true 
});

export const selectAuditLogSchema = createSelectSchema(auditLogs);

export type AuditLog = z.infer<typeof selectAuditLogSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Security Alerts Table
export const securityAlerts = pgTable("security_alerts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ruleName: text("rule_name").notNull(),
  severity: text("severity").notNull(), // 'low', 'medium', 'high', 'critical'
  message: text("message").notNull(),
  data: jsonb("data"),
  resolved: boolean("resolved").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: varchar("resolved_by"), // Changed to varchar
});

export const insertSecurityAlertSchema = createInsertSchema(securityAlerts).omit({ 
  id: true, 
  createdAt: true,
  resolvedAt: true,
  resolvedBy: true
});

export type SecurityAlert = typeof securityAlerts.$inferSelect;
export type InsertSecurityAlert = z.infer<typeof insertSecurityAlertSchema>;
