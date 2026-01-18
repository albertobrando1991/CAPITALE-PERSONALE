-- Create RBAC tables for Admin functionality

-- user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  assigned_by VARCHAR,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- role_permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission VARCHAR(100) NOT NULL,
  UNIQUE(role, permission)
);

-- admin_activity_log table
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id VARCHAR NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by VARCHAR,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- user_suspensions table
CREATE TABLE IF NOT EXISTS user_suspensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  reason TEXT NOT NULL,
  suspended_by VARCHAR NOT NULL,
  suspended_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert default owner as admin
INSERT INTO user_roles (user_id, role, assigned_by)
VALUES ('admin-user-123', 'super_admin', 'system')
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';

-- Insert default permissions for super_admin
INSERT INTO role_permissions (role, permission) VALUES
  ('super_admin', 'view_users'),
  ('super_admin', 'edit_users'),
  ('super_admin', 'delete_users'),
  ('super_admin', 'manage_roles'),
  ('super_admin', 'view_content'),
  ('super_admin', 'create_content'),
  ('super_admin', 'edit_content'),
  ('super_admin', 'delete_content'),
  ('super_admin', 'publish_content'),
  ('super_admin', 'view_subscriptions'),
  ('super_admin', 'manage_subscriptions'),
  ('super_admin', 'view_analytics'),
  ('super_admin', 'manage_settings')
ON CONFLICT DO NOTHING;

-- Insert permissions for admin
INSERT INTO role_permissions (role, permission) VALUES
  ('admin', 'view_users'),
  ('admin', 'edit_users'),
  ('admin', 'manage_roles'),
  ('admin', 'view_content'),
  ('admin', 'create_content'),
  ('admin', 'edit_content'),
  ('admin', 'delete_content'),
  ('admin', 'publish_content'),
  ('admin', 'view_subscriptions'),
  ('admin', 'manage_subscriptions'),
  ('admin', 'view_analytics')
ON CONFLICT DO NOTHING;

-- Insert permissions for staff
INSERT INTO role_permissions (role, permission) VALUES
  ('staff', 'view_users'),
  ('staff', 'view_content'),
  ('staff', 'create_content'),
  ('staff', 'edit_content'),
  ('staff', 'view_subscriptions'),
  ('staff', 'view_analytics')
ON CONFLICT DO NOTHING;
