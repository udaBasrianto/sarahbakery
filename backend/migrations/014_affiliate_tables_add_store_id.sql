-- Add store_id column to affiliate_commissions and affiliate_withdrawals
-- to support admin filtering by store

ALTER TABLE affiliate_commissions 
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE affiliate_withdrawals 
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE;

-- Backfill store_id from affiliates table for existing rows
UPDATE affiliate_commissions ac
SET store_id = a.store_id
FROM affiliates a
WHERE ac.affiliate_id = a.id
  AND ac.store_id IS NULL;

UPDATE affiliate_withdrawals aw
SET store_id = a.store_id
FROM affiliates a
WHERE aw.affiliate_id = a.id
  AND aw.store_id IS NULL;

-- Index for fast lookups by store_id
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_store_id ON affiliate_commissions(store_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_withdrawals_store_id ON affiliate_withdrawals(store_id);
