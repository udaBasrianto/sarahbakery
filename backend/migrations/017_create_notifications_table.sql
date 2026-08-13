-- Migration 017: Create notifications table and seed initial live notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'info',
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (is_read);

-- Seed initial live notifications
INSERT INTO notifications (title, description, type, link_url, is_read, created_at) VALUES
('Diskon 30% Roti Manis Fresh', 'Nikmati potongan harga 30% untuk semua varian roti manis fresh daily hari ini!', 'promo', '/products', FALSE, NOW()),
('Pesan Custom Birthday Cake', 'Terima pesanan kue ulang tahun bertingkat & custom tema bebas dengan bahan premium.', 'info', '/custom-order', FALSE, NOW() - INTERVAL '2 hours'),
('Gratis Ongkir Seluruh Kota', 'Bebas ongkos kirim untuk pengiriman wilayah kota dengan transaksi min Rp 150.000.', 'promo', '/products', FALSE, NOW() - INTERVAL '1 day'),
('Program Afiliasi Sarah Bakery', 'Dapatkan komisi hingga 5% untuk setiap pembeli yang menggunakan kode referensi Anda!', 'system', '/affiliate', FALSE, NOW() - INTERVAL '2 days');
