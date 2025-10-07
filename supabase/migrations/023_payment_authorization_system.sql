-- ========================================
-- PAYMENT AUTHORIZATION SYSTEM MIGRATION
-- ========================================
-- Author: TidyHood Dev Team
-- Date: 2025-10-07
-- Purpose: Add payment authorization support to prevent no-shows
-- Estimated run time: 3 minutes
-- Dependencies: migrations 001-022 must be applied first

-- Step 1: Add Stripe customer ID to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe Customer ID for payment processing';

-- Step 2: Add Setup Intent fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS setup_intent_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS saved_payment_method_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method_saved_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_validated BOOLEAN DEFAULT false;

-- Step 3: Add no-show policy fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS no_show_fee_cents INT DEFAULT 2500;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS no_show_charged BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS no_show_charged_at TIMESTAMPTZ;

-- Step 4: Add payment error tracking fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_error TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_error_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS capture_attempt_count INT DEFAULT 0;

-- Step 5: Add optimistic locking for concurrency control
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;

-- Step 6: Add requires_approval flag for high-variance quotes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

-- Step 7: Update status enum to include payment_failed
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pending_pickup',
  'at_facility',
  'awaiting_payment',
  'paid_processing',
  'completed',
  'payment_failed',
  'pending',
  'in_progress',
  'out_for_delivery',
  'delivered',
  'canceled',
  'assigned',
  'en_route',
  'on_site',
  'disputed',
  'refunded',
  'cleaner_no_show',
  'customer_no_show',
  'PENDING',
  'PAID',
  'RECEIVED',
  'IN_PROGRESS',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELED',
  'REFUNDED'
));

-- Step 8: Create webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at);

-- Step 9: Create payment_sagas table for saga pattern (ensures atomicity)
CREATE TABLE IF NOT EXISTS payment_sagas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  params JSONB NOT NULL,
  steps JSONB DEFAULT '[]'::JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_sagas_status ON payment_sagas(status);
