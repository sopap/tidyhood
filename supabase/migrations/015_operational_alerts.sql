-- Operational Alerts Migration
-- Purpose: System-generated alerts for operations team (quote delays, SLA breaches, capacity issues)
-- Date: January 2025

CREATE TABLE operational_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_operational_alerts_active ON operational_alerts(created_at DESC) WHERE dismissed_at IS NULL;
CREATE INDEX idx_operational_alerts_severity ON operational_alerts(severity) WHERE dismissed_at IS NULL;
CREATE INDEX idx_operational_alerts_type ON operational_alerts(alert_type);
CREATE INDEX idx_operational_alerts_entity ON operational_alerts(entity_type, entity_id);

-- Enable RLS
ALTER TABLE operational_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "operational_alerts_admin_all" ON operational_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Helper function to create alerts
CREATE OR REPLACE FUNCTION create_operational_alert(
  p_alert_type TEXT,
  p_severity TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO operational_alerts (
    alert_type,
    severity,
    entity_type,
    entity_id,
    message,
    metadata
  ) VALUES (
    p_alert_type,
    p_severity,
    p_entity_type,
    p_entity_id,
    p_message,
    p_metadata
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE operational_alerts IS 'System-generated alerts for quote delays, SLA breaches, capacity issues, partner availability, etc. Displayed in admin dashboard.';
COMMENT ON COLUMN operational_alerts.alert_type IS 'Type: quote_pending, quote_expired, sla_breach_imminent, sla_breach, no_partner_available, capacity_low, partner_inactive, etc.';
COMMENT ON COLUMN operational_alerts.severity IS 'Severity level: low (info), medium (warning), high (action needed), critical (immediate attention)';
COMMENT ON COLUMN operational_alerts.metadata IS 'Additional context (order details, partner info, timing, etc.)';
COMMENT ON FUNCTION create_operational_alert IS 'Helper function to create alerts from triggers or background jobs';
