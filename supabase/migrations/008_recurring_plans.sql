-- Migration: Add recurring cleaning plan support
-- Extends subscriptions table for visit tracking and scheduling

-- Enhance subscriptions table for recurring plans
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS visits_completed INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6);
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS time_window TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS default_addons JSONB DEFAULT '{}'::JSONB;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS first_visit_deep BOOLEAN DEFAULT false;

-- Rename cadence to frequency for consistency with types
ALTER TABLE subscriptions RENAME COLUMN cadence TO frequency;

-- Update check constraint for frequency
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_cadence_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_frequency_check 
  CHECK (frequency IN ('WEEKLY', 'BIWEEKLY', 'MONTHLY'));

-- Link orders to subscriptions
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Create index for subscription orders
CREATE INDEX IF NOT EXISTS idx_orders_subscription_id ON orders(subscription_id);

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.visits_completed IS 'Number of completed visits; discount applies after first visit';
COMMENT ON COLUMN subscriptions.first_visit_deep IS 'If true, first visit is deep clean at regular rate';
COMMENT ON COLUMN subscriptions.day_of_week IS '0=Sunday, 6=Saturday';
COMMENT ON COLUMN subscriptions.time_window IS 'Preferred time window, e.g., "8–10am"';
