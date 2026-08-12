-- ============================================================
-- 009: Categories table alignment (store_id + updated_at + constraints)
--      + FK products.category_id -> categories.id safety
-- ============================================================

-- 1. Tambah store_id FK ke categories
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='store_id') THEN
    ALTER TABLE categories ADD COLUMN store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Tambah updated_at timestamp auto
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='updated_at') THEN
    ALTER TABLE categories ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. Backfill existing categories store_id=1 (Sarah Bakery)
UPDATE categories SET store_id = 1 WHERE store_id IS NULL;

-- 4. NOT NULL kan store_id setelah backfill
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categories' AND column_name='store_id' AND is_nullable='YES') THEN
    ALTER TABLE categories ALTER COLUMN store_id SET NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. Unique (store_id, name) agar per toko tidak ada nama kategori dobel
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_store_id_name_key'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_store_id_name_key UNIQUE (store_id, name);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. Unique (store_id, slug) agar URL slug per toko unik
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_store_id_slug_key'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_store_id_slug_key UNIQUE (store_id, slug);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7. Index categories (store_id, is_active) untuk query list cepat
CREATE INDEX IF NOT EXISTS idx_categories_store_active ON categories (store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories (store_id, sort_order);

-- 8. FK Constraint: products.category_id -> categories(id) ON DELETE SET NULL
--    (Cek DULU apakah constraint ada, karena migration 003 ADD COLUMN tapi tidak ADD CONSTRAINT FK langsung)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'products'
      AND kcu.column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 9. Trigger auto-updated_at untuk categories
CREATE OR REPLACE FUNCTION set_updated_at_categories()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_categories();
