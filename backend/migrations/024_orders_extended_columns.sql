-- Migration 024: Add preorder and custom order fields to orders table, make user_id nullable for guest checkout
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'regular',
  ADD COLUMN IF NOT EXISTS preorder_date DATE,
  ADD COLUMN IF NOT EXISTS dp_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dp_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS custom_details TEXT,
  ADD COLUMN IF NOT EXISTS custom_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_preorder_date ON orders(preorder_date);
