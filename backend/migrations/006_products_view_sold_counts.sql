-- 006_products_view_sold_counts.sql
-- Add view_count and sold_count columns for product cards display.
-- Seed realistic random values for existing products (based on id pattern).

ALTER TABLE products ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sold_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_view_count ON products(view_count);
CREATE INDEX IF NOT EXISTS idx_products_sold_count ON products(sold_count);

-- Seed realistic random values once (deterministic by id so views >= sold and never flip)
UPDATE products
SET
  view_count  = CASE WHEN view_count  = 0 THEN GREATEST(15,    CAST((ABS(HASHTEXT(CAST(id AS TEXT) || ':v')) % 9000) + 120 AS INTEGER)) ELSE view_count  END,
  sold_count  = CASE WHEN sold_count  = 0 THEN GREATEST(3,     CAST((ABS(HASHTEXT(CAST(id AS TEXT) || ':s')) % 600)  + 5   AS INTEGER)) ELSE sold_count  END
WHERE view_count = 0 OR sold_count = 0;

-- Safety: ensure sold_count never exceeds view_count (shouldn't happen with the ranges, but guarantee it)
UPDATE products SET sold_count = LEAST(sold_count, view_count) WHERE sold_count > view_count;
