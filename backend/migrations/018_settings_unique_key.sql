-- Migration 018: Add unique constraint on settings.key and seed home_products_limit
ALTER TABLE settings ADD CONSTRAINT unique_settings_key UNIQUE (key);

INSERT INTO settings (key, value)
VALUES ('home_products_limit', '10')
ON CONFLICT (key) DO NOTHING;
