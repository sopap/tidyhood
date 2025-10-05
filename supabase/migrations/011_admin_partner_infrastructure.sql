-- Admin & Partner Infrastructure Migration
-- Creates tables for notifications, audit logs, and admin notes
-- Date: January 5, 2025

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('SMS', 'EMAIL')),
  recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_phone TEXT,
  recipient_email TEXT,
  template_key TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error TEXT,
  provider_id TEXT, -- Twilio SID or SendGrid ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_sent ON notifications(sent_at);
CREATE INDEX idx_notifications_template ON notifications(template_key);

-- 2. Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- 3. Admin notes table (for order annotations)
CREATE TABLE IF NOT EXISTS admin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_notes_order ON admin_notes(order_id);
CREATE INDEX idx_admin_notes_author ON admin_notes(author_id);

-- 4. Add quote_expires_at to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_expires_at TIMESTAMPTZ;

-- 5. Add service_areas to partners table (simple string array)
ALTER TABLE partners ADD COLUMN IF NOT EXISTS service_areas TEXT[] DEFAULT ARRAY['10026', '10027', '10030'];

-- 6. Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for notifications
-- Users can view their own notifications
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT USING (recipient_id = auth.uid());

-- Admins can view all notifications
CREATE POLICY "notifications_admin_all" ON notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert notifications (service role)
CREATE POLICY "notifications_insert_system" ON notifications
  FOR INSERT WITH CHECK (true);

-- 8. RLS Policies for audit_logs
-- Admins can view all audit logs
CREATE POLICY "audit_logs_admin_select" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert audit logs (service role)
CREATE POLICY "audit_logs_insert_system" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- 9. RLS Policies for admin_notes
-- Admins can manage admin notes
CREATE POLICY "admin_notes_admin_all" ON admin_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Partners can view notes on their orders
CREATE POLICY "admin_notes_partner_select" ON admin_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN orders o ON o.partner_id IN (
        SELECT id FROM partners 
        WHERE contact_email = p.email
      )
      WHERE p.id = auth.uid() 
      AND p.role = 'partner'
      AND o.id = admin_notes.order_id
    )
  );

-- 10. Create helper function for audit logging
CREATE OR REPLACE FUNCTION log_audit(
  p_actor_id UUID,
  p_actor_role TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_changes JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  log_id BIGINT;
BEGIN
  INSERT INTO audit_logs (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    changes,
    ip_address,
    user_agent
  ) VALUES (
    p_actor_id,
    p_actor_role,
    p_action,
    p_entity_type,
    p_entity_id,
    p_changes,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id::TEXT::UUID;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create helper function to check if user is partner
CREATE OR REPLACE FUNCTION is_partner(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'partner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Add comment for documentation
COMMENT ON TABLE notifications IS 'SMS and email notifications sent to users, partners, and admins';
COMMENT ON TABLE audit_logs IS 'Audit trail for all admin and partner actions';
COMMENT ON TABLE admin_notes IS 'Internal notes that admins can add to orders';
COMMENT ON FUNCTION log_audit IS 'Helper function to create audit log entries';
