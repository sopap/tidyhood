# Cleaning Status "Pending Pickup" Fix

## Problem Summary

Cleaning orders were displaying "Pending Pickup" status instead of proper cleaning statuses like "Scheduled". This occurred because:

1. The system has **two separate status systems**:
   - **Laundry/Dry Cleaning**: Uses `status` field with values like `pending_pickup`, `at_facility`, `awaiting_payment`, etc.
   - **Cleaning Orders**: Uses `cleaning_status` field with values like `scheduled`, `in_service`, `completed`, `canceled`

2. Cleaning orders created before the cleaning status system was implemented didn't have the `cleaning_status` field set
3. The order creation API wasn't setting `cleaning_status` for new cleaning orders
4. The UI was falling back to displaying the laundry `status` field when `cleaning_status` was NULL

## Root Causes

### 1. Legacy Data
Orders created before migration 022 (cleaning status system) don't have `cleaning_status` set.

### 2. Order Creation Bug
The `/api/orders` POST endpoint wasn't setting `cleaning_status` when creating cleaning orders.

### 3. No Default Value
The database didn't have a default value or trigger to automatically set `cleaning_status` for cleaning orders.

## Solution Implemented

### 1. Database Migration (028_fix_cleaning_status_defaults.sql)

Created a migration that:
- **Updates existing orders**: Sets `cleaning_status = 'scheduled'` for all cleaning orders with NULL cleaning_status
- **Adds database trigger**: Automatically sets `cleaning_status = 'scheduled'` for new cleaning orders if not explicitly set

```sql
-- Update existing orders
UPDATE orders
SET 
  cleaning_status = 'scheduled',
  updated_at = NOW()
WHERE 
  service_type = 'CLEANING' 
  AND cleaning_status IS NULL;

-- Create trigger function
CREATE OR REPLACE FUNCTION set_default_cleaning_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.service_type = 'CLEANING' AND NEW.cleaning_status IS NULL THEN
    NEW.cleaning_status := 'scheduled';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_set_default_cleaning_status
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_default_cleaning_status();
```

### 2. Order Creation API Fix (app/api/orders/route.ts)

Updated the POST endpoint to explicitly set `cleaning_status` for cleaning orders:

```typescript
// Set cleaning_status for cleaning orders
if (params.service_type === 'CLEANING') {
  orderData.cleaning_status = 'scheduled'
}
```

This ensures that:
- All new cleaning orders get `cleaning_status = 'scheduled'` immediately
- The UI will display the correct status badge
- The cleaning-specific status system works as designed

### 3. Migration Script (scripts/run-migration-028.js)

Created an automated script to:
- Execute the migration SQL
- Verify the results
- Provide clear feedback on success/failure
- Guide manual migration if needed

## Deployment Steps

### Option A: Using Supabase SQL Editor (Recommended for Production)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/028_fix_cleaning_status_defaults.sql`
4. Paste and execute the SQL
5. Verify:
   ```sql
   -- Check that all cleaning orders have cleaning_status
   SELECT COUNT(*) FROM orders 
   WHERE service_type = 'CLEANING' AND cleaning_status IS NULL;
   -- Should return 0
   
   -- Check the trigger exists
   SELECT trigger_name FROM information_schema.triggers 
   WHERE trigger_name = 'trigger_set_default_cleaning_status';
   -- Should return 1 row
   ```

### Option B: Using Migration Script (Development/Testing)

1. Ensure environment variables are set in `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   ```

2. Run the migration script:
   ```bash
   node scripts/run-migration-028.js
   ```

3. Review the output for any errors

### Post-Deployment Verification

1. **Check existing cleaning orders**:
   - Navigate to the admin orders page
   - Filter by service type "Cleaning"
   - Verify orders show "Scheduled" instead of "Pending Pickup"

2. **Test new order creation**:
   - Create a new cleaning order through the booking flow
   - Verify it shows "Scheduled" status immediately
   - Check the database to confirm `cleaning_status` is set

3. **Monitor logs**:
   - Check application logs for any errors related to order creation
   - Verify the trigger is working by checking new order records

## Testing Checklist

- [ ] Run migration 028 in development environment
- [ ] Verify existing cleaning orders have `cleaning_status` set
- [ ] Create a new cleaning order and verify it has `cleaning_status = 'scheduled'`
- [ ] Check that the order displays "Scheduled" badge in the UI
- [ ] Verify the trigger exists in the database
- [ ] Test the full cleaning order workflow (scheduled → in_service → completed)
- [ ] Run migration 028 in staging environment
- [ ] Run migration 028 in production environment
- [ ] Monitor production for 24h after deployment

## Rollback Plan

If issues arise, you can rollback the trigger (but keep the data updates):

```sql
-- Remove the trigger
DROP TRIGGER IF EXISTS trigger_set_default_cleaning_status ON orders;

-- Remove the function
DROP FUNCTION IF EXISTS set_default_cleaning_status();

-- Note: Don't rollback the data updates as they fix the display issue
```

## Related Files

- Migration: `supabase/migrations/028_fix_cleaning_status_defaults.sql`
- Script: `scripts/run-migration-028.js`
- API Fix: `app/api/orders/route.ts`
- Status System: `lib/cleaningStatus.ts`
- UI Component: `components/cleaning/CleaningStatusBadge.tsx`

## Future Considerations

1. **Add database constraint**: Consider adding a CHECK constraint to ensure cleaning orders always have cleaning_status set
2. **Audit other APIs**: Check if other order creation flows (recurring orders, admin-created orders) need similar fixes
3. **Update tests**: Add tests to verify cleaning_status is always set for new cleaning orders
4. **Documentation**: Update API documentation to reflect the cleaning_status field requirement

## Success Metrics

After deployment, you should see:
- 0 cleaning orders with NULL cleaning_status
- All cleaning orders displaying appropriate status badges
- No "Pending Pickup" status for cleaning orders
- Trigger automatically setting cleaning_status for new orders

---

**Date Created**: October 8, 2025  
**Migration Version**: 028  
**Status**: Ready for Deployment
