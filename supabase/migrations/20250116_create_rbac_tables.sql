-- ============================================= 
-- TABELLA: user_roles (ruoli utente) 
-- ============================================= 
CREATE TABLE IF NOT EXISTS user_roles ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, 
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'staff', 'user')), 
  assigned_by UUID REFERENCES auth.users(id), 
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 
  UNIQUE(user_id) 
); 

-- ============================================= 
-- TABELLA: role_permissions (permessi per ruolo) 
-- ============================================= 
CREATE TABLE IF NOT EXISTS role_permissions ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  role VARCHAR(50) NOT NULL, 
  permission VARCHAR(100) NOT NULL, 
  UNIQUE(role, permission) 
); 

-- ============================================= 
-- TABELLA: admin_activity_log (log attività admin) 
-- ============================================= 
CREATE TABLE IF NOT EXISTS admin_activity_log ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  admin_id UUID NOT NULL REFERENCES auth.users(id), 
  action VARCHAR(100) NOT NULL, 
  entity_type VARCHAR(50), -- 'user', 'content', 'subscription', etc. 
  entity_id UUID, 
  details JSONB, 
  ip_address INET, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() 
); 

-- ============================================= 
-- TABELLA: admin_settings (impostazioni sistema) 
-- ============================================= 
CREATE TABLE IF NOT EXISTS admin_settings ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  key VARCHAR(100) UNIQUE NOT NULL, 
  value JSONB NOT NULL, 
  description TEXT, 
  updated_by UUID REFERENCES auth.users(id), 
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() 
); 

-- ============================================= 
-- TABELLA: user_suspensions (sospensioni utenti) 
-- ============================================= 
CREATE TABLE IF NOT EXISTS user_suspensions ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, 
  reason TEXT NOT NULL, 
  suspended_by UUID NOT NULL REFERENCES auth.users(id), 
  suspended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), 
  expires_at TIMESTAMP WITH TIME ZONE, 
  is_active BOOLEAN DEFAULT true 
); 

-- ============================================= 
-- INDICI per performance 
-- ============================================= 
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id); 
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role); 
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin_id ON admin_activity_log(admin_id); 
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created_at ON admin_activity_log(created_at DESC); 
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON user_suspensions(user_id); 

-- ============================================= 
-- RLS POLICIES (Row Level Security) 
-- ============================================= 

-- Abilita RLS 
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY; 
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY; 
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY; 
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY; 
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY; 

-- Funzione helper per verificare ruolo admin 
CREATE OR REPLACE FUNCTION is_admin_or_staff() 
RETURNS BOOLEAN AS $$ 
BEGIN 
  RETURN EXISTS ( 
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin', 'staff') 
  ); 
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- Funzione helper per verificare super_admin 
CREATE OR REPLACE FUNCTION is_super_admin() 
RETURNS BOOLEAN AS $$ 
BEGIN 
  RETURN EXISTS ( 
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin' 
  ); 
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER; 

-- Policy: user_roles 
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
CREATE POLICY "Admins can view all roles" ON user_roles 
  FOR SELECT USING (is_admin_or_staff()); 
  
DROP POLICY IF EXISTS "Super admin can manage roles" ON user_roles;
CREATE POLICY "Super admin can manage roles" ON user_roles 
  FOR ALL USING (is_super_admin()); 

-- Policy: admin_activity_log 
DROP POLICY IF EXISTS "Admins can view activity log" ON admin_activity_log;
CREATE POLICY "Admins can view activity log" ON admin_activity_log 
  FOR SELECT USING (is_admin_or_staff()); 
  
DROP POLICY IF EXISTS "Admins can insert activity log" ON admin_activity_log;
CREATE POLICY "Admins can insert activity log" ON admin_activity_log 
  FOR INSERT WITH CHECK (is_admin_or_staff()); 

-- Policy: admin_settings 
DROP POLICY IF EXISTS "Admins can view settings" ON admin_settings;
CREATE POLICY "Admins can view settings" ON admin_settings 
  FOR SELECT USING (is_admin_or_staff()); 
  
DROP POLICY IF EXISTS "Super admin can manage settings" ON admin_settings;
CREATE POLICY "Super admin can manage settings" ON admin_settings 
  FOR ALL USING (is_super_admin()); 

-- Policy: user_suspensions 
DROP POLICY IF EXISTS "Admins can manage suspensions" ON user_suspensions;
CREATE POLICY "Admins can manage suspensions" ON user_suspensions 
  FOR ALL USING (is_admin_or_staff());

-- =============================================
-- SEEDING INIZIALE (Permessi Base)
-- =============================================

-- Inserimento permessi per Admin
INSERT INTO role_permissions (role, permission) VALUES
  ('super_admin', 'view_users'), ('super_admin', 'edit_users'), ('super_admin', 'delete_users'), ('super_admin', 'manage_roles'),
  ('super_admin', 'view_content'), ('super_admin', 'create_content'), ('super_admin', 'edit_content'), ('super_admin', 'delete_content'), ('super_admin', 'publish_content'),
  ('super_admin', 'view_subscriptions'), ('super_admin', 'manage_subscriptions'),
  ('super_admin', 'view_analytics'), ('super_admin', 'manage_settings'),
  
  ('admin', 'view_users'), ('admin', 'edit_users'),
  ('admin', 'view_content'), ('admin', 'create_content'), ('admin', 'edit_content'), ('admin', 'delete_content'), ('admin', 'publish_content'),
  ('admin', 'view_subscriptions'),
  ('admin', 'view_analytics'),
  
  ('staff', 'view_users'),
  ('staff', 'view_content'), ('staff', 'create_content'), ('staff', 'edit_content'),
  ('staff', 'view_analytics')
ON CONFLICT (role, permission) DO NOTHING;
