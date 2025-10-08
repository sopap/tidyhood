-- Fix Capacity Calendar Unique Constraint
-- Purpose: Remove overly restrictive unique index that prevents valid slots
-- Date: October 2025
-- Issue: The unique index on (partner_id, service_type, slot_start) prevents
--        creating slots that start at the same time even if they don't overlap,
--        which is too restrictive. We rely on check_capacity_conflict() instead.

-- Drop the overly restrictive unique index
DROP INDEX IF EXISTS idx_capacity_calendar_no_overlap;

-- Add a comment explaining why we don't have a unique constraint
COMMENT ON TABLE capacity_calendar IS 'Individual time slots for partners. Generated from templates or created manually. Overlaps are prevented by check_capacity_conflict() function, not by unique constraints.';
