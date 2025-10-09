-- Migration 029: Automatic Payment Collection System
-- Date: 2025-10-08
-- Description: Add fields for automatic payment after quote approval

-- Add fields to orders table for approval workflow
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS pending_admin_approval BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS auto_charged_at TIMESTAMP;

-- Create payment retry log table for failed payment tracking
CREATE TABLE IF NOT EXISTS payment_retry_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  error_message TEXT,
  stripe_error_code TEXT,
  retry_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_pending_approval 
  ON orders(pending_admin_approval) 
  WHERE pending_admin_approval = TRUE;

CREATE INDEX IF NOT EXISTS idx_payment_retry_pending 
  ON payment_retry_log(retry_at) 
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_retry_order 
  ON payment_retry_log(order_id);

-- Add comment for documentation
COMMENT ON COLUMN orders.pending_admin_approval IS 'True when partner quote awaits admin approval before auto-charging';
COMMENT ON COLUMN orders.approved_by IS 'Admin user ID who approved the quote for auto-charge';
COMMENT ON COLUMN orders.approved_at IS 'Timestamp when admin approved the quote';
COMMENT ON COLUMN orders.auto_charged_at IS 'Timestamp when card was automatically charged (without customer action)';
COMMENT ON TABLE payment_retry_log IS 'Log of failed automatic payment attempts for retry processing';
