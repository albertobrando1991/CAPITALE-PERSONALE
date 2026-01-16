
import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid, varchar, unique, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// =============================================
// ENUMS
// =============================================

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  STAFF = 'staff',
  USER = 'user'
}

export enum Permission {
  // Utenti
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  MANAGE_ROLES = 'manage_roles',
  
  // Contenuti
  VIEW_CONTENT = 'view_content',
  CREATE_CONTENT = 'create_content',
  EDIT_CONTENT = 'edit_content',
  DELETE_CONTENT = 'delete_content',
  PUBLISH_CONTENT = 'publish_content',
  
  // Abbonamenti
  VIEW_SUBSCRIPTIONS = 'view_subscriptions',
  MANAGE_SUBSCRIPTIONS = 'manage_subscriptions',
  
  // Sistema
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_SETTINGS = 'manage_settings',
}

// =============================================
// TABLES
// =============================================

export const userRoles = pgTable("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull().unique(), // Changed to varchar to match users.id
  role: varchar("role", { length: 50 }).notNull().default('user'), 
  assignedBy: varchar("assigned_by"), // Changed to varchar
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  role: varchar("role", { length: 50 }).notNull(),
  permission: varchar("permission", { length: 100 }).notNull(),
}, (t) => ({
  unq: unique().on(t.role, t.permission),
}));

export const adminActivityLog = pgTable("admin_activity_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: varchar("admin_id").notNull(), // Changed to varchar
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: varchar("entity_id"), // Changed to varchar
  details: jsonb("details"),
  ipAddress: text("ip_address"), 
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const adminSettings = pgTable("admin_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by"), // Changed to varchar
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const userSuspensions = pgTable("user_suspensions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id").notNull(), // Changed to varchar
  reason: text("reason").notNull(),
  suspendedBy: varchar("suspended_by").notNull(), // Changed to varchar
  suspendedAt: timestamp("suspended_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true),
});

// =============================================
// RELATIONS
// =============================================

// Note: Relations to "users" table might be tricky if "users" is in "auth" schema which is not managed by Drizzle directly usually.
// But assuming we have a public "users" table or we just link by ID.
// In the current project, we have a "users" table in "public" schema (defined in schema.ts).
// So we can define relations if needed.

// =============================================
// ZOD SCHEMAS
// =============================================

export const insertUserRoleSchema = createInsertSchema(userRoles);
export const selectUserRoleSchema = createSelectSchema(userRoles);
export type UserRoleType = z.infer<typeof selectUserRoleSchema>;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;

export const insertRolePermissionSchema = createInsertSchema(rolePermissions);
export const selectRolePermissionSchema = createSelectSchema(rolePermissions);
export type RolePermission = z.infer<typeof selectRolePermissionSchema>;

export const insertAdminLogSchema = createInsertSchema(adminActivityLog);
export const selectAdminLogSchema = createSelectSchema(adminActivityLog);
export type AdminLog = z.infer<typeof selectAdminLogSchema>;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;

export const insertAdminSettingsSchema = createInsertSchema(adminSettings);
export const selectAdminSettingsSchema = createSelectSchema(adminSettings);
export type AdminSetting = z.infer<typeof selectAdminSettingsSchema>;

export const insertUserSuspensionSchema = createInsertSchema(userSuspensions);
export const selectUserSuspensionSchema = createSelectSchema(userSuspensions);
export type UserSuspension = z.infer<typeof selectUserSuspensionSchema>;
export type InsertUserSuspension = z.infer<typeof insertUserSuspensionSchema>;
