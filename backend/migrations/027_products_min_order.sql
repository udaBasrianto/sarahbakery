-- Migration 027: Add min_order column to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS min_order INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_products_min_order ON products(min_order);
