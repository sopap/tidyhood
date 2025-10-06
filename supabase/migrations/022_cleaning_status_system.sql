-- =====================================================
-- Migration: Cleaning Status System
-- Version: 022
-- Description: Add cleaning-specific status tracking
-- Author: TidyHood Dev Team
-- Date: 2025-10-06
-- =====================================================

-- Add cleaning status column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cleaning_status TEXT 
CHECK (cleaning_status IN (
  'scheduled',
  'in_service', 
  'completed',
  'canceled',
  'rescheduled'
));

-- Add reschedule tracking columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS rescheduled_from UUID 
  REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS rescheduled_to UUID 
  REFERENCES orders(id) ON DELETE SET NULL;

-- Add cancellation tracking columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancellation_fee_cents INTEGER 
  CHECK (cancellation_fee_cents >= 0);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER 
  CHECK (refund_amount_cents >= 0);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS canceled_by TEXT 
  CHECK (canceled_by IN ('customer', 'partner', 'system'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_cleaning_status 
  ON orders(cleaning_status) 
  WHERE service_type = 'CLEANING';

CREATE INDEX IF NOT EXISTS idx_orders_rescheduled_from 
  ON orders(rescheduled_from) 
  WHERE rescheduled_from IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_scheduled_time_cleaning 
  ON orders(scheduled_time) 
  WHERE service_type = 'CLEANING' AND cleaning_status = 'scheduled';

-- Migrate existing cleaning orders to new status system
UPDATE orders 
SET cleaning_status = CASE
  -- If already completed
  WHEN status = 'completed' THEN 'completed'
  
  -- If appointment is today
  WHEN DATE(scheduled_time) = CURRENT_DATE 
    AND status IN ('paid', 'confirmed') THEN 'in_service'
  
  -- If appointment is in future
  WHEN scheduled_time > NOW() 
    AND status IN ('paid', 'confirmed') THEN 'scheduled'
  
  -- If explicitly canceled
  WHEN status = 'canceled' THEN 'canceled'
  
  -- Default to scheduled for paid orders
  WHEN status = 'paid' THEN 'scheduled'
  
  -- Otherwise keep as completed
  ELSE 'completed'
END
WHERE service_type = 'CLEANING' 
  AND cleaning_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.cleaning_status IS 
  'Simplified status for cleaning orders: scheduled, in_service, completed, canceled, rescheduled';

COMMENT ON COLUMN orders.rescheduled_from IS 
  'Points to the original order that was rescheduled';

COMMENT ON COLUMN orders.rescheduled_to IS 
  'Points to the new order created after reschedule';

COMMENT ON COLUMN orders.cancellation_fee_cents IS 
  'Fee charged for cancellation (0 if >24h notice, 15% if <24h)';

COMMENT ON COLUMN orders.refund_amount_cents IS 
  'Amount refunded after subtracting cancellation fee';

COMMENT ON COLUMN orders.canceled_by IS 
  'Who initiated the cancellation: customer, partner, or system';
