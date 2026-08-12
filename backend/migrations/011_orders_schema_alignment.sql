-- 011_orders_schema_alignment.sql
-- Add missing columns to orders table required by AdminDashboard, AdminOrdersPage & AdminReportsPage

ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dp_status TEXT DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10,2) DEFAULT 0;

-- Backfill total_amount from total if total > 0
UPDATE orders SET total_amount = total WHERE (total_amount IS NULL OR total_amount = 0) AND total > 0;

-- Ensure super_admins has default admin user (id=1)
INSERT INTO super_admins (user_id) VALUES (1) ON CONFLICT (user_id) DO NOTHING;
