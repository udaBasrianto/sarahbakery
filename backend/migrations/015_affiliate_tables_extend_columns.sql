-- Migration 015: Add missing columns to affiliate tables
-- Extends affiliate_withdrawals with payment details and tracking fields
ALTER TABLE affiliate_withdrawals
  ADD COLUMN IF NOT EXISTS points NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_account TEXT,
  ADD COLUMN IF NOT EXISTS payment_name TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Extend affiliates with payment info and points balance
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS total_points NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS payment_account TEXT,
  ADD COLUMN IF NOT EXISTS payment_name TEXT;
