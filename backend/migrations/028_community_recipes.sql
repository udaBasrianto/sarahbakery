-- Migration 028: Community Recipes, Likes, Bookmarks & Comments
CREATE TABLE IF NOT EXISTS community_recipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  user_avatar TEXT,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  category VARCHAR(100) DEFAULT 'Bolu & Cake',
  prep_time_minutes INTEGER DEFAULT 30,
  cook_time_minutes INTEGER DEFAULT 45,
  servings VARCHAR(50) DEFAULT '6-8 potong',
  difficulty VARCHAR(50) DEFAULT 'Mudah',
  ingredients TEXT NOT NULL DEFAULT '[]',
  steps TEXT NOT NULL DEFAULT '[]',
  tips TEXT,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_curated_by_admin BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_comments (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES community_recipes(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  user_avatar TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_likes (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES community_recipes(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_id, user_id)
);

CREATE TABLE IF NOT EXISTS recipe_bookmarks (
  id SERIAL PRIMARY KEY,
  recipe_id INTEGER REFERENCES community_recipes(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(recipe_id, user_id)
);

-- Seed initial curated community recipes
INSERT INTO community_recipes (
  user_id, user_name, user_avatar, title, slug, description, cover_image, category,
  prep_time_minutes, cook_time_minutes, servings, difficulty, ingredients, steps, tips,
  likes_count, views_count, is_curated_by_admin, is_published, created_at
) VALUES 
(
  1,
  'Chef Sarah',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
  'Bolu Pandan Santan Kukus Super Lembut & Wangi',
  'bolu-pandan-santan-kukus-super-lembut',
  'Resep legendaris bolu pandan kukus dengan santan kental dan endapan pandan asli. Teksturnya sangat lembut, empuk, dan aroma pandannya memikat seluruh ruangan.',
  'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800',
  'Bolu & Cake',
  25,
  40,
  '12 potong',
  'Mudah',
  '[{"amount":"4","unit":"butir","name":"Telur Ayam (suhu ruang)"},{"amount":"150","unit":"gram","name":"Gula Pasir"},{"amount":"1","unit":"sdt","name":"SP / Emulsifier"},{"amount":"200","unit":"gram","name":"Tepung Terigu Protein Sedang"},{"amount":"65","unit":"ml","name":"Santan Instan Kental"},{"amount":"100","unit":"ml","name":"Minyak Goreng Berkualitas"},{"amount":"2","unit":"sdm","name":"Jus / Pasta Pandan Asli"}]',
  '[{"step_number":1,"instruction":"Kocok telur, gula pasir, dan SP dengan mixer kecepatan tinggi hingga mengembang kental, putih, dan berjejak (sekitar 8-10 menit)."},{"step_number":2,"instruction":"Turunkan mixer ke kecepatan paling rendah, masukkan tepung terigu yang sudah diayak secara bertahap. Aduk perlahan hingga rata."},{"step_number":3,"instruction":"Campurkan santan, minyak goreng, dan pasta pandan dalam wadah kecil, lalu tuang ke dalam adonan. Aduk balik menggunakan spatula hingga benar-benar homogen dan tidak ada minyak mengendap di dasar."},{"step_number":4,"instruction":"Tuang adonan ke loyang tulban diameter 20 cm yang sudah diolesi margarin tipis. Hentakkan loyang perlahan 2-3 kali untuk membuang gelembung udara."},{"step_number":5,"instruction":"Kukus dalam dandang yang sudah beruap banyak selama 35-40 menit dengan api sedang. Tutup kukusan dialasi serbet bersih. Tes tusuk dengan lidi untuk memastikan kematangan."}]',
  'Gunakan telur suhu ruang agar adonan cepat mengembang kental. Jangan buka tutup kukusan sebelum 30 menit agar bolu tidak kempes.',
  38,
  245,
  TRUE,
  TRUE,
  NOW() - INTERVAL '3 days'
),
(
  1,
  'Bunda Rina Baking',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'Fudgy Brownies Panggang Shiny Crust Anti Gagal',
  'fudgy-brownies-panggang-shiny-crust',
  'Brownies coklat leleh dengan tekstur dalam yang fudgy chewy serta lapisan atas berkilau renyah (shiny crust). Wajib dicoba bagi pecinta dark chocolate!',
  'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800',
  'Cookies & Brownies',
  20,
  35,
  '16 potong',
  'Mudah',
  '[{"amount":"200","unit":"gram","name":"Dark Cooking Chocolate (DCC)"},{"amount":"75","unit":"gram","name":"Butter / Mentega"},{"amount":"50","unit":"ml","name":"Minyak Goreng"},{"amount":"2","unit":"butir","name":"Telur Ayam"},{"amount":"150","unit":"gram","name":"Gula Pasir Butir Halus"},{"amount":"120","unit":"gram","name":"Tepung Terigu Protein Sedang"},{"amount":"35","unit":"gram","name":"Coklat Bubuk Berkualitas"}]',
  '[{"step_number":1,"instruction":"Lelehkan DCC, butter, dan minyak goreng dengan cara ditim di atas air panas. Aduk hingga larut sempurna dan biarkan agak hangat."},{"step_number":2,"instruction":"Kocok telur dan gula pasir halus menggunakan whisk balon hingga gula benar-benar larut (kunci utama lapisan shiny crust keluar)."},{"step_number":3,"instruction":"Masukkan coklat leleh yang masih hangat ke dalam kocokan telur, aduk rata dengan spatula."},{"step_number":4,"instruction":"Ayak tepung terigu dan coklat bubuk, masukkan ke dalam adonan, aduk perlahan hingga adonan menjadi berat dan mengkilap."},{"step_number":5,"instruction":"Tuang ke loyang sekat 20x20 cm yang dialasi baking paper. Panggang di oven suhu 175°C selama 30-35 menit."}]',
  'Pastikan gula pasir benar-benar larut saat dikocok bersama telur agar shiny crust terbentuk sempurna.',
  52,
  410,
  TRUE,
  TRUE,
  NOW() - INTERVAL '2 days'
),
(
  1,
  'Dapur Ibu Dian',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  'Roti Sobek Lembut Kismis 1x Proofing Cepat',
  'roti-sobek-lembut-kismis-1x-proofing',
  'Teknik membuat roti sobek berserat halus dan super lembut hanya dengan 1 kali proofing. Cocok untuk sarapan keluarga di akhir pekan.',
  'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800',
  'Roti & Donat',
  30,
  25,
  '9 roti',
  'Sedang',
  '[{"amount":"250","unit":"gram","name":"Tepung Terigu Protein Tinggi (Cakra)"},{"amount":"45","unit":"gram","name":"Gula Pasir"},{"amount":"4","unit":"gram","name":"Ragi Instan (Fermipan)"},{"amount":"1","unit":"butir","name":"Kuning Telur"},{"amount":"130","unit":"ml","name":"Susu Cair Dingin"},{"amount":"35","unit":"gram","name":"Butter / Margarin"},{"amount":"3","unit":"gram","name":"Garam"},{"amount":"50","unit":"gram","name":"Kismis Manis (opsional)"}]',
  '[{"step_number":1,"instruction":"Campur tepung, gula, ragi instan, kuning telur, dan susu cair dingin. Uleni hingga setengah kalis."},{"step_number":2,"instruction":"Tambahkan butter dan garam, uleni terus hingga kalis elastis (window pane test). Masukkan kismis di menit terakhir."},{"step_number":3,"instruction":"Bagi adonan menjadi 9 bagian sama rata, bulatkan mulus (rounding), lalu susun rapat di loyang persegi 20x20 cm."},{"step_number":4,"instruction":"Tutup loyang dengan kain lembab, diamkan (proofing) selama 45-60 menit hingga mengembang 2x lipat."},{"step_number":5,"instruction":"Olesi permukaan atas dengan susu cair, lalu panggang dalam oven suhu 180°C selama 20-25 menit hingga keemasan. Olesi butter saat baru matang."}]',
  'Gunakan susu cair dingin dari kulkas agar ragi tidak bekerja terlalu cepat saat adonan diuleni.',
  41,
  320,
  TRUE,
  TRUE,
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (slug) DO NOTHING;
