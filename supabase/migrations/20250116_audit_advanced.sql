-- Funzione per pulizia log vecchi
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log dell'operazione di pulizia
  INSERT INTO audit_logs (
    action_type, action_category, action_description, metadata, status
  ) VALUES (
    'retention_cleanup', 'system',
    'Pulizia automatica log vecchi',
    jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days),
    'success'
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabella Security Alerts
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  message TEXT NOT NULL,
  data JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Indici Security Alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);

-- RLS Security Alerts
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security alerts" ON security_alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update security alerts" ON security_alerts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Funzione per eseguire check di sicurezza dinamici
CREATE OR REPLACE FUNCTION execute_security_check(query_text TEXT, threshold_value INTEGER)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Esegue la query dinamica e ritorna i risultati come JSON
  -- NOTA: Questa funzione è POTENZIALMENTE PERICOLOSA se non sanitizzata.
  -- In un ambiente reale, limitare l'uso o usare viste predefinite.
  -- Qui assumiamo che sia chiamata solo dal backend trusted.
  
  EXECUTE 'SELECT json_agg(t) FROM (' || query_text || ') t' INTO result USING threshold_value;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
