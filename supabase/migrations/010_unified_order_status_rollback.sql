-- Rollback: Unified Order Status System
-- Use this if migration 010 needs to be reverted

-- 1. Drop trigger
DROP TRIGGER IF EXISTS trigger_validate_status_transition ON orders;

-- 2. Drop functions
DROP FUNCTION IF EXISTS validate_status_transition();
DROP FUNCTION IF EXISTS can_transition_status(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS map_to_legacy_status(TEXT);
DROP FUNCTION IF EXISTS map_legacy_status(TEXT);

-- 3. Drop view
DROP VIEW IF EXISTS orders_legacy;

-- 4. Remove constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS check_quote_structure;

-- 5. Drop indexes
DROP INDEX IF EXISTS idx_orders_user_status;
DROP INDEX IF EXISTS idx_orders_service_status;
DROP INDEX IF EXISTS idx_orders_phone;
DROP INDEX IF EXISTS idx_orders_status;

-- 6. Remove columns
ALTER TABLE orders DROP COLUMN IF EXISTS quote;
ALTER TABLE orders DROP COLUMN IF EXISTS phone;

-- Note: Cannot easily remove enum values once added to PostgreSQL
-- The following status values will remain in the enum but won't be used:
-- 'scheduled', 'processing', 'delivered', 'cleaned'
-- 
-- If you absolutely need to remove them, you would need to:
-- 1. Create a new enum type without these values
-- 2. Alter the orders table to use the new type
-- 3. Drop the old type
-- This is complex and risky with existing data.

-- Rollback complete
-- Verify that application still works with legacy status values
