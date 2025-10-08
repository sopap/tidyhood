# Capacity Slot Creation - 500 Error Fix

## Problem
When trying to create capacity slots in the admin panel, you're getting a 500 Internal Server Error. This is caused by an overly restrictive unique index in the database.

## Root Cause
The `capacity_calendar` table has a unique index `idx_capacity_calendar_no_overlap` that prevents creating slots with the same start time, even if they don't actually overlap. This is too restrictive because:
- The API already has a proper `check_capacity_conflict()` function that checks for actual time overlaps
- The unique index blocks valid scenarios where you might want different capacity configurations

## Solution
Remove the restrictive unique index and rely on the `check_capacity_conflict()` function instead.

## How to Apply the Fix

There are TWO parts to this fix that need to be applied in order:

### Part 1: Remove the Restrictive Unique Index (✓ COMPLETED)

You've already run this successfully.

### Part 2: Add the Missing Function

The API is now failing because the `check_capacity_conflict` function is missing from your database.

**Steps:**

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/gbymheksmnenuranuvjr
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the following SQL:

```sql
CREATE OR REPLACE FUNCTION check_capacity_conflict(
  p_partner_id UUID,
  p_slot_start TIMESTAMPTZ,
  p_slot_end TIMESTAMPTZ,
  p_exclude_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM capacity_calendar
    WHERE partner_id = p_partner_id
    AND id != COALESCE(p_exclude_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      (slot_start <= p_slot_start AND slot_end > p_slot_start) OR
      (slot_start < p_slot_end AND slot_end >= p_slot_end) OR
      (slot_start >= p_slot_start AND slot_end <= p_slot_end)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_capacity_conflict IS 'Returns true if there is a time overlap for the given partner';
```

5. Click "Run" or press Cmd/Ctrl + Enter
6. You should see a success message

### Option 2: Via Local Supabase CLI (if using local development)

If you have Supabase CLI installed and are running local:

```bash
npx supabase db push
```

## Verification

After applying the fix:

1. Go to http://localhost:3000/admin/capacity/add
2. Try creating a capacity slot
3. The slot should now be created successfully without the 500 error

## What Changed

- **Before**: The unique index prevented any two slots from having the same `(partner_id, service_type, slot_start)` combination
- **After**: Slots are validated using the `check_capacity_conflict()` function which properly checks for actual time overlaps (considering both start and end times)

This allows for more flexible capacity management while still preventing actual conflicts.

## Migration Files

Two migration files have been created:

1. `supabase/migrations/024_fix_capacity_unique_constraint.sql` - Removes the restrictive unique index
2. `supabase/migrations/025_add_check_capacity_conflict.sql` - Adds the missing function

These will be applied automatically in future deployments.

## Technical Details

The `check_capacity_conflict` function checks for actual time overlaps by:
1. Finding all slots for the same partner
2. Excluding the current slot if updating (via `p_exclude_id`)
3. Checking if any slot overlaps with the proposed time range using proper interval logic
4. Returning true if a conflict exists, false otherwise

This provides more flexible and accurate conflict detection than a simple unique index on start time.
