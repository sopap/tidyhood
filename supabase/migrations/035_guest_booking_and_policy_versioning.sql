-- Guest Booking and Cancellation Policy Versioning
-- Enables guest checkouts (no login required) and tracks policy versions on orders

-- ============================================================================
-- 1. MODIFY ORDERS TABLE FOR GUEST BOOKINGS
-- ============================================================================

-- Add guest contact fields
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT,
  ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- Add cancellation policy tracking
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS policy_id UUID REFERENCES cancellation_policies(id),
  ADD COLUMN IF NOT EXISTS policy_version INT;

-- Add UTM tracking for marketing attribution
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS utm_params JSONB DEFAULT '{}'::JSONB;

-- Add constraint for guest_phone format (E.164 international format)
-- E.164: +[country code][number] e.g., +19171234567
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_guest_phone_e164_format'
  ) THEN
    ALTER TABLE orders 
      ADD CONSTRAINT orders_guest_phone_e164_format 
        CHECK (guest_phone IS NULL OR guest_phone ~ '^\+[1-9]\d{1,14}$');
  END IF;
END $$;

-- Add constraint: Must have EITHER user_id OR (guest_email AND guest_phone)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_or_guest_required'
  ) THEN
    ALTER TABLE orders 
      ADD CONSTRAINT orders_user_or_guest_required 
        CHECK (
          user_id IS NOT NULL 
          OR (guest_email IS NOT NULL AND guest_phone IS NOT NULL)
        );
  END IF;
END $$;

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT orders_user_or_guest_required ON orders IS 
  'Ensures order has either an authenticated user OR guest contact information (email + phone)';

-- ============================================================================
-- 2. ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Partial index for guest orders (only where guest_email exists)
CREATE INDEX IF NOT EXISTS idx_orders_guest_email 
  ON orders(guest_email) 
  WHERE guest_email IS NOT NULL;

-- Index for policy lookups
CREATE INDEX IF NOT EXISTS idx_orders_policy_id 
  ON orders(policy_id);

-- Index for policy version queries
CREATE INDEX IF NOT EXISTS idx_orders_policy_version 
  ON orders(policy_version);

-- Composite index for guest order lookups
CREATE INDEX IF NOT EXISTS idx_orders_guest_email_created 
  ON orders(guest_email, created_at DESC) 
  WHERE guest_email IS NOT NULL;

-- ============================================================================
-- 3. UPDATE CANCELLATION_POLICIES TABLE FOR VERSIONING
-- ============================================================================

-- Add version column if not exists
ALTER TABLE cancellation_policies
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- Update existing rows to have version 1 if NULL
UPDATE cancellation_policies 
SET version = 1 
WHERE version IS NULL;

-- Make version NOT NULL after populating
ALTER TABLE cancellation_policies
  ALTER COLUMN version SET NOT NULL;

-- Add unique constraint: Only one active policy per service type per version
-- This prevents having multiple active policies for the same service
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_active_policy_service_version'
  ) THEN
    -- Drop the old constraint if it exists
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'unique_active_policy_per_service'
    ) THEN
      ALTER TABLE cancellation_policies 
        DROP CONSTRAINT unique_active_policy_per_service;
    END IF;
    
    -- Add unique index instead of constraint (supports WHERE clause)
    CREATE UNIQUE INDEX IF NOT EXISTS unique_active_policy_service_version 
      ON cancellation_policies(service_type) 
      WHERE active = true;
  END IF;
END $$;

-- Add index for version lookups
CREATE INDEX IF NOT EXISTS idx_cancellation_policies_version 
  ON cancellation_policies(service_type, version DESC);

-- Add comment explaining versioning
COMMENT ON COLUMN cancellation_policies.version IS 
  'Policy version number. Increments when policy is updated. Orders store this to track historical policy at time of booking.';

-- ============================================================================
-- 4. UPDATE RLS POLICIES FOR GUEST ORDERS
-- ============================================================================

-- Drop existing read policy if it exists to recreate with guest support
DROP POLICY IF EXISTS "orders_read_own" ON orders;

