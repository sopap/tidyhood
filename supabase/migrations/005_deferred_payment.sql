-- Migration: Deferred Payment System
-- Adds support for pay-after-service laundry flow and partner operations

-- Step 1: Update order status enum to include new statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pending_pickup',      -- Order placed, awaiting pickup (no payment yet)
  'at_facility',         -- Partner has received items
  'awaiting_payment',    -- Quote submitted, waiting for customer payment
  'paid_processing',     -- Payment received, service in progress
  'completed',           -- Service complete, delivered
  'PENDING',            -- Legacy: keep for backwards compatibility
  'PAID',               -- Legacy: keep for backwards compatibility
  'RECEIVED',           -- Legacy
  'IN_PROGRESS',        -- Legacy
  'READY',              -- Legacy
  'OUT_FOR_DELIVERY',   -- Legacy
  'DELIVERED',          -- Legacy
  'CANCELED',
  'REFUNDED'
));

-- Step 2: Add quote and weight tracking fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_weight_lbs NUMERIC;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote_cents INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quoted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Step 3: Add partner photo tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS intake_photos_json JSONB DEFAULT '[]'::JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS outtake_photos_json JSONB DEFAULT '[]'::JSONB;

-- Step 4: Add partner notes field
ALTER TABLE orders ADD COLUMN IF NOT EXISTS partner_notes TEXT;

-- Step 5: Add indexes for new query patterns
CREATE INDEX IF NOT EXISTS idx_orders_status_service ON orders(status, service_type);
CREATE INDEX IF NOT EXISTS idx_orders_partner_status ON orders(partner_id, status) WHERE partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_awaiting_payment ON orders(status) WHERE status = 'awaiting_payment';

-- Step 6: Create helper function to log status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_events (order_id, event_type, payload_json)
    VALUES (
      NEW.id,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Add trigger for automatic status change logging
DROP TRIGGER IF EXISTS order_status_change_trigger ON orders;
CREATE TRIGGER order_status_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_order_status_change();

-- Step 8: Add comment documentation
COMMENT ON COLUMN orders.actual_weight_lbs IS 'Actual weight measured by partner (for laundry)';
COMMENT ON COLUMN orders.quote_cents IS 'Final quote amount sent to customer after weighing';
COMMENT ON COLUMN orders.quoted_at IS 'Timestamp when partner submitted the quote';
COMMENT ON COLUMN orders.paid_at IS 'Timestamp when customer completed payment';
COMMENT ON COLUMN orders.intake_photos_json IS 'Array of photo URLs taken at intake';
COMMENT ON COLUMN orders.outtake_photos_json IS 'Array of photo URLs taken before delivery';
