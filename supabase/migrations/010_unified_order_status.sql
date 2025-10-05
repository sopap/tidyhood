-- Migration: Unified Order Status System
-- Phase 1: Week 1, Day 1
-- Description: Add new status values, phone column, quote JSONB, and backward compatibility

-- 1. Add new status enum values
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'pending_pickup',
            'picked_up',
            'at_facility',
            'quote_sent',
            'awaiting_payment',
            'paid_processing',
            'out_for_delivery',
            'completed',
            'canceled'
        );
    END IF;
END $$;

-- Add new status values if they don't exist
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cleaned';

-- 2. Add phone column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 3. Add quote JSONB column for laundry quote details
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS quote JSONB;

-- 4. Create status mapping function for backward compatibility
CREATE OR REPLACE FUNCTION map_legacy_status(old_status TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE old_status
    WHEN 'pending_pickup' THEN 'scheduled'
    WHEN 'paid_processing' THEN 'processing'
    WHEN 'completed' THEN CASE 
      WHEN EXISTS (
        SELECT 1 FROM orders 
        WHERE status::text = old_status 
        AND service_type = 'CLEANING'
      ) THEN 'cleaned'
      ELSE 'delivered'
    END
    ELSE old_status
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Create function to map new status back to legacy
CREATE OR REPLACE FUNCTION map_to_legacy_status(new_status TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE new_status
    WHEN 'scheduled' THEN 'pending_pickup'
    WHEN 'processing' THEN 'paid_processing'
    WHEN 'delivered' THEN 'completed'
    WHEN 'cleaned' THEN 'completed'
    ELSE new_status
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_service_status ON orders(service_type, status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders(user_id, status, created_at DESC);

-- 7. Add quote validation constraint
ALTER TABLE orders
ADD CONSTRAINT check_quote_structure CHECK (
  quote IS NULL OR (
    quote ? 'items' AND
    quote ? 'totalCents' AND
    quote ? 'expiresAtISO'
  )
);

-- 8. Create view for backward compatibility
CREATE OR REPLACE VIEW orders_legacy AS
SELECT 
  id,
  user_id,
  service_type,
  map_to_legacy_status(status::text)::order_status as status,
  partner_id,
  slot_start,
  slot_end,
  subtotal_cents,
  tax_cents,
  delivery_cents,
  total_cents,
  address_snapshot,
  order_details,
  phone,
  quote,
  actual_weight_lbs,
  quote_cents,
  quoted_at,
  paid_at,
  partner_notes,
  intake_photos_json,
  outtake_photos_json,
  created_at,
  updated_at
FROM orders;

-- 9. Create helper function to validate status transitions
CREATE OR REPLACE FUNCTION can_transition_status(
  p_current_status TEXT,
  p_new_status TEXT,
  p_service_type TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Laundry transitions
  IF p_service_type = 'LAUNDRY' THEN
    IF p_current_status = 'scheduled' AND p_new_status = 'picked_up' THEN RETURN TRUE; END IF;
    IF p_current_status = 'picked_up' AND p_new_status = 'at_facility' THEN RETURN TRUE; END IF;
    IF p_current_status = 'at_facility' AND p_new_status = 'quote_sent' THEN RETURN TRUE; END IF;
    IF p_current_status = 'quote_sent' AND p_new_status = 'awaiting_payment' THEN RETURN TRUE; END IF;
    IF p_current_status = 'awaiting_payment' AND p_new_status = 'processing' THEN RETURN TRUE; END IF;
    IF p_current_status = 'processing' AND p_new_status = 'out_for_delivery' THEN RETURN TRUE; END IF;
    IF p_current_status = 'out_for_delivery' AND p_new_status = 'delivered' THEN RETURN TRUE; END IF;
  END IF;
  
  -- Cleaning transitions
  IF p_service_type = 'CLEANING' THEN
    IF p_current_status = 'scheduled' AND p_new_status = 'processing' THEN RETURN TRUE; END IF;
    IF p_current_status = 'processing' AND p_new_status = 'cleaned' THEN RETURN TRUE; END IF;
  END IF;
  
  -- Cancellation (pre-terminal states only)
  IF p_new_status = 'canceled' AND p_current_status IN (
    'scheduled', 'picked_up', 'at_facility', 'quote_sent', 'awaiting_payment'
  ) THEN 
    RETURN TRUE; 
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. Create trigger to validate status transitions
CREATE OR REPLACE FUNCTION validate_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS NOT NULL AND NEW.status != OLD.status THEN
    IF NOT can_transition_status(
      OLD.status::text, 
      NEW.status::text, 
      NEW.service_type
    ) THEN
      RAISE EXCEPTION 'Invalid status transition from % to % for service %', 
        OLD.status, NEW.status, NEW.service_type;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_validate_status_transition ON orders;
CREATE TRIGGER trigger_validate_status_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_status_transition();

-- 11. Comments for documentation
COMMENT ON COLUMN orders.phone IS 'Customer phone number for notifications (E.164 format preferred)';
COMMENT ON COLUMN orders.quote IS 'Laundry quote details: {items: [], totalCents: number, expiresAtISO: string, acceptedAtISO?: string}';
COMMENT ON FUNCTION map_legacy_status(TEXT) IS 'Maps old status values to new unified status system';
COMMENT ON FUNCTION map_to_legacy_status(TEXT) IS 'Maps new status values back to legacy status for backward compatibility';
COMMENT ON FUNCTION can_transition_status(TEXT, TEXT, TEXT) IS 'Validates if status transition is allowed based on service type';

-- 12. Grant permissions (adjust role names as needed)
-- GRANT SELECT ON orders_legacy TO authenticated;
-- GRANT EXECUTE ON FUNCTION map_legacy_status TO authenticated;
-- GRANT EXECUTE ON FUNCTION map_to_legacy_status TO authenticated;

-- Migration complete
-- Next steps:
-- 1. Test with existing data
-- 2. Update application code to use new status values
-- 3. Migrate existing orders gradually
-- 4. Monitor for any issues
