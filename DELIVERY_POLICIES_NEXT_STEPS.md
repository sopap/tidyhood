# Delivery Time Policies - Immediate Next Steps

## Current Status: Phase 2 Complete ✅
- ✅ Database migration created (`034_delivery_time_policies.sql`)
- ✅ API endpoints created (GET and PUT)
- ✅ Implementation guide documented

## Phase 3: Core Logic Updates - ACTION PLAN

### Step 1: Before You Begin
**Run the migration first to create the database tables:**

```bash
# Option A: Via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Paste contents of supabase/migrations/034_delivery_time_policies.sql
# 3. Execute

# Option B: Via script (if you have one set up)
npm run migrate:up
```

**Verify migration:**
```sql
SELECT * FROM delivery_time_policies WHERE active = true;
-- Should show 2 rows (LAUNDRY and CLEANING) with default values
```

---

### Step 2: Update `lib/timezone.ts`

**Current Hardcoded Values:**
```typescript
// Line ~XX: Standard minimum = 48 hours
// Line ~XX: Rush cutoff = 11 AM  
// Line ~XX: Rush early pickup = 0 hours (same-day)
// Line ~XX: Rush late pickup = 24 hours
```

**Add these at the top of the file:**

```typescript
import { getServiceClient } from './db'

// Cache to avoid repeated DB calls
let policyCache: Record<string, any> = {}
let cacheExpiry = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getDeliveryPolicy(serviceType: 'LAUNDRY' | 'CLEANING') {
  const now = Date.now()
  
  // Return cached if still valid
  if (policyCache[serviceType] && now < cacheExpiry) {
    return policyCache[serviceType]
  }
  
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('delivery_time_policies')
      .select('*')
      .eq('service_type', serviceType)
      .eq('active', true)
      .single()
    
    if (error || !data) {
      console.warn(`Using fallback delivery policy for ${serviceType}`, error)
      return getFallbackPolicy()
    }
    
    // Cache the result
    policyCache[serviceType] = data
    cacheExpiry = now + CACHE_TTL
    
    return data
  } catch (err) {
    console.error('Error fetching delivery policy:', err)
    return getFallbackPolicy()
  }
}

function getFallbackPolicy() {
  return {
    standard_minimum_hours: 48,
    rush_enabled: true,
    rush_early_pickup_hours: 0,
    rush_late_pickup_hours: 24,
    rush_cutoff_hour: 11,
    same_day_earliest_hour: 18
  }
}
```

**Update the function signature:**

```typescript
// FROM:
export function getMinimumDeliveryDate(
  pickupSlotEnd: string,
  isRush: boolean
): string

// TO:
export async function getMinimumDeliveryDate(
  pickupSlotEnd: string,
  isRush: boolean,
  serviceType: 'LAUNDRY' | 'CLEANING' = 'LAUNDRY'
): Promise<string>
```

**Replace hardcoded values inside the function:**

1. Find where `48` is used for standard hours → Replace with `policy.standard_minimum_hours`
2. Find where `11` is used for cutoff hour → Replace with `policy.rush_cutoff_hour`
3. Find where `0` is used for early pickup → Replace with `policy.rush_early_pickup_hours`
4. Find where `24` is used for late pickup → Replace with `policy.rush_late_pickup_hours`

Add at the start of the function:
```typescript
const policy = await getDeliveryPolicy(serviceType)
```

---

### Step 3: Update `lib/slots.ts`

**Update the wrapper function:**

```typescript
// FROM:
export function getMinimumDeliveryDate(
  pickupSlotEnd: string,
  isRush: boolean
): string {
  return getMinimumDeliveryDateTZ(pickupSlotEnd, isRush);
}

// TO:
export async function getMinimumDeliveryDate(
  pickupSlotEnd: string,
  isRush: boolean,
  serviceType: 'LAUNDRY' | 'CLEANING' = 'LAUNDRY'
): Promise<string> {
  return await getMinimumDeliveryDateTZ(pickupSlotEnd, isRush, serviceType);
}
```

