-- Migration: Add Stripe receipt fields to orders table
-- Description: Enables customers to access their Stripe payment receipts
-- Author: Product Team
-- Date: 2025-10-15

-- Add receipt-related columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_receipt_url TEXT,
ADD COLUMN IF NOT EXISTS stripe_receipt_number TEXT;

-- Add index for quick lookups by charge ID
CREATE INDEX IF NOT EXISTS idx_orders_stripe_charge_id 
ON orders(stripe_charge_id) 
WHERE stripe_charge_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.stripe_charge_id IS 'Stripe charge ID from successful payment';
COMMENT ON COLUMN orders.stripe_receipt_url IS 'Stripe hosted receipt URL for customer access';
COMMENT ON COLUMN orders.stripe_receipt_number IS 'Human-readable receipt number from Stripe';
