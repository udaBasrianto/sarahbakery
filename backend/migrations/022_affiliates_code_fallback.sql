-- Migration 022: Ensure code and referral_code columns in affiliates table and handle default code generation
ALTER TABLE affiliates ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE affiliates ALTER COLUMN code DROP NOT NULL;

-- Create function to automatically synchronize and generate code / referral_code
CREATE OR REPLACE FUNCTION sync_affiliate_code()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.code IS NULL OR NEW.code = '') AND (NEW.referral_code IS NOT NULL AND NEW.referral_code != '') THEN
    NEW.code := NEW.referral_code;
  END IF;

  IF (NEW.referral_code IS NULL OR NEW.referral_code = '') AND (NEW.code IS NOT NULL AND NEW.code != '') THEN
    NEW.referral_code := NEW.code;
  END IF;

  IF (NEW.code IS NULL OR NEW.code = '') AND (NEW.referral_code IS NULL OR NEW.referral_code = '') THEN
    NEW.code := 'AFF' || LPAD(COALESCE(NEW.user_id, 0)::text, 4, '0') || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4));
    NEW.referral_code := NEW.code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_affiliate_code ON affiliates;
CREATE TRIGGER trg_sync_affiliate_code
BEFORE INSERT OR UPDATE ON affiliates
FOR EACH ROW
EXECUTE FUNCTION sync_affiliate_code();

-- Backfill existing rows if any
UPDATE affiliates 
SET referral_code = code 
WHERE (referral_code IS NULL OR referral_code = '') AND code IS NOT NULL;

UPDATE affiliates 
SET code = referral_code 
WHERE (code IS NULL OR code = '') AND referral_code IS NOT NULL;
