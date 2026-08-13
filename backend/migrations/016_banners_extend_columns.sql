-- Migration 016: Add missing columns and relax constraints on banners table
ALTER TABLE banners 
  ADD COLUMN IF NOT EXISTS background_color TEXT,
  ADD COLUMN IF NOT EXISTS text_color TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT;

ALTER TABLE banners ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE banners ALTER COLUMN title DROP NOT NULL;

