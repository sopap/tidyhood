-- Tidyhood Seed Data
-- Sample partners and pricing rules for Harlem launch

-- Insert sample Harlem laundromats
INSERT INTO partners (id, name, service_type, contact_email, contact_phone, address, payout_percent, max_orders_per_slot, active)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Harlem Fresh Laundromat', 'LAUNDRY', 'contact@harlemfresh.com', '+12125551001', '2280 Frederick Douglass Blvd, New York, NY 10027', 0.65, 8, true),
  ('22222222-2222-2222-2222-222222222222', 'Lenox Wash & Fold', 'LAUNDRY', 'info@lenoxwash.com', '+12125551002', '275 Lenox Ave, New York, NY 10027', 0.60, 6, true);

-- Insert sample Harlem cleaning service
INSERT INTO partners (id, name, service_type, contact_email, contact_phone, address, payout_percent, max_minutes_per_slot, active)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'Uptown Sparkle Cleaning', 'CLEANING', 'hello@uptownsparkle.com', '+12125551003', '2110 Adam Clayton Powell Jr Blvd, New York, NY 10027', 0.70, 480, true);

-- Insert capacity calendar for next 7 days (9 AM - 7 PM slots)
DO $$
DECLARE
  partner_rec RECORD;
  slot_date DATE;
  slot_hour INT;
  slot_time TIMESTAMPTZ;
BEGIN
  -- For each partner
  FOR partner_rec IN SELECT id, service_type, max_orders_per_slot, max_minutes_per_slot FROM partners LOOP
    -- For next 7 days
    FOR i IN 0..6 LOOP
      slot_date := CURRENT_DATE + i;
      
      -- For hours 9-19 (9 AM - 7 PM)
      FOR slot_hour IN 9..18 LOOP
        slot_time := (slot_date || ' ' || slot_hour || ':00:00')::TIMESTAMPTZ;
        
        INSERT INTO capacity_calendar (partner_id, service_type, slot_start, slot_end, max_units, reserved_units)
        VALUES (
          partner_rec.id,
          partner_rec.service_type,
          slot_time,
          slot_time + INTERVAL '2 hours',
          CASE 
            WHEN partner_rec.service_type = 'LAUNDRY' THEN partner_rec.max_orders_per_slot
            WHEN partner_rec.service_type = 'CLEANING' THEN partner_rec.max_minutes_per_slot
          END,
          0
        );
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

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

-- Cleaning addons
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_FRIDGE_INSIDE', 2500, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_OVEN_INSIDE', 2500, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_WINDOWS_INSIDE', 3500, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_LAUNDRY_WASH', 2000, 200, true),
  ('CLEANING', '10026,10027,10030', 'ADDON', 'CLN_EXTRA_BATHROOM', 1500, 200, true);

-- Cleaning delivery/service fee (included in base price, but tracked separately)
INSERT INTO pricing_rules (service_type, geozone, unit_type, unit_key, unit_price_cents, priority, active)
VALUES 
  ('CLEANING', '10026,10027,10030', 'DELIVERY', 'CLN_SERVICE_FEE', 0, 150, true);

-- Note: To create an admin user, after signing up via Supabase Auth, run:
-- UPDATE profiles SET role = 'admin' WHERE id = 'your-user-id-here';
-- Or match by email:
-- UPDATE profiles SET role = 'admin' WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@example.com');
