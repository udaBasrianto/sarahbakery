-- ============================================================
-- 004: Fix missing `icon` column in categories + populate
-- ============================================================

ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon TEXT;

UPDATE categories SET icon = CASE name
  WHEN 'Roti Manis'     THEN '🥐'
  WHEN 'Kue Basah'      THEN '🍰'
  WHEN 'Kue Kering'     THEN '🍪'
  WHEN 'Roti Tawar'     THEN '🍞'
  WHEN 'Kue Ulang Tahun' THEN '🎂'
  WHEN 'Pastry'         THEN '🥮'
  WHEN 'Minuman'        THEN '🥤'
  ELSE icon
END
WHERE icon IS NULL;
