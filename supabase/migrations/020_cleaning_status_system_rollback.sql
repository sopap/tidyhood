-- Rollback Migration 020: Cleaning Service Status System
-- Run this to revert changes if needed (use with caution in production)

-- ============================================================================
-- PART 1: Drop Functions
-- ============================================================================

DROP FUNCTION IF EXISTS get_valid_actions(uuid, text);
DROP FUNCTION IF EXISTS transition_order_status(uuid, text, uuid, text, jsonb);

-- ============================================================================
-- PART 2: Drop Table
-- ============================================================================

DROP TABLE IF EXISTS order_events CASCADE;

-- ============================================================================
-- PART 3: Remove Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_orders_cleaning_active;
DROP INDEX IF EXISTS idx_orders_disputed;
DROP INDEX IF EXISTS idx_orders_assigned_at;

-- ============================================================================
-- PART 4: Remove Columns
-- ============================================================================

ALTER TABLE orders
  DROP COLUMN IF EXISTS no_show_type,
  DROP COLUMN IF EXISTS no_show_reported_at,
  DROP COLUMN IF EXISTS proof,
  DROP COLUMN IF EXISTS resolution_type,
  DROP COLUMN IF EXISTS resolved_at,
  DROP COLUMN IF EXISTS dispute_reason,
  DROP COLUMN IF EXISTS disputed_at,
  DROP COLUMN IF EXISTS on_site_at,
  DROP COLUMN IF EXISTS en_route_at,
  DROP COLUMN IF EXISTS assigned_at;

-- Note: completed_at and started_at are kept as they may be used by existing code

-- ============================================================================
-- PART 5: Remove Enum Values (DANGEROUS - Cannot be easily done)
-- ============================================================================

-- WARNING: PostgreSQL does not support removing enum values directly
-- You would need to:
-- 1. Create a new enum without the new values
-- 2. Migrate all data
-- 3. Drop old enum and rename new one
-- This is complex and risky in production

-- Instead, document that these values exist but should not be used:
COMMENT ON TYPE order_status IS 'Status enum - values assigned, en_route, on_site, disputed, refunded, cleaner_no_show, customer_no_show added in migration 020 (deprecated if rolled back)';

-- ============================================================================
-- Rollback Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 020 rollback complete';
  RAISE NOTICE 'Note: Enum values cannot be removed and remain in database';
  RAISE NOTICE 'Ensure no orders are using new status values before rollback';
END $$;
