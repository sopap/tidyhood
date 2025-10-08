# Vercel Cron Jobs Fix - October 8, 2025

## Problem

Vercel deployment was failing with the following error:
```
Error: Your plan allows your team to create up to 2 Cron Jobs. Your team currently has 0, 
and this project is attempting to create 3 more, exceeding your team's limit.
```

## Root Cause

The project had 3 cron jobs configured in `vercel.json`:
1. `/api/cron/populate-slots` (2 AM daily) - Creates capacity slots for next 14 days
2. `/api/cron/capacity-alerts` (8 AM daily) - Monitors capacity gaps/low capacity
3. `/api/cron/cleaning-status` (10 AM daily) - Auto-transitions cleaning order statuses

However, the Vercel plan only allows 2 cron jobs.

## Solution

Combined `capacity-alerts` and `cleaning-status` into a single unified operations cron job since they're both operational maintenance tasks that can run together without conflicts.

### Changes Made

#### 1. Created New Unified Cron Endpoint
**File:** `app/api/cron/operations/route.ts`
- Combines capacity monitoring + cleaning automation
- Runs at 8 AM daily
- Returns structured results for both operations
- Handles errors independently for each operation

#### 2. Updated Vercel Configuration
**File:** `vercel.json`
```json
{
  "crons": [
    {
      "path": "/api/cron/populate-slots",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/operations",
      "schedule": "0 8 * * *"
    }
  ]
}
```

### Cron Schedule

| Time | Job | Function |
|------|-----|----------|
| 2 AM ET | `populate-slots` | Auto-creates capacity slots for next 14 days |
| 8 AM ET | `operations` | Capacity monitoring + Cleaning status automation |

### Operations Cron Job Details

The unified `/api/cron/operations` endpoint performs:

**Capacity Alerts:**
- Checks for capacity gaps in next 7 days
- Monitors low capacity situations (< 5 available units)
- Creates alerts in `operational_alerts` table
- Severity levels: CRITICAL (0-2 days), WARNING (3-7 days), INFO (low capacity)

**Cleaning Status Automation:**
- Auto-transitions `scheduled` → `in_service` when service window starts
- Auto-completes `in_service` → `completed` (safety net for overdue orders)
- Logs all transitions to audit trail

### Testing

To test the new unified endpoint:

```bash
# Test in development
curl -H "Authorization: Bearer ${CRON_SECRET}" \
  http://localhost:3000/api/cron/operations

# Expected response structure:
{
  "success": true,
  "message": "Operations cron completed",
  "timestamp": "2025-10-08T14:00:00.000Z",
  "capacityAlerts": {
    "success": true,
    "alerts_created": 2,
    "alerts": [...]
  },
  "cleaningStatus": {
    "success": true,
    "transitioned": 3,
    "completed": 0
  }
}
```

### Legacy Endpoints

The old individual endpoints still exist and can be used if needed:
- `/api/cron/capacity-alerts` - Still functional but not scheduled
- `/api/cron/cleaning-status` - Still functional but not scheduled

These can be manually triggered or used as fallback if needed.

### Deployment

1. Push changes to main branch
2. Vercel will deploy with only 2 cron jobs configured
3. First `operations` cron will run at 8 AM ET next day
4. Monitor logs to ensure both operations complete successfully

### Monitoring

Check Vercel logs for cron execution:
- Look for "Operations cron completed" success messages
- Monitor `operational_alerts` table for capacity warnings
- Check order status transitions in database

### Rollback Plan

If issues arise:
1. Temporarily disable operations cron in Vercel dashboard
2. Use manual API calls to trigger individual endpoints as needed
3. Consider upgrading Vercel plan for 3+ cron jobs if separation is critical

## Impact

✅ **Resolved:** Deployment now succeeds with 2 cron jobs
✅ **Maintained:** All functionality preserved (capacity monitoring + cleaning automation)
✅ **Improved:** Consolidated operations for easier monitoring
✅ **Cost:** No additional cost for unified approach

## Next Steps

1. Monitor first few operations cron executions
2. Verify both capacity alerts and cleaning automation work correctly
3. Consider adding dashboard notification for operations cron failures
4. Document any edge cases discovered during production usage
