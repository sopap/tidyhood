-- Capacity Templates Migration
-- Purpose: Recurring availability patterns for partners (e.g., every Monday 10-12)
-- Date: January 2025

CREATE TABLE capacity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  slot_start TIME NOT NULL,
  slot_end TIME NOT NULL,
  max_units INT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('LAUNDRY', 'CLEANING')),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_capacity_templates_partner ON capacity_templates(partner_id);
CREATE INDEX idx_capacity_templates_day ON capacity_templates(day_of_week) WHERE active = true;
CREATE INDEX idx_capacity_templates_active ON capacity_templates(active);

-- Enable RLS
ALTER TABLE capacity_templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "capacity_templates_admin_all" ON capacity_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Partners can view their own templates
CREATE POLICY "capacity_templates_partner_select" ON capacity_templates
  FOR SELECT USING (
    partner_id IN (
      SELECT id FROM partners WHERE contact_email IN (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_capacity_templates_updated_at 
  BEFORE UPDATE ON capacity_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE capacity_templates IS 'Recurring availability patterns for partners (e.g., every Monday 10-12). Used to bulk-create capacity_calendar entries.';
COMMENT ON COLUMN capacity_templates.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';
COMMENT ON COLUMN capacity_templates.max_units IS 'Max orders (laundry) or max minutes (cleaning) per slot';
