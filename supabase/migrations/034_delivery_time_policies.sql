-- Delivery time policy configuration
-- Allows admin to configure timing rules for earliest delivery slot selection

CREATE TABLE IF NOT EXISTS delivery_time_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type TEXT NOT NULL CHECK (service_type IN ('LAUNDRY', 'CLEANING')),
  
  -- Standard service timing
  standard_minimum_hours INTEGER NOT NULL DEFAULT 48,
  
  -- Rush/same-day service timing
  rush_enabled BOOLEAN NOT NULL DEFAULT true,
  rush_early_pickup_hours INTEGER NOT NULL DEFAULT 0,  -- If pickup ends before cutoff
  rush_late_pickup_hours INTEGER NOT NULL DEFAULT 24,  -- If pickup ends after cutoff
  rush_cutoff_hour INTEGER NOT NULL DEFAULT 11,        -- Hour in NY timezone (0-23)
  
  -- Same-day delivery restrictions
  same_day_earliest_hour INTEGER NOT NULL DEFAULT 18,  -- 6 PM in NY timezone
  
  -- Metadata
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT,
  change_reason TEXT,
  
  CONSTRAINT one_active_policy_per_service UNIQUE(service_type, active)
);

-- Audit/history table
CREATE TABLE IF NOT EXISTS delivery_time_policy_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id UUID REFERENCES delivery_time_policies(id),
  service_type TEXT NOT NULL,
  standard_minimum_hours INTEGER,
  rush_enabled BOOLEAN,
  rush_early_pickup_hours INTEGER,
  rush_late_pickup_hours INTEGER,
  rush_cutoff_hour INTEGER,
  same_day_earliest_hour INTEGER,
  change_reason TEXT,
  changed_by TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to log changes
CREATE OR REPLACE FUNCTION log_delivery_policy_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO delivery_time_policy_history (
    policy_id, service_type, standard_minimum_hours,
    rush_enabled, rush_early_pickup_hours, rush_late_pickup_hours,
    rush_cutoff_hour, same_day_earliest_hour,
    change_reason, changed_by
  )
  VALUES (
    NEW.id, NEW.service_type, NEW.standard_minimum_hours,
    NEW.rush_enabled, NEW.rush_early_pickup_hours, NEW.rush_late_pickup_hours,
    NEW.rush_cutoff_hour, NEW.same_day_earliest_hour,
    NEW.change_reason, NEW.updated_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_policy_changes
  AFTER UPDATE ON delivery_time_policies
  FOR EACH ROW
  EXECUTE FUNCTION log_delivery_policy_change();

-- Insert default values matching current hardcoded logic
INSERT INTO delivery_time_policies (
  service_type, 
  standard_minimum_hours,
  rush_enabled,
  rush_early_pickup_hours,
  rush_late_pickup_hours,
  rush_cutoff_hour,
  same_day_earliest_hour,
  notes
) VALUES 
(
  'LAUNDRY',
  48,
  true,
  0,
  24,
  11,
  18,
  'Default policy - matches original hardcoded values'
),
(
  'CLEANING',
  48,
  true,
  0,
  24,
  11,
  18,
  'Default policy - matches original hardcoded values'
);

-- Enable RLS
ALTER TABLE delivery_time_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_time_policy_history ENABLE ROW LEVEL SECURITY;

-- Admin-only access to policies
CREATE POLICY "Admin full access to delivery policies"
  ON delivery_time_policies FOR ALL
  USING (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admin read delivery policy history"
  ON delivery_time_policy_history FOR SELECT
  USING (auth.jwt()->>'role' = 'admin');

-- Create indexes for performance
CREATE INDEX idx_delivery_policies_service_type ON delivery_time_policies(service_type, active);
CREATE INDEX idx_delivery_policy_history_policy_id ON delivery_time_policy_history(policy_id);
