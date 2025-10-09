-- Migration 030: Add stripe_customer_id to orders table
-- Date: 2025-10-08
-- Description: Add stripe_customer_id column to orders table to support auto-payment
-- This column should have been added in migration 029 but was missed

-- Add stripe_customer_id column to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Create index for performance when querying by stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_orders_stripe_customer 
  ON orders(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.stripe_customer_id IS 'Stripe customer ID copied from user profile for payment processing';

-- Update existing orders to copy stripe_customer_id from profiles
UPDATE orders o
SET stripe_customer_id = p.stripe_customer_id
FROM profiles p
WHERE o.user_id = p.id 
  AND o.stripe_customer_id IS NULL 
  AND p.stripe_customer_id IS NOT NULL;
