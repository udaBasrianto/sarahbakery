-- ============================================================
-- 003: Complete Products Schema + Categories + Reviews + Seed
-- ============================================================

-- ----------------------------------------------------------
-- 1. Clean slate: drop dependent tables first
-- ----------------------------------------------------------
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ----------------------------------------------------------
-- 2. CATEGORIES table (fresh create)
-- ----------------------------------------------------------
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ----------------------------------------------------------
-- 3. Add missing columns to PRODUCTS table (idempotent)
-- ----------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='slug') THEN
    ALTER TABLE products ADD COLUMN slug TEXT;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='category_id') THEN
    ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_url') THEN
    ALTER TABLE products ADD COLUMN image_url TEXT;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_available') THEN
    ALTER TABLE products ADD COLUMN is_available BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_preorder') THEN
    ALTER TABLE products ADD COLUMN is_preorder BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='preorder_days') THEN
    ALTER TABLE products ADD COLUMN preorder_days INTEGER NOT NULL DEFAULT 0;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_products_available;
DROP INDEX IF EXISTS idx_products_slug;
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_available ON products (is_available);
CREATE INDEX idx_products_slug ON products (slug);

-- ----------------------------------------------------------
-- 4. REVIEWS table (fresh create)
-- ----------------------------------------------------------
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reviews_product ON reviews (product_id);
CREATE INDEX idx_reviews_user ON reviews (user_id);

-- ----------------------------------------------------------
-- 5. SEED: Categories
-- ----------------------------------------------------------
INSERT INTO categories (id, name, slug, description, sort_order, is_active) VALUES
(1, 'Roti Manis', 'roti-manis', 'Roti manis lembut dengan berbagai isian', 1, TRUE),
(2, 'Kue Basah', 'kue-basah', 'Kue basah tradisional dan modern', 2, TRUE),
(3, 'Kue Kering', 'kue-kering', 'Kue kering premium untuk cemilan', 3, TRUE),
(4, 'Roti Tawar', 'roti-tawar', 'Roti tawar lembut segar setiap hari', 4, TRUE),
(5, 'Kue Ulang Tahun', 'kue-ulang-tahun', 'Kue ulang tahun custom tema bebas', 5, TRUE),
(6, 'Pastry', 'pastry', 'Pastry goreng & panggang renyah', 6, TRUE);

-- Reset sequences
SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM categories));

