-- Migration 019: Ensure default store & all products table columns exist safely (brand, is_preorder, preorder_days, store_id, etc.)

-- 1. Ensure default store with id=1 exists
INSERT INTO stores (id, name, slug, status)
VALUES (1, 'Sarah Bakery', 'sarah-bakery', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 2. Add missing columns safely
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS preorder_days INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 100;
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight NUMERIC(10,2) DEFAULT 500;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_count INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Auto-fill any NULL store_id with 1
UPDATE products SET store_id = 1 WHERE store_id IS NULL;
