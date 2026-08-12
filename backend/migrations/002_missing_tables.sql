-- stores
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Sarah Bakery',
  description TEXT,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default store
INSERT INTO stores (id, name, description, phone, email)
VALUES (1, 'Sarah Bakery', 'Bakery homemade terbaik dengan cinta', '08123456789', 'hello@sarahbakery.com')
ON CONFLICT (id) DO NOTHING;

-- settings / store_settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, key)
);

-- profiles (user profiles extended)
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  address TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  referred_by INTEGER REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- banners / hero banners
CREATE TABLE IF NOT EXISTS banners (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert 3 dummy banners
INSERT INTO banners (store_id, title, subtitle, image_url, link_url, sort_order, is_active) VALUES
(1, 'Kue Spesial Untukmu', 'Dibuat dengan cinta, dikirim dengan senyum', 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200', '/products', 1, TRUE),
(1, 'Promo Akhir Pekan', 'Diskon 15% untuk semua kue ulang tahun', 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=1200', '/products', 2, TRUE),
(1, 'Pre-Order Kue Custom', 'Pesan sekarang, siap dalam 3 hari', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200', '/products', 3, TRUE)
ON CONFLICT DO NOTHING;

-- affiliates
CREATE TABLE IF NOT EXISTS affiliates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  total_earnings NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- affiliate_commissions
CREATE TABLE IF NOT EXISTS affiliate_commissions (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- affiliate_withdrawals
CREATE TABLE IF NOT EXISTS affiliate_withdrawals (
  id SERIAL PRIMARY KEY,
  affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- affiliate_settings
CREATE TABLE IF NOT EXISTS affiliate_settings (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  min_withdrawal NUMERIC(10,2) NOT NULL DEFAULT 50000,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default affiliate settings
INSERT INTO affiliate_settings (store_id, commission_rate, min_withdrawal, is_enabled)
VALUES (1, 10.00, 50000, TRUE)
ON CONFLICT DO NOTHING;

-- referrals
CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id INTEGER REFERENCES profiles(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  reward_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- point_transactions
CREATE TABLE IF NOT EXISTS point_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- super_admins
CREATE TABLE IF NOT EXISTS super_admins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- images (general storage table)
CREATE TABLE IF NOT EXISTS images (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL,
  folder TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_banners_store ON banners(store_id);
CREATE INDEX IF NOT EXISTS idx_affiliates_store ON affiliates(store_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
