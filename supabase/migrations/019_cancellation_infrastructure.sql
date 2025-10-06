-- Migration 019: Cancellation & Rescheduling Infrastructure
-- Description: Adds comprehensive support for order cancellation and rescheduling
-- with fee tracking, modification history, refunds, and notification preferences

-- Add cancellation/rescheduling columns to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS reschedule_fee_cents INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS canceled_reason TEXT,
  ADD COLUMN IF NOT EXISTS canceled_by UUID REFERENCES profiles(id);

-- Create order modifications tracking table
CREATE TABLE IF NOT EXISTS order_modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  modification_type TEXT NOT NULL CHECK (modification_type IN ('RESCHEDULE', 'CANCEL')),
  old_slot_start TIMESTAMPTZ,
  old_slot_end TIMESTAMPTZ,
  new_slot_start TIMESTAMPTZ,
  new_slot_end TIMESTAMPTZ,
  fee_cents INT DEFAULT 0,
  reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_modification CHECK (
    (modification_type = 'CANCEL' AND new_slot_start IS NULL) OR
    (modification_type = 'RESCHEDULE' AND new_slot_start IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_order_modifications_order_id ON order_modifications(order_id);
CREATE INDEX IF NOT EXISTS idx_order_modifications_created_at ON order_modifications(created_at DESC);

-- Create refunds tracking table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL,
  reason TEXT NOT NULL,
  stripe_refund_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed')),
  approved_by UUID REFERENCES profiles(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status) WHERE status IN ('pending', 'processing');

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  sms_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT false,
  notification_types JSONB DEFAULT '{"booking": true, "status_updates": true, "quotes": true, "promotions": false}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification log table for tracking
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  channels JSONB DEFAULT '{}'::jsonb,
  payload JSONB DEFAULT '{}'::jsonb,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_delivered_at ON notification_log(delivered_at DESC);

-- Add helpful comments
COMMENT ON TABLE order_modifications IS 'Tracks all modifications to orders including cancellations and rescheduling';
COMMENT ON TABLE refunds IS 'Tracks refund processing for canceled orders';
COMMENT ON TABLE notification_preferences IS 'User preferences for different notification channels';
COMMENT ON TABLE notification_log IS 'Audit log of all notifications sent to users';

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_canceled_at ON orders(canceled_at) WHERE canceled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_reschedule_fee ON orders(reschedule_fee_cents) WHERE reschedule_fee_cents > 0;

-- RLS policies for order_modifications
ALTER TABLE order_modifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own order modifications"
  ON order_modifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_modifications.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all modifications"
  ON order_modifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS policies for refunds
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own refunds"
  ON refunds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = refunds.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage refunds"
  ON refunds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS policies for notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- RLS policies for notification_log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification log"
  ON notification_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all notification logs"
  ON notification_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
