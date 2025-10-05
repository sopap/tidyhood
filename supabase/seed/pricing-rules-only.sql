-- Pricing Rules Only
-- Run this if you already have partners in your database

-- LAUNDRY PRICING RULES
-- Base per-pound pricing (wash + fold)
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('LAUNDRY', '10026,10027,10030', 'PER_LB', 'LND_WF_PERLB', 175, 100, true),
  ('LAUNDRY', '10026,10027,10030', 'PER_LB', 'LND_WF_MIN_LBS', 1500, 95, true); -- Minimum 15 lbs at $15

-- Laundry addons
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('LAUNDRY', '10026,10027,10030', 'ADDON', 'LND_RUSH_24HR', 1000, 200, true),
  ('LAUNDRY', '10026,10027,10030', 'ADDON', 'LND_BULKY_ITEM', 800, 200, true),
  ('LAUNDRY', '10026,10027,10030', 'ADDON', 'LND_DELICATE', 500, 200, true),
  ('LAUNDRY', '10026,10027,10030', 'ADDON', 'LND_EXTRA_SOFTENER', 300, 200, true);

-- Delivery fees for laundry
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('LAUNDRY', '10026,10027,10030', 'DELIVERY', 'LND_DELIVERY_BASE', 599, 150, true);

-- CLEANING PRICING RULES
-- Flat rates by apartment size (standard clean)
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'FLAT', 'CLN_STD_STUDIO', 8900, 100, true),
  ('CLEANING', '10026,10027,10030', 'FLAT', 'CLN_STD_1BR', 11900, 100, true),
  ('CLEANING', '10026,10027,10030', 'FLAT', 'CLN_STD_2BR', 14900, 100, true),
  ('CLEANING', '10026,10027,10030', 'FLAT', 'CLN_STD_3BR', 17900, 100, true),
  ('CLEANING', '10026,10027,10030', 'FLAT', 'CLN_STD_4BR', 21900, 100, true);

-- Deep cleaning multiplier
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, multiplier, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'MULTIPLIER', 'CLN_DEEP_MULTI', 1.5, 90, true);

-- Move-out cleaning multiplier
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, multiplier, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'MULTIPLIER', 'CLN_MOVEOUT_MULTI', 1.75, 85, true);

-- Cleaning addons (core - always available)
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_LAUNDRY_PICKUP', 3000, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_PET_HAIR', 2500, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_INSIDE_CABINETS', 2500, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_WINDOWS_INSIDE', 3000, 200, true);

-- Premium addons
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_SANITIZATION', 5000, 200, true);

-- Move-out specific addons
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_FRIDGE_OVEN_BUNDLE', 4000, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_WALL_WIPE', 2000, 200, true);

-- Legacy addons (kept for backwards compatibility)
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_FRIDGE_INSIDE', 2500, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_OVEN_INSIDE', 2500, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_EXTRA_BATHROOM', 1500, 200, true);

-- Cleaning delivery/service fee (included in base price, but tracked separately)
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'DELIVERY', 'CLN_SERVICE_FEE', 0, 150, true);
