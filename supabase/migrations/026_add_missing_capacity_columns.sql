-- Add missing columns to capacity_calendar table
-- These columns were in migration 016 but weren't applied to production

ALTER TABLE capacity_calendar 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment
COMMENT ON COLUMN capacity_calendar.created_by IS 'Admin user who created this capacity slot';
COMMENT ON COLUMN capacity_calendar.notes IS 'Internal notes about this capacity slot';
