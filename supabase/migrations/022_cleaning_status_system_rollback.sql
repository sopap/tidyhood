-- =====================================================
-- Rollback: Cleaning Status System
-- Version: 022_rollback
-- Description: Remove cleaning status columns
-- =====================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_orders_cleaning_status;
DROP INDEX IF EXISTS idx_orders_rescheduled_from;
DROP INDEX IF EXISTS idx_orders_scheduled_time_cleaning;

-- Drop columns (in reverse order)
ALTER TABLE orders DROP COLUMN IF EXISTS canceled_by;
ALTER TABLE orders DROP COLUMN IF EXISTS canceled_at;
ALTER TABLE orders DROP COLUMN IF EXISTS refund_amount_cents;
ALTER TABLE orders DROP COLUMN IF EXISTS cancellation_fee_cents;
ALTER TABLE orders DROP COLUMN IF EXISTS cancellation_reason;
ALTER TABLE orders DROP COLUMN IF EXISTS rescheduled_to;
ALTER TABLE orders DROP COLUMN IF EXISTS rescheduled_from;
ALTER TABLE orders DROP COLUMN IF EXISTS cleaning_status;