**Update `findEarliestDeliverySlot`:**

```typescript
// FROM:
export function findEarliestDeliverySlot<T extends { slot_start: string }>(
  slots: T[],
  pickupSlotEnd: string,
  isRush: boolean
): T | null

// TO:
export async function findEarliestDeliverySlot<T extends { slot_start: string }>(
  slots: T[],
  pickupSlotEnd: string,
  isRush: boolean,
  serviceType: 'LAUNDRY' | 'CLEANING' = 'LAUNDRY'
): Promise<T | null>
```

Inside the function:
1. Add `const policy = await getDeliveryPolicy(serviceType)` at the top
2. Replace hardcoded `18` → `policy.same_day_earliest_hour`
3. Replace hardcoded `11` → `policy.rush_cutoff_hour`
4. Replace other hardcoded values with policy equivalents

---

### Step 4: Find and Update All Calling Code

**Search for all usages:**
```bash
# In your terminal
grep -r "getMinimumDeliveryDate\|findEarliestDeliverySlot" \
  --include="*.ts" --include="*.tsx" \
  app/ components/ lib/ \
  | grep -v "export function" \
  | grep -v "export async function"
```

**For each file found:**

1. Make the parent function `async` if it isn't already
2. Add `await` before the function call
3. Pass the `serviceType` parameter ('LAUNDRY' or 'CLEANING')

Example transformation:
```typescript
// BEFORE:
function calculateDelivery(pickup: string, rush: boolean) {
  const minDate = getMinimumDeliveryDate(pickup, rush)
  return minDate
}

// AFTER:
async function calculateDelivery(pickup: string, rush: boolean, serviceType: 'LAUNDRY' | 'CLEANING') {
  const minDate = await getMinimumDeliveryDate(pickup, rush, serviceType)
  return minDate
}
```

---

### Step 5: Test with Default Values

**Critical:** Test that behavior hasn't changed with default database values.

1. Create a test order (regular)
2. Verify delivery slots shown match current behavior
3. Create a rush order (pickup ≤11 AM)
4. Verify same-day evening slots appear
5. Create a rush order (pickup >11 AM)
6. Verify next-day slots appear

---

### Step 6: Test with Modified Values

1. Via API or SQL, update a policy:
   ```sql
   UPDATE delivery_time_policies
   SET standard_minimum_hours = 72
   WHERE service_type = 'LAUNDRY';
   ```

2. Wait 5 minutes (cache TTL) or restart server

3. Create new order and verify 72-hour minimum is enforced

---

## Common Pitfalls to Avoid

1. **Forgetting `await`** - The functions are now async, every call needs `await`
2. **Not making parent async** - If a function calls these, it must be async too
3. **Missing serviceType** - Always pass 'LAUNDRY' or 'CLEANING'
4. **Cache confusion** - Remember: 5-minute cache, or restart to clear

---

## Files That Will Likely Need Updates

Based on project structure, these files probably call the functions:
- `app/api/slots/route.ts`
- `app/api/orders/route.ts`
- `components/booking/SlotPicker.tsx`
- Any file that handles delivery slot selection

Search for them to confirm.

---

## Rollback Plan

If issues arise:

1. **Revert the code changes** (git revert)
2. **Database stays** - Tables are backward compatible
3. **No data loss** - Default values match old hardcoded logic

---

## After Step 6 is Complete

You'll be ready for:
- **Phase 4:** Build the admin UI for visual policy editing
- **Phase 5:** Write comprehensive tests

Refer to `DELIVERY_TIME_POLICIES_IMPLEMENTATION.md` for full UI design specs.

---

## Questions?

If you encounter TypeScript errors about async/await, remember:
- React Server Components: Can be async ✅
- React Client Components: Cannot be async ❌ (move logic to server action)
- API Route Handlers: Can be async ✅

Good luck! 🚀
