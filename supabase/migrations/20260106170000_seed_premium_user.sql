
INSERT INTO user_subscriptions (user_id, tier, status)
VALUES ('dev-user-123', 'premium', 'active')
ON CONFLICT (user_id) DO UPDATE SET tier = 'premium';
