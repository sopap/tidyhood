-- Capacity Calendar Migration
-- Purpose: Individual time slots for partners (actual availability)
-- Date: January 2025

CREATE TABLE capacity_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('LAUNDRY', 'CLEANING')),
  slot_start TIMESTAMPTZ NOT NULL,
  slot_end TIMESTAMPTZ NOT NULL,
  max_units INT NOT NULL CHECK (max_units > 0),
  reserved_units INT DEFAULT 0 CHECK (reserved_units >= 0 AND reserved_units <= max_units),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes TEXT,
  CONSTRAINT valid_time_range CHECK (slot_end > slot_start)
);

-- Indexes for performance
CREATE INDEX idx_capacity_calendar_partner ON capacity_calendar(partner_id);
CREATE INDEX idx_capacity_calendar_start ON capacity_calendar(slot_start);
CREATE INDEX idx_capacity_calendar_service ON capacity_calendar(service_type);
CREATE INDEX idx_capacity_calendar_partner_time ON capacity_calendar(partner_id, slot_start);

-- Prevent overlapping slots for same partner
CREATE UNIQUE INDEX idx_capacity_calendar_no_overlap ON capacity_calendar(
  partner_id, 
  service_type,
  slot_start
);

-- Enable RLS
ALTER TABLE capacity_calendar ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "capacity_calendar_admin_all" ON capacity_calendar
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Partners can view their own slots
CREATE POLICY "capacity_calendar_partner_select" ON capacity_calendar
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM partners WHERE contact_email IN (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Public can view available slots (for booking)
CREATE POLICY "capacity_calendar_public_available" ON capacity_calendar
  FOR SELECT USING (
    reserved_units < max_units 
    AND slot_start > NOW()
  );

-- Add updated_at trigger
CREATE TRIGGER update_capacity_calendar_updated_at 
  BEFORE UPDATE ON capacity_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function to check for slot conflicts
CREATE OR REPLACE FUNCTION check_capacity_conflict(
  p_partner_id UUID,
  p_slot_start TIMESTAMPTZ,
  p_slot_end TIMESTAMPTZ,
  p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM capacity_calendar
    WHERE partner_id = p_partner_id
    AND id != COALESCE(p_exclude_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      (slot_start <= p_slot_start AND slot_end > p_slot_start) OR
      (slot_start < p_slot_end AND slot_end >= p_slot_end) OR
      (slot_start >= p_slot_start AND slot_end <= p_slot_end)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE capacity_calendar IS 'Individual time slots for partners. Generated from templates or created manually.';
COMMENT ON COLUMN capacity_calendar.max_units IS 'Max orders (laundry) or max minutes (cleaning) for this slot';
COMMENT ON COLUMN capacity_calendar.reserved_units IS 'Currently booked orders/minutes';
COMMENT ON FUNCTION check_capacity_conflict IS 'Returns true if there is a time overlap for the given partner';
