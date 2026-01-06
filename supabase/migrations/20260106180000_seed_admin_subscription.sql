
-- Inserisci/aggiorna subscription admin
INSERT INTO user_subscriptions (user_id, tier, status, sintesi_limite, sintesi_usate)
VALUES ('admin-user-123', 'premium', 'active', NULL, 0)
ON CONFLICT (user_id)
DO UPDATE SET
  tier = 'premium',
  status = 'active',
  sintesi_limite = NULL,
  updated_at = NOW();
