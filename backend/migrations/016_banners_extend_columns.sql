-- Migration 016: Add missing columns to banners table
ALTER TABLE banners 
  ADD COLUMN IF NOT EXISTS background_color TEXT,
  ADD COLUMN IF NOT EXISTS text_color TEXT,
  ADD COLUMN IF NOT EXISTS icon TEXT;
