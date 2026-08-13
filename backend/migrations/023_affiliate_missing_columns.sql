-- Migration 023: Add missing columns to affiliate_commissions and affiliates
-- Fix: affiliate_commissions needs commission_amount, order_amount, points
-- Fix: affiliates needs total_referrals column

ALTER TABLE affiliate_commissions
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_amount NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Backfill commission_amount from amount if exists
UPDATE affiliate_commissions SET commission_amount = amount WHERE commission_amount = 0 AND amount > 0;

-- Add total_referrals to affiliates
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS total_referrals INTEGER NOT NULL DEFAULT 0;

-- Add total_earnings to affiliates if missing
ALTER TABLE affiliates
  ADD COLUMN IF NOT EXISTS total_earnings NUMERIC(10,2) NOT NULL DEFAULT 0;