-- ----------------------------------------------------------
-- 6. SEED: Products (upsert — overwrite if exists)
-- ----------------------------------------------------------
INSERT INTO products (id, name, slug, description, price, category_id, is_available, is_preorder, preorder_days, image_url) VALUES
(1, 'Roti Cokelat Keju', 'roti-cokelat-keju', 'Roti manis lembut dengan isian cokelat dan keju mozzarella', 18000, 1, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1509365465982-25d11c17e812?w=800'),
(2, 'Roti Sosis Solo', 'roti-sosis-solo', 'Roti bulat dengan isian sosis sapi dan mayonaise', 16000, 1, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800'),
(3, 'Roti Bakar Klasik', 'roti-bakar-klasik', 'Roti tawar bakar dengan mentega dan selai kacang', 12000, 4, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=800'),
(4, 'Klepon Ubi Ungu', 'klepon-ubi-ungu', 'Klepon ubi ungu dengan isian gula merah cair', 15000, 2, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1515467837915-11c1b0a5b4b6?w=800'),
(5, 'Lapis Legit Premium', 'lapis-legit-premium', 'Kue lapis legit dengan 30 lapis dan rempah spekkoek', 85000, 2, TRUE, TRUE, 2, 'https://images.unsplash.com/photo-1550617931-e17a7b70dce2?w=800'),
(6, 'Nastar Wisman', 'nastar-wisman', 'Kue kering nastar dengan isian selai nanas asli dan Wisman butter', 65000, 3, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800'),
(7, 'Putri Salju Keju', 'putri-salju-keju', 'Kue kering putri salju dengan taburan keju edam', 55000, 3, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800'),
(8, 'Roti Tawar Gandum', 'roti-tawar-gandum', 'Roti tawar gandum utuh sehat dan lembut', 22000, 4, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800'),
(9, 'Kue Ulang Tahun Chocolate Cake', 'kue-ultah-chocolate-cake', 'Kue ulang tahun cokelat dengan frosting cokelat dan taburan choco chip', 250000, 5, TRUE, TRUE, 3, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800'),
(10, 'Kue Ulang Tahun Red Velvet', 'kue-ultah-red-velvet', 'Kue red velvet dengan cream cheese frosting untuk 10 porsi', 280000, 5, TRUE, TRUE, 3, 'https://images.unsplash.com/photo-1586985289688-ca3cf47d93c7?w=800'),
(11, 'Croissant Butter', 'croissant-butter', 'Croissant mentega Prancis berlapis renyah', 20000, 6, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800'),
(12, 'Danish Pastry Strawberry', 'danish-pastry-strawberry', 'Danish pastry dengan isian selai stroberi dan topping krim', 22000, 6, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=800'),
(13, 'Roti Tawar Susu', 'roti-tawar-susu', 'Roti tawar susu lembut dengan aroma susu vanilla', 25000, 4, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=800'),
(14, 'Bolu Pandan Santan', 'bolu-pandan-santan', 'Kue bolu pandan wangi dengan santan kelapa asli', 45000, 2, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800'),
(15, 'Castangel Keju', 'castangel-keju', 'Kue kering castangel dengan keju cheddar melimpah', 70000, 3, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?w=800'),
(16, 'Roti Kari Ayam', 'roti-kari-ayam', 'Pastry dengan isian kari ayam kental dan kentang', 21000, 6, TRUE, FALSE, 0, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  category_id = EXCLUDED.category_id,
  is_available = EXCLUDED.is_available,
  is_preorder = EXCLUDED.is_preorder,
  preorder_days = EXCLUDED.preorder_days,
  image_url = EXCLUDED.image_url;

SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM products));

-- ----------------------------------------------------------
-- 7. SEED: Reviews (dummy ratings)
-- ----------------------------------------------------------
INSERT INTO reviews (product_id, user_id, rating, comment, created_at) VALUES
(1, NULL, 5, 'Roti cokelatnya lumer banget, kejunya banyak!', NOW() - INTERVAL '2 days'),
(1, NULL, 4, 'Rasanya enak, cuma isiannya dikit', NOW() - INTERVAL '5 days'),
(1, NULL, 5, 'Favorite anak saya, beli 3 langsung abis', NOW() - INTERVAL '1 week'),
(2, NULL, 4, 'Sosisnya gurih, rotinya lembut', NOW() - INTERVAL '3 days'),
(2, NULL, 5, 'Recommended untuk sarapan praktis', NOW() - INTERVAL '6 days'),
(3, NULL, 4, 'Roti bakarannya pas, selainya enak', NOW() - INTERVAL '1 day'),
(4, NULL, 5, 'Kleponnya manis pas, kenyal kenyal enak', NOW() - INTERVAL '4 days'),
(5, NULL, 5, 'Lapis legitnya wangi banget, rempahnya pas', NOW() - INTERVAL '1 week'),
(5, NULL, 4, 'Teksturnya lembut, rasanya otentik', NOW() - INTERVAL '2 weeks'),
(6, NULL, 5, 'Nastarnya lumer di mulut, selai nanasnya asli', NOW() - INTERVAL '3 days'),
(7, NULL, 4, 'Kejunya terasa banget, gurih', NOW() - INTERVAL '5 days'),
(8, NULL, 5, 'Roti gandumnya sehat, enak buat diet', NOW() - INTERVAL '2 days'),
(9, NULL, 5, 'Ulang tahun adik pakai ini, semua suka!', NOW() - INTERVAL '1 week'),
(9, NULL, 5, 'Coklatnya pekat, frostingnya tidak terlalu manis', NOW() - INTERVAL '1 month'),
(10, NULL, 5, 'Red velvetnya moist, cream cheese nya enak', NOW() - INTERVAL '2 weeks'),
(11, NULL, 4, 'Croissantnya renyah, menteganya wangi', NOW() - INTERVAL '3 days'),
(12, NULL, 5, 'Danish stroberi ini favorit saya, beli tiap minggu', NOW() - INTERVAL '4 days'),
(13, NULL, 4, 'Roti tawar susunya lembut, tahan 3 hari', NOW() - INTERVAL '6 days'),
(14, NULL, 5, 'Bolu pandan wangi banget, empuk', NOW() - INTERVAL '1 week'),
(15, NULL, 4, 'Castangel kejunya gurih, cocok buat lebaran', NOW() - INTERVAL '2 weeks'),
(16, NULL, 5, 'Roti kari ayamnya isian banyak, bumbu pas', NOW() - INTERVAL '2 days');

SELECT setval('reviews_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM reviews));