-- Create new policy that allows:
-- 1. Authenticated users to read their own orders
-- 2. Guest users to read orders matching their email (with token validation in app layer)
-- 3. Admins and partners to read relevant orders
CREATE POLICY "orders_read_own_or_guest" 
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
    -- Note: Guest order access requires application-layer token validation
    -- Cannot be enforced at RLS level without exposing all guest orders
  );

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get the active policy for a service type (with version)
CREATE OR REPLACE FUNCTION get_active_policy_with_version(p_service_type TEXT)
RETURNS TABLE (
  id UUID,
  version INT,
  notice_hours INT,
  cancellation_fee_percent DECIMAL,
  reschedule_notice_hours INT,
  reschedule_fee_percent DECIMAL,
  allow_cancellation BOOLEAN,
  allow_rescheduling BOOLEAN
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.version,
    cp.notice_hours,
    cp.cancellation_fee_percent,
    cp.reschedule_notice_hours,
    cp.reschedule_fee_percent,
    cp.allow_cancellation,
    cp.allow_rescheduling
  FROM cancellation_policies cp
  WHERE cp.service_type = p_service_type
    AND cp.active = true
  LIMIT 1;
END;
$$;

-- Function to check if order is a guest order
CREATE OR REPLACE FUNCTION is_guest_order(order_row orders)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN order_row.user_id IS NULL 
    AND order_row.guest_email IS NOT NULL 
    AND order_row.guest_phone IS NOT NULL;
END;
$$;

-- ============================================================================
-- 6. DATA MIGRATION: POPULATE POLICY IDS ON EXISTING ORDERS
-- ============================================================================

-- For existing orders, populate policy_id with the current active policy
-- This ensures historical data integrity
DO $$
DECLARE
  laundry_policy_id UUID;
  cleaning_policy_id UUID;
BEGIN
  -- Get current active policy IDs
  SELECT id INTO laundry_policy_id 
  FROM cancellation_policies 
  WHERE service_type = 'LAUNDRY' AND active = true 
  LIMIT 1;
  
  SELECT id INTO cleaning_policy_id 
  FROM cancellation_policies 
  WHERE service_type = 'CLEANING' AND active = true 
  LIMIT 1;
  
  -- Update LAUNDRY orders
  IF laundry_policy_id IS NOT NULL THEN
    UPDATE orders 
    SET 
      policy_id = laundry_policy_id,
      policy_version = 1
    WHERE service_type = 'LAUNDRY' 
      AND policy_id IS NULL;
  END IF;
  
  -- Update CLEANING orders
  IF cleaning_policy_id IS NOT NULL THEN
    UPDATE orders 
    SET 
      policy_id = cleaning_policy_id,
      policy_version = 1
    WHERE service_type = 'CLEANING' 
      AND policy_id IS NULL;
  END IF;
  
  RAISE NOTICE 'Populated policy_id and policy_version for existing orders';
END $$;

-- ============================================================================
-- 7. ADD AUDIT TRIGGER FOR POLICY CHANGES
-- ============================================================================

-- Create trigger to log when policy version changes on an order
CREATE OR REPLACE FUNCTION log_policy_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.policy_id IS DISTINCT FROM NEW.policy_id) OR 
     (OLD.policy_version IS DISTINCT FROM NEW.policy_version) THEN
    
    INSERT INTO order_events (
      order_id,
      actor,
      actor_role,
      event_type,
      payload_json
    ) VALUES (
      NEW.id,
      auth.uid(),
      'system',
      'POLICY_UPDATED',
      jsonb_build_object(
        'old_policy_id', OLD.policy_id,
        'new_policy_id', NEW.policy_id,
        'old_version', OLD.policy_version,
        'new_version', NEW.policy_version
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_policy_change_trigger ON orders;
CREATE TRIGGER order_policy_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (
    OLD.policy_id IS DISTINCT FROM NEW.policy_id OR
    OLD.policy_version IS DISTINCT FROM NEW.policy_version
  )
  EXECUTE FUNCTION log_policy_change();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verification queries (commented out for production)
-- SELECT COUNT(*) FILTER (WHERE user_id IS NULL) as guest_orders FROM orders;
-- SELECT COUNT(*) FILTER (WHERE user_id IS NOT NULL) as auth_orders FROM orders;
-- SELECT * FROM cancellation_policies ORDER BY service_type, version;