CREATE INDEX IF NOT EXISTS idx_payment_sagas_created ON payment_sagas(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_sagas_type_status ON payment_sagas(type, status);

-- Step 10: Add performance indexes for new query patterns
CREATE INDEX IF NOT EXISTS idx_orders_setup_intent ON orders(setup_intent_id) 
  WHERE setup_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_saved_payment_method ON orders(saved_payment_method_id)
  WHERE saved_payment_method_id IS NOT NULL;
  
CREATE INDEX IF NOT EXISTS idx_orders_payment_failed ON orders(status) 
  WHERE status = 'payment_failed';
  
CREATE INDEX IF NOT EXISTS idx_orders_requires_approval ON orders(requires_approval) 
  WHERE requires_approval = true;

CREATE INDEX IF NOT EXISTS idx_orders_no_show_charged ON orders(no_show_charged)
  WHERE no_show_charged = true;

-- Step 11: Add idempotency_key to order_events for quote submission
ALTER TABLE order_events ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE INDEX IF NOT EXISTS idx_order_events_idempotency ON order_events(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Step 12: Backfill existing orders with default values
-- This ensures backward compatibility with existing orders
UPDATE orders 
SET 
  no_show_fee_cents = COALESCE(no_show_fee_cents, 2500),
  no_show_charged = COALESCE(no_show_charged, false),
  version = COALESCE(version, 0),
  capture_attempt_count = COALESCE(capture_attempt_count, 0),
  requires_approval = COALESCE(requires_approval, false)
WHERE no_show_fee_cents IS NULL 
   OR version IS NULL;

-- Step 13: Set NOT NULL constraints after backfill
ALTER TABLE orders ALTER COLUMN no_show_fee_cents SET NOT NULL;
ALTER TABLE orders ALTER COLUMN no_show_fee_cents SET DEFAULT 2500;
ALTER TABLE orders ALTER COLUMN no_show_charged SET NOT NULL;
ALTER TABLE orders ALTER COLUMN no_show_charged SET DEFAULT false;
ALTER TABLE orders ALTER COLUMN version SET NOT NULL;
ALTER TABLE orders ALTER COLUMN version SET DEFAULT 0;
ALTER TABLE orders ALTER COLUMN capture_attempt_count SET NOT NULL;
ALTER TABLE orders ALTER COLUMN capture_attempt_count SET DEFAULT 0;
ALTER TABLE orders ALTER COLUMN requires_approval SET NOT NULL;
ALTER TABLE orders ALTER COLUMN requires_approval SET DEFAULT false;

-- Step 14: Add RLS policies for new fields
-- Enable RLS on webhook_events table
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage webhook events
CREATE POLICY "Service role can manage webhook events" ON webhook_events
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Policy: Admins can view webhook events
CREATE POLICY "Admins can view webhook events" ON webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Enable RLS on payment_sagas table
ALTER TABLE payment_sagas ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage sagas
CREATE POLICY "Service role can manage payment sagas" ON payment_sagas
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Policy: Admins can view sagas
CREATE POLICY "Admins can view payment sagas" ON payment_sagas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Step 15: Remove expiry-related functions (not needed with Setup Intent)
-- Setup Intents don't expire like PaymentIntents do

-- Step 16: Create helper function for optimistic locking
CREATE OR REPLACE FUNCTION update_order_with_version(
  p_order_id UUID,
  p_expected_version INT,
  p_updates JSONB
) RETURNS TABLE(success BOOLEAN, new_version INT) AS $$
DECLARE
  v_new_version INT;
  v_current_version INT;
BEGIN
  -- Get current version
  SELECT version INTO v_current_version
  FROM orders
  WHERE id = p_order_id;
  
  -- Check if version matches
  IF v_current_version IS NULL OR v_current_version != p_expected_version THEN
    RETURN QUERY SELECT false, COALESCE(v_current_version, 0);
    RETURN;
  END IF;
  
  -- Update with version increment
  UPDATE orders
  SET 
    status = COALESCE((p_updates->>'status')::TEXT, status),
    quote_cents = COALESCE((p_updates->>'quote_cents')::INT, quote_cents),
    paid_at = COALESCE((p_updates->>'paid_at')::TIMESTAMPTZ, paid_at),
    payment_error = COALESCE((p_updates->>'payment_error')::TEXT, payment_error),
    requires_approval = COALESCE((p_updates->>'requires_approval')::BOOLEAN, requires_approval),
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_order_id
    AND version = p_expected_version
  RETURNING version INTO v_new_version;
  
  IF FOUND THEN
    RETURN QUERY SELECT true, v_new_version;
  ELSE
    RETURN QUERY SELECT false, v_current_version;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 17: Add comments for documentation
COMMENT ON COLUMN orders.setup_intent_id IS 'Stripe SetupIntent ID for saved payment method';
COMMENT ON COLUMN orders.saved_payment_method_id IS 'Stripe PaymentMethod ID saved at booking';
COMMENT ON COLUMN orders.payment_method_saved_at IS 'Timestamp when payment method was saved';
COMMENT ON COLUMN orders.card_validated IS 'True if card was validated with $0.01 test charge';
COMMENT ON COLUMN orders.requires_approval IS 'True if quote variance exceeds threshold and requires customer approval';
COMMENT ON COLUMN orders.version IS 'Optimistic locking version number for concurrency control';
COMMENT ON COLUMN orders.payment_error IS 'Last payment error message (if any)';
COMMENT ON COLUMN orders.payment_error_code IS 'Last payment error code from Stripe';
COMMENT ON COLUMN orders.capture_attempt_count IS 'Number of payment capture attempts (for retry logic)';
COMMENT ON COLUMN orders.no_show_fee_cents IS 'No-show fee amount in cents (default: $25)';
COMMENT ON COLUMN orders.no_show_charged IS 'True if no-show fee has been charged';
COMMENT ON COLUMN orders.no_show_charged_at IS 'Timestamp when no-show fee was charged';

COMMENT ON TABLE webhook_events IS 'Stores processed Stripe webhook events for idempotency';
COMMENT ON COLUMN webhook_events.stripe_event_id IS 'Unique Stripe event ID';
COMMENT ON COLUMN webhook_events.event_type IS 'Type of webhook event (e.g., payment_intent.payment_failed)';
COMMENT ON COLUMN webhook_events.processed_at IS 'When this webhook was processed';
COMMENT ON COLUMN webhook_events.payload_json IS 'Full webhook payload for audit trail';

COMMENT ON TABLE payment_sagas IS 'Tracks payment authorization sagas for consistency and rollback';
COMMENT ON COLUMN payment_sagas.type IS 'Type of saga (e.g., payment_authorization)';
COMMENT ON COLUMN payment_sagas.status IS 'Saga status: pending, completed, or failed';
COMMENT ON COLUMN payment_sagas.params IS 'Input parameters for the saga';
COMMENT ON COLUMN payment_sagas.steps IS 'Array of completed steps for rollback';
COMMENT ON COLUMN payment_sagas.error_message IS 'Error message if saga failed';

COMMENT ON FUNCTION update_order_with_version IS 'Update order with optimistic locking to prevent race conditions';

-- Migration complete
