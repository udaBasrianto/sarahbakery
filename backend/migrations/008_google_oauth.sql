-- 008_google_oauth.sql
-- Add column to track Google OAuth users
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Seed default empty settings entries (admin akan isi di UI settings)
INSERT INTO settings (store_id, key, value)
VALUES
  (1, 'google_oauth_client_id', ''),
  (1, 'google_oauth_client_secret', '')
ON CONFLICT DO NOTHING;
