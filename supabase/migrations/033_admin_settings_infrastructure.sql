-- Admin Settings Infrastructure
-- Adds support for dynamic pricing and cancellation policy management

-- ============================================================================
-- 1. UPDATE EXISTING PRICING_RULES TABLE
-- ============================================================================

-- Add audit fields to pricing_rules if not present
ALTER TABLE pricing_rules 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS change_reason TEXT;

-- Add safety constraints (using DO block for IF NOT EXISTS logic)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_price_non_negative'
  ) THEN
    ALTER TABLE pricing_rules 
      ADD CONSTRAINT pricing_rules_price_non_negative 
        CHECK (unit_price_cents >= 0 OR unit_price_cents IS NULL);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pricing_rules_multiplier_reasonable'
  ) THEN
    ALTER TABLE pricing_rules 
      ADD CONSTRAINT pricing_rules_multiplier_reasonable 
        CHECK (multiplier > 0 AND multiplier <= 10 OR multiplier IS NULL);
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_pricing_rules_updated_at ON pricing_rules(updated_at DESC);

-- ============================================================================
-- 2. CREATE CANCELLATION_POLICIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type TEXT NOT NULL CHECK (service_type IN ('LAUNDRY', 'CLEANING')),
  notice_hours INTEGER NOT NULL DEFAULT 24 
    CHECK (notice_hours >= 0 AND notice_hours <= 168),
  cancellation_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 0.15 
    CHECK (cancellation_fee_percent >= 0 AND cancellation_fee_percent <= 0.50),
  reschedule_notice_hours INTEGER NOT NULL DEFAULT 24 
    CHECK (reschedule_notice_hours >= 0 AND reschedule_notice_hours <= 168),
  reschedule_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 0 
    CHECK (reschedule_fee_percent >= 0 AND reschedule_fee_percent <= 0.50),
  allow_cancellation BOOLEAN NOT NULL DEFAULT true,
  allow_rescheduling BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  effective_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  notes TEXT,
  CONSTRAINT unique_active_policy_per_service UNIQUE(service_type, active)
);

-- Indexes for performance
CREATE INDEX idx_cancellation_policies_service_active 
  ON cancellation_policies(service_type, active) 
  WHERE active = true;

CREATE INDEX idx_cancellation_policies_updated_at 
  ON cancellation_policies(updated_at DESC);

-- ============================================================================
-- 3. CREATE SETTINGS_AUDIT_LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'TOGGLE')),
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_reason TEXT,
  ip_address INET,
  user_agent TEXT
);

-- Indexes for audit queries
CREATE INDEX idx_settings_audit_table_record 
  ON settings_audit_log(table_name, record_id);

CREATE INDEX idx_settings_audit_user 
  ON settings_audit_log(changed_by);

CREATE INDEX idx_settings_audit_time 
  ON settings_audit_log(changed_at DESC);

CREATE INDEX idx_settings_audit_table_time 
  ON settings_audit_log(table_name, changed_at DESC);

-- ============================================================================
-- 4. SEED DEFAULT CANCELLATION POLICIES
-- ============================================================================

-- Insert default policies for LAUNDRY (free cancellation)
INSERT INTO cancellation_policies (
  service_type,
  notice_hours,
  cancellation_fee_percent,
  reschedule_notice_hours,
  reschedule_fee_percent,
  allow_cancellation,
  allow_rescheduling,
  active,
  notes
) VALUES (
  'LAUNDRY',
  0, -- No notice required
  0, -- No fee
  0, -- No notice required for reschedule
  0, -- No reschedule fee
  true,
  true,
  true,
  'Default laundry policy: Free cancellation and rescheduling anytime before pickup'
) ON CONFLICT (service_type, active) WHERE active = true DO NOTHING;

-- Insert default policies for CLEANING (24hr notice, 15% fee)
INSERT INTO cancellation_policies (
  service_type,
  notice_hours,
  cancellation_fee_percent,
  reschedule_notice_hours,
  reschedule_fee_percent,
  allow_cancellation,
  allow_rescheduling,
  active,
  notes
) VALUES (
  'CLEANING',
  24, -- 24 hour notice
  0.15, -- 15% fee if within 24 hours
  24, -- 24 hour notice for reschedule
  0, -- Free reschedule with notice
  true,
  true,
  true,
  'Default cleaning policy: Free rescheduling with 24+ hours notice. 15% cancellation fee if within 24 hours.'
) ON CONFLICT (service_type, active) WHERE active = true DO NOTHING;

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_audit_log ENABLE ROW LEVEL SECURITY;

-- Cancellation Policies: Public read for active policies, admin-only write
CREATE POLICY "cancellation_policies_read_active" 
  ON cancellation_policies
  FOR SELECT 
  USING (active = true);

CREATE POLICY "cancellation_policies_admin_all" 
  ON cancellation_policies
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Settings Audit Log: Admin-only read, system can insert
CREATE POLICY "settings_audit_log_admin_read" 
  ON settings_audit_log
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "settings_audit_log_system_insert" 
  ON settings_audit_log
  FOR INSERT 
  WITH CHECK (true); -- System can always insert audit logs

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to get active cancellation policy for a service type
CREATE OR REPLACE FUNCTION get_active_cancellation_policy(p_service_type TEXT)
RETURNS cancellation_policies
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  policy cancellation_policies;
BEGIN
  SELECT * INTO policy
  FROM cancellation_policies
  WHERE service_type = p_service_type
    AND active = true
  LIMIT 1;
  
  RETURN policy;
END;
$$;

-- Function to log settings changes (called from application layer)
CREATE OR REPLACE FUNCTION log_settings_change(
  p_table_name TEXT,
  p_record_id UUID,
  p_action TEXT,
  p_field_name TEXT,
  p_old_value TEXT,
  p_new_value TEXT,
  p_changed_by UUID,
  p_change_reason TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO settings_audit_log (
    table_name,
    record_id,
    action,
    field_name,
    old_value,
    new_value,
    changed_by,
    change_reason,
    ip_address,
    user_agent
  ) VALUES (
    p_table_name,
    p_record_id,
    p_action,
    p_field_name,
    p_old_value,
    p_new_value,
    p_changed_by,
    p_change_reason,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- ============================================================================
-- 7. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Update updated_at on pricing_rules changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pricing_rules_updated_at ON pricing_rules;
CREATE TRIGGER update_pricing_rules_updated_at
  BEFORE UPDATE ON pricing_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cancellation_policies_updated_at ON cancellation_policies;
CREATE TRIGGER update_cancellation_policies_updated_at
  BEFORE UPDATE ON cancellation_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries (comment out in production)
-- SELECT COUNT(*) as pricing_rules_count FROM pricing_rules;
-- SELECT COUNT(*) as policies_count FROM cancellation_policies;
-- SELECT * FROM cancellation_policies WHERE active = true;
