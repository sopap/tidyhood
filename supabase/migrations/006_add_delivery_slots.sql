-- Add Delivery Time Slots to Orders
-- Supports separate pickup and delivery scheduling for laundry orders

-- Add delivery slot fields to orders table
ALTER TABLE orders
ADD COLUMN delivery_slot_start TIMESTAMPTZ,
ADD COLUMN delivery_slot_end TIMESTAMPTZ;

-- Add index for delivery slots
CREATE INDEX idx_orders_delivery_slot ON orders(delivery_slot_start) WHERE delivery_slot_start IS NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN orders.delivery_slot_start IS 'Delivery window start time. For laundry: defaults to 48h after pickup. NULL for cleaning (same-day service).';
COMMENT ON COLUMN orders.delivery_slot_end IS 'Delivery window end time. Typically 2-hour window.';

-- For existing orders, set delivery to NULL (they're old orders)
-- New orders will populate these fields
