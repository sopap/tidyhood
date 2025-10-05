-- Add new cleaning add-ons for enhanced UI
-- Aligns database with lib/cleaningAddons.ts

-- Add move-out cleaning multiplier (75% more than standard)
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, multiplier, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'MULTIPLIER', 'CLN_MOVEOUT_MULTI', 1.75, 85, true)
ON CONFLICT (service_type, geozone, unit_key) DO UPDATE
SET multiplier = 1.75, priority = 85, active = true;

-- Add new cleaning addons (core category)
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_LAUNDRY_PICKUP', 3000, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_PET_HAIR', 2500, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_INSIDE_CABINETS', 2500, 200, true)
ON CONFLICT (service_type, geozone, unit_key) DO UPDATE
SET unit_price_cents = EXCLUDED.unit_price_cents, priority = EXCLUDED.priority, active = true;

-- Add premium addons
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_SANITIZATION', 5000, 200, true)
ON CONFLICT (service_type, geozone, unit_key) DO UPDATE
SET unit_price_cents = 5000, priority = 200, active = true;

-- Add move-out specific addons
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_FRIDGE_OVEN_BUNDLE', 4000, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_WALL_WIPE', 2000, 200, true)
ON CONFLICT (service_type, geozone, unit_key) DO UPDATE
SET unit_price_cents = EXCLUDED.unit_price_cents, priority = EXCLUDED.priority, active = true;

-- Update windows pricing to match frontend ($30 instead of $35)
UPDATE pricing_rules 
SET unit_price_cents = 3000 
WHERE service_type = 'CLEANING' 
  AND unit_key = 'CLN_WINDOWS_INSIDE'
  AND geozone = '10026,10027,10030';

-- Note: CLN_JUNK_QUOTE and CLN_ECO_PRODUCTS are marked as "TBD" in frontend
-- They will be handled dynamically in pricing logic without fixed DB entries
