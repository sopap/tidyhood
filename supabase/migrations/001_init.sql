-- Tidyhood Initial Schema Migration
-- Creates core tables for laundry and home cleaning service platform

-- Use Supabase auth.users for identities; create app tables

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'partner', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Addresses table
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL DEFAULT 'New York',
  zip TEXT NOT NULL,
  buzzer TEXT,
  notes TEXT,
  geojson JSONB,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partners table (laundromats and cleaners)
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('LAUNDRY', 'CLEANING')),
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  payout_percent NUMERIC DEFAULT 0.6,
  max_orders_per_slot INT DEFAULT 5,
  max_minutes_per_slot INT DEFAULT 480,
  scorecard_json JSONB DEFAULT '{}'::JSONB,
  coi_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Capacity calendar for partner availability
CREATE TABLE capacity_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('LAUNDRY', 'CLEANING')),
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  max_units INT NOT NULL,
  reserved_units INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, service_type, slot_start)
);

-- Buildings (for potential revenue sharing)
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  address TEXT,
  contact TEXT,
  mrr_share_pct NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Building residents
CREATE TABLE building_residents (
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (building_id, user_id)
);

-- Pricing rules
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL CHECK (service_type IN ('LAUNDRY', 'CLEANING')),
  geozone TEXT,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('PER_LB', 'FLAT', 'ADDON', 'MULTIPLIER', 'DELIVERY')),
  unit_key TEXT NOT NULL,
  unit_price_cents INT DEFAULT 0,
  multiplier NUMERIC DEFAULT 1.0,
  priority INT DEFAULT 100,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('LAUNDRY', 'CLEANING')),
  partner_id UUID REFERENCES partners(id) ON DELETE SET NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'PAID', 'RECEIVED', 'IN_PROGRESS', 'READY', 
    'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELED', 'REFUNDED'
  )),
  subtotal_cents INT NOT NULL DEFAULT 0,
  tax_cents INT NOT NULL DEFAULT 0,
  delivery_cents INT NOT NULL DEFAULT 0,
  total_cents INT NOT NULL DEFAULT 0,
  credit_cents INT DEFAULT 0,
  payment_id TEXT,
  payment_method TEXT,
  idempotency_key TEXT UNIQUE,
  source_channel TEXT DEFAULT 'WEB',
  late_minutes INT DEFAULT 0,
  cancellation_code TEXT,
  order_details JSONB DEFAULT '{}'::JSONB,
  address_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order events (audit trail)
CREATE TABLE order_events (
  id BIGSERIAL PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  actor UUID,
  actor_role TEXT,
  event_type TEXT NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW(),
  payload_json JSONB DEFAULT '{}'::JSONB
);

-- Bags (for laundry orders)
CREATE TABLE bags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  label_code TEXT UNIQUE NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('LAUNDRY', 'CLEANING')),
  weight_lbs NUMERIC,
  photos_json JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cleaning checklists
CREATE TABLE cleaning_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  room TEXT NOT NULL,
  tasks_json JSONB DEFAULT '[]'::JSONB,
  before_photos_json JSONB DEFAULT '[]'::JSONB,
  after_photos_json JSONB DEFAULT '[]'::JSONB,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claims (lost, damaged, rework)
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  bag_id UUID REFERENCES bags(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('LOST', 'DAMAGED', 'REWORK', 'OTHER')),
  description TEXT,
  requested_cents INT,
  resolution TEXT,
  resolved_cents INT DEFAULT 0,
  evidence_json JSONB DEFAULT '[]'::JSONB,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DENIED', 'RESOLVED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Payouts
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_cents INT DEFAULT 0,
  adjustments_cents INT DEFAULT 0,
  net_cents INT DEFAULT 0,
  status TEXT DEFAULT 'DUE' CHECK (status IN ('DUE', 'PAID', 'CANCELED')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('LAUNDRY', 'CLEANING')),
  cadence TEXT NOT NULL CHECK (cadence IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY')),
  discount_pct NUMERIC DEFAULT 0.15,
  next_date DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE UNIQUE,
  tax_breakdown_json JSONB DEFAULT '{}'::JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_partner_id ON orders(partner_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_events_order_id ON order_events(order_id);
CREATE INDEX idx_order_events_ts ON order_events(ts);
CREATE INDEX idx_capacity_calendar_partner ON capacity_calendar(partner_id, slot_start);
CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_bags_order_id ON bags(order_id);
CREATE INDEX idx_cleaning_checklist_order_id ON cleaning_checklist(order_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
