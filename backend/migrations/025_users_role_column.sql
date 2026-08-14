-- Migration 025: Add role column to users table and synchronize with super_admins
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Set role = 'admin' for existing super_admins or id=1
UPDATE users 
SET role = 'admin' 
WHERE id IN (SELECT user_id FROM super_admins) OR id = 1;

-- Ensure super_admins table exists with correct constraint
CREATE TABLE IF NOT EXISTS super_admins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure default admin (id=1) is in super_admins
INSERT INTO super_admins (user_id) 
SELECT 1 WHERE EXISTS (SELECT 1 FROM users WHERE id = 1)
ON CONFLICT (user_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id);
