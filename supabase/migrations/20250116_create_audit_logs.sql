CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Chi ha eseguito l'azione
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT, -- Denormalizzato per query veloci e storico
  user_role TEXT, -- Ruolo al momento dell'azione
  
  -- Tipo di azione
  action_type TEXT NOT NULL, -- es: 'login', 'create', 'update', 'delete'
  action_category TEXT NOT NULL, -- es: 'auth', 'users', 'content', 'subscriptions', 'admin', 'ai'
  action_description TEXT, -- Descrizione human-readable
  
  -- Entità coinvolta
  entity_type TEXT, -- es: 'user', 'concorso', 'quiz', 'subscription'
  entity_id UUID,
  entity_name TEXT, -- Nome/titolo denormalizzato per riferimento
  
  -- Valori prima/dopo (per tracciare modifiche)
  old_value JSONB,
  new_value JSONB,
  
  -- Informazioni di contesto
  ip_address INET,
  user_agent TEXT,
  request_path TEXT,
  request_method TEXT,
  
  -- Metadata aggiuntivi
  metadata JSONB DEFAULT '{}', -- Dati extra specifici per tipo azione
  
  -- Risultato dell'azione
  status TEXT DEFAULT 'success', -- 'success', 'failure', 'warning'
  error_message TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commento sulla tabella
COMMENT ON TABLE audit_logs IS 'Sistema di audit log completo per tracciare tutte le azioni nel sistema';

-- Indici per Query Veloci
-- Indice principale per ricerche temporali
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Indici per filtri comuni
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_action_category ON audit_logs(action_category);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);

-- Indice composto per query frequenti
CREATE INDEX idx_audit_logs_category_created ON audit_logs(action_category, created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- Indice per ricerca full-text su descrizione
CREATE INDEX idx_audit_logs_description_gin ON audit_logs USING gin(to_tsvector('italian', action_description));

-- Indice GIN per ricerche su metadata JSONB
CREATE INDEX idx_audit_logs_metadata_gin ON audit_logs USING gin(metadata);

-- Row Level Security (RLS)
-- Abilita RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Solo admin e super_admin possono leggere i log
CREATE POLICY "Admin can view audit logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Policy: Super admin vede TUTTO, admin vede tutto tranne azioni di altri admin
-- Note: Simplified logic based on provided SQL but using user_roles table for role check instead of 'users' table if 'users' table doesn't have role column directly linked to auth.uid() in the way Supabase auth works or if we rely on our user_roles table.
-- The user provided SQL uses "FROM users WHERE users.id = auth.uid() AND users.role ...".
-- In my system, roles are in `user_roles`. I will adapt the SQL to use `user_roles`.

CREATE POLICY "Super admin sees all, admin sees limited" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
      )
      AND (
        user_role IS NULL
        OR user_role NOT IN ('admin', 'super_admin')
      )
    )
  );

-- Policy: Nessuno può modificare o eliminare i log (immutabili)
CREATE POLICY "No one can modify audit logs" ON audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "No one can delete audit logs" ON audit_logs
  FOR DELETE
  USING (false);

-- Policy: Solo il sistema può inserire (tramite service role)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true);
