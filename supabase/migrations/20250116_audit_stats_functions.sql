-- Funzione per statistiche per categoria
CREATE OR REPLACE FUNCTION get_audit_stats_by_category(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  category TEXT,
  total_count BIGINT,
  success_count BIGINT,
  failure_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    action_category as category,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE status = 'success') as success_count,
    COUNT(*) FILTER (WHERE status = 'failure') as failure_count
  FROM audit_logs
  WHERE created_at BETWEEN start_date AND end_date
  GROUP BY action_category
  ORDER BY total_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funzione per statistiche per giorno
CREATE OR REPLACE FUNCTION get_audit_stats_by_day(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  day DATE,
  total_count BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(created_at) as day,
    COUNT(*) as total_count,
    COUNT(DISTINCT user_id) as unique_users
  FROM audit_logs
  WHERE created_at BETWEEN start_date AND end_date
  GROUP BY DATE(created_at)
  ORDER BY day DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
