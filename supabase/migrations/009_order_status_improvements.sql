-- Migration: Improve Order Status System
-- Description: Adds new statuses for better order lifecycle tracking
-- Key changes:
-- 1. Adds 'in_progress', 'out_for_delivery', 'delivered' statuses
-- 2. Orders are only truly "complete" when delivered (laundry) or finished (cleaning)

-- Drop existing CHECK constraint on orders.status
ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add updated CHECK constraint with new statuses
ALTER TABLE orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'pending',
      'pending_pickup',
      'at_facility',
      'awaiting_payment',
      'paid_processing',
      'in_progress',
      'out_for_delivery',
      'delivered',
      'completed',
      'canceled',
      -- Legacy uppercase statuses (for backward compatibility during transition)
      'PENDING',
      'PAID',
      'RECEIVED',
      'IN_PROGRESS',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELED',
      'REFUNDED'
    )
  );

-- Add helpful comment explaining the status system
COMMENT ON COLUMN orders.status IS 
'Order status lifecycle:
LAUNDRY: pending → pending_pickup → at_facility → awaiting_payment → paid_processing → out_for_delivery → delivered (COMPLETE)
CLEANING: pending → pending_pickup → in_progress → completed (COMPLETE)
Note: Only "delivered" (laundry) or "completed" (cleaning) indicate actual service completion';

-- Create index for performance on status queries
CREATE INDEX IF NOT EXISTS idx_orders_status_service_type 
  ON orders(status, service_type);
