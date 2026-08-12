-- 007_stores_owner_status_columns.sql
-- Add missing columns to stores table referenced by DashboardPage L54:
--   apiClient.from("stores").select("id").eq("owner_id", uid).eq("status", "approved").maybeSingle()
-- Also used by AdminAffiliates, banners, settings FK map to stores.store_id.

ALTER TABLE stores ADD COLUMN IF NOT EXISTS owner_id INTEGER;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_status ON stores(status);

DO $$
BEGIN
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fk_stores_owner_id_users'
  ) THEN
      ALTER TABLE stores ADD CONSTRAINT fk_stores_owner_id_users
          FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Seed default admin user if user id=1 does not exist
INSERT INTO users (id, email, password_hash, full_name, phone)
VALUES (1, 'admin@sarahbakery.com', '$2b$12$Cm7IF9dhcjV1g.ElQ3FOsufwlKFUUplGUqaWc8RoO9cwoEu8fYJru', 'Admin Sarah Bakery', '08123456789')
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;


-- Seed: assign existing store (id=1) to super admin user id=1 (admin@sarahbakery.com) if owner_id is null.
UPDATE stores SET owner_id = 1 WHERE owner_id IS NULL AND id = 1 AND EXISTS (SELECT 1 FROM users WHERE id = 1);

