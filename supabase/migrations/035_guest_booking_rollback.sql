-- Rollback Migration 035: Guest Booking and Cancellation Policy Versioning
-- Reverses all changes made in 035_guest_booking_and_policy_versioning.sql

-- ============================================================================
-- 1. DROP TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Drop policy change trigger
DROP TRIGGER IF EXISTS order_policy_change_trigger ON orders;
DROP FUNCTION IF EXISTS log_policy_change();

-- Drop helper functions
DROP FUNCTION IF EXISTS is_guest_order(orders);
DROP FUNCTION IF EXISTS get_active_policy_with_version(TEXT);

-- ============================================================================
-- 2. RESTORE ORIGINAL RLS POLICIES
-- ============================================================================

-- Drop the new policy
DROP POLICY IF EXISTS "orders_read_own_or_guest" ON orders;

-- Recreate the original policy (if it existed)
-- Note: Adjust this based on your original RLS policy structure
CREATE POLICY "orders_read_own" 
  ON orders
  FOR SELECT 
  USING (
    -- Authenticated users see their own orders
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR
    -- Admins see all orders
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    ))
    OR
    -- Partners see their assigned orders
    (EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
      AND orders.partner_id IN (
        SELECT id FROM partners WHERE partners.id = orders.partner_id
      )
    ))
  );

-- ============================================================================
-- 3. REMOVE INDEXES
-- ============================================================================

-- Drop composite guest order index
DROP INDEX IF EXISTS idx_orders_guest_email_created;

-- Drop policy version index
DROP INDEX IF EXISTS idx_orders_policy_version;

-- Drop policy id index
DROP INDEX IF EXISTS idx_orders_policy_id;

-- Drop guest email index
DROP INDEX IF EXISTS idx_orders_guest_email;

-- Drop cancellation policies version index
DROP INDEX IF EXISTS idx_cancellation_policies_version;

-- ============================================================================
-- 4. REMOVE CONSTRAINTS FROM ORDERS TABLE
-- ============================================================================

-- Drop user or guest required constraint
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_user_or_guest_required;

-- Drop guest phone format constraint
ALTER TABLE orders 
  DROP CONSTRAINT IF EXISTS orders_guest_phone_e164_format;

-- ============================================================================
-- 5. RESTORE CANCELLATION_POLICIES CONSTRAINTS
-- ============================================================================

-- Drop the new constraint
ALTER TABLE cancellation_policies
  DROP CONSTRAINT IF EXISTS unique_active_policy_service_version;

-- Restore the original constraint (if it existed)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_active_policy_per_service'
  ) THEN
    ALTER TABLE cancellation_policies
      ADD CONSTRAINT unique_active_policy_per_service 
        UNIQUE(service_type, active);
  END IF;
END $$;

-- ============================================================================
-- 6. REMOVE COLUMNS FROM CANCELLATION_POLICIES
-- ============================================================================

-- Remove version column
ALTER TABLE cancellation_policies
  DROP COLUMN IF EXISTS version;

-- ============================================================================
-- 7. REMOVE COLUMNS FROM ORDERS TABLE
-- ============================================================================

-- Remove UTM tracking
ALTER TABLE orders
  DROP COLUMN IF EXISTS utm_params;

-- Remove policy tracking columns
ALTER TABLE orders
  DROP COLUMN IF EXISTS policy_version,
  DROP COLUMN IF EXISTS policy_id;

-- Remove guest contact fields
ALTER TABLE orders
  DROP COLUMN IF EXISTS guest_phone,
  DROP COLUMN IF EXISTS guest_email,
  DROP COLUMN IF EXISTS guest_name;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- Verification queries (commented out for production)
-- \d orders
-- \d cancellation_policies
-- SELECT conname FROM pg_constraint WHERE conrelid = 'orders'::regclass;
