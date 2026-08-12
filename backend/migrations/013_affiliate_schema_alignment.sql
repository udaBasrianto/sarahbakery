-- 013_affiliate_schema_alignment.sql
-- Add missing columns to affiliate tables used by AdminAffiliatesPage

-- affiliate_commissions: add store_id
ALTER TABLE affiliate_commissions ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE DEFAULT 1;
UPDATE affiliate_commissions SET store_id = 1 WHERE store_id IS NULL;

-- affiliate_withdrawals: add store_id, processed_at
ALTER TABLE affiliate_withdrawals ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE affiliate_withdrawals ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;
UPDATE affiliate_withdrawals SET store_id = 1 WHERE store_id IS NULL;

-- affiliate_settings: add point_value, min_withdraw_points, is_active, terms
ALTER TABLE affiliate_settings ADD COLUMN IF NOT EXISTS point_value NUMERIC(10,2) NOT NULL DEFAULT 100;
ALTER TABLE affiliate_settings ADD COLUMN IF NOT EXISTS min_withdraw_points INTEGER NOT NULL DEFAULT 100;
ALTER TABLE affiliate_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE affiliate_settings ADD COLUMN IF NOT EXISTS terms TEXT;

-- Rename min_withdrawal to keep backward compat (if exists)
-- Already has: commission_rate, min_withdrawal, is_enabled
