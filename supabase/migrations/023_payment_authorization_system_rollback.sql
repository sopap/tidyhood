-- ========================================
-- ROLLBACK: PAYMENT AUTHORIZATION SYSTEM
-- ========================================
-- Author: TidyHood Dev Team
-- Date: 2025-10-07
-- Purpose: Rollback payment authorization system changes
-- WARNING: This will drop all payment authorization data

-- Step 1: Drop helper functions
DROP FUNCTION IF EXISTS get_expired_authorizations();
DROP FUNCTION IF EXISTS get_expiring_authorizations(INT);
DROP FUNCTION IF EXISTS update_order_with_version(UUID, INT, JSONB);

-- Step 2: Drop RLS policies
DROP POLICY IF EXISTS "Admins can view payment sagas" ON payment_sagas;
DROP POLICY IF EXISTS "Service role can manage payment sagas" ON payment_sagas;
DROP POLICY IF EXISTS "Admins can view webhook events" ON webhook_events;
DROP POLICY IF EXISTS "Service role can manage webhook events" ON webhook_events;

-- Step 3: Drop tables
DROP TABLE IF EXISTS payment_sagas;
DROP TABLE IF EXISTS webhook_events;

-- Step 4: Drop indexes
DROP INDEX IF EXISTS idx_order_events_idempotency;
DROP INDEX IF EXISTS idx_orders_no_show_charged;
DROP INDEX IF EXISTS idx_orders_authorized_at;
DROP INDEX IF EXISTS idx_orders_requires_approval;
DROP INDEX IF EXISTS idx_orders_payment_failed;
DROP INDEX IF EXISTS idx_orders_saved_payment_method;
DROP INDEX IF EXISTS idx_orders_setup_intent;

-- Step 5: Drop columns from order_events
ALTER TABLE order_events DROP COLUMN IF EXISTS idempotency_key;

-- Step 6: Drop columns from orders table
ALTER TABLE orders DROP COLUMN IF EXISTS requires_approval;
ALTER TABLE orders DROP COLUMN IF EXISTS version;
ALTER TABLE orders DROP COLUMN IF EXISTS capture_attempt_count;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_error_code;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_error;
ALTER TABLE orders DROP COLUMN IF EXISTS no_show_charged_at;
ALTER TABLE orders DROP COLUMN IF EXISTS no_show_charged;
ALTER TABLE orders DROP COLUMN IF EXISTS no_show_fee_cents;
ALTER TABLE orders DROP COLUMN IF EXISTS variance_threshold_pct;
ALTER TABLE orders DROP COLUMN IF EXISTS card_validated;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_method_saved_at;
ALTER TABLE orders DROP COLUMN IF EXISTS saved_payment_method_id;
ALTER TABLE orders DROP COLUMN IF EXISTS setup_intent_id;

-- Step 7: Drop Stripe customer ID from profiles
DROP INDEX IF EXISTS idx_profiles_stripe_customer;
ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_customer_id;

-- Step 8: Restore status constraint (remove payment_failed)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pending_pickup',
  'at_facility',
  'awaiting_payment',
  'paid_processing',
  'completed',
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

-- Rollback complete
