-- Migration: Fix Cleaning Status Defaults
-- Description: Set cleaning_status for cleaning orders that don't have it set
-- This fixes the issue where cleaning orders show "Pending Pickup" instead of proper cleaning statuses

-- Step 1: Update all existing cleaning orders that have NULL cleaning_status
-- Set them to 'scheduled' as the default status
UPDATE orders
SET 
  cleaning_status = 'scheduled',
  updated_at = NOW()
WHERE 
  service_type = 'CLEANING' 
  AND cleaning_status IS NULL;

-- Step 2: Add a trigger to automatically set cleaning_status on insert for cleaning orders
CREATE OR REPLACE FUNCTION set_default_cleaning_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a cleaning order and cleaning_status is not set, default to 'scheduled'
  IF NEW.service_type = 'CLEANING' AND NEW.cleaning_status IS NULL THEN
    NEW.cleaning_status := 'scheduled';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (for rerunning migration)
DROP TRIGGER IF EXISTS trigger_set_default_cleaning_status ON orders;

-- Create the trigger
CREATE TRIGGER trigger_set_default_cleaning_status
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_default_cleaning_status();

-- Step 3: Add comment for documentation
COMMENT ON TRIGGER trigger_set_default_cleaning_status ON orders IS 
  'Automatically sets cleaning_status to scheduled for new cleaning orders if not explicitly set';
