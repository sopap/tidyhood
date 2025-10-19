# Configurable Delivery Time Policies - Implementation Guide

## Overview
Making delivery slot selection logic configurable through admin settings instead of hardcoded values.

## Current Status: Phase 2 Complete (API Endpoints)

### ✅ Completed

#### Phase 1: Database Schema
**File:** `supabase/migrations/034_delivery_time_policies.sql`

- Tables created:
  - `delivery_time_policies` - Active policies for each service type
  - `delivery_time_policy_history` - Audit trail
- Default values match current hardcoded logic:
  - Standard: 48 hours
  - Rush early pickup: 0 hours (same-day allowed)
  - Rush late pickup: 24 hours
  - Rush cutoff: 11 AM
  - Same-day earliest: 6 PM (18:00)
- Full audit trail with change tracking
- RLS policies for admin-only access

#### Phase 2: API Endpoints  
**Files:**
- `app/api/admin/settings/delivery-policies/route.ts` - GET all policies
- `app/api/admin/settings/delivery-policies/[service_type]/route.ts` - PUT update policy

**Features:**
- Admin authentication required
- Full validation (hours 0-23, minimum hours 0-168)
- Comprehensive error handling
- Returns updated policy after save

---

## 🚧 Phase 3: Core Logic Updates (NEXT - CRITICAL)

### Breaking Changes Warning
⚠️ This phase makes several synchronous functions async, requiring updates to all calling code.

### Files to Update

#### 3.1 lib/timezone.ts

**Add Function:**
```typescript
// Cache policies to avoid repeated DB calls
let policyCache: Record<string, any> = {}
let cacheExpiry = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getDeliveryPolicy(serviceType: 'LAUNDRY' | 'CLEANING') {
  const now = Date.now()
  
  if (policyCache[serviceType] && now < cacheExpiry) {
    return policyCache[serviceType]
  }
  
  const db = getServiceClient()
  const { data, error } = await db
    .from('delivery_time_policies')
    .select('*')
    .eq('service_type', serviceType)
    .eq('active', true)
    .single()
  
  if (error || !data) {
    console.warn('Using fallback delivery policy', error)
    return {
      standard_minimum_hours: 48,
      rush_enabled: true,
      rush_early_pickup_hours: 0,
      rush_late_pickup_hours: 24,
      rush_cutoff_hour: 11,
      same_day_earliest_hour: 18
    }
  }
  
  policyCache[serviceType] = data
  cacheExpiry = now + CACHE_TTL
  
  return data
}
```

**Update Function:**
```typescript
// Change signature from:
export function getMinimumDeliveryDate(
  pickupSlotEnd: string,
  isRush: boolean
): string

// To:
export async function getMinimumDeliveryDate(
  pickupSlotEnd: string,
  isRush: boolean,
  serviceType: 'LAUNDRY' | 'CLEANING' = 'LAUNDRY'
): Promise<string>

// Inside function:
const policy = await getDeliveryPolicy(serviceType)

// Replace hardcoded values with policy values:
// - 48 → policy.standard_minimum_hours
// - 11 → policy.rush_cutoff_hour
// - 0 → policy.rush_early_pickup_hours  
// - 24 → policy.rush_late_pickup_hours
```

#### 3.2 lib/slots.ts

**Update Function:**
```typescript
// Change signature from:
export function findEarliestDeliverySlot<T extends { slot_start: string }>(
  slots: T[],
  pickupSlotEnd: string,
  isRush: boolean
): T | null

// To:
export async function findEarliestDeliverySlot<T extends { slot_start: string }>(
  slots: T[],
  pickupSlotEnd: string,
  isRush: boolean,
  serviceType: 'LAUNDRY' | 'CLEANING' = 'LAUNDRY'
): Promise<T | null>

// Inside function:
const policy = await getDeliveryPolicy(serviceType)

// Replace hardcoded values:
// - 18 → policy.same_day_earliest_hour
// - 11 → policy.rush_cutoff_hour
// - 0 → policy.rush_early_pickup_hours
// - 24 → policy.rush_late_pickup_hours
// - 48 → policy.standard_minimum_hours
```

#### 3.3 Update All Calling Code

**Files that call these functions (need to be updated):**
- Any component/API that calls `getMinimumDeliveryDate()`
- Any component/API that calls `findEarliestDeliverySlot()`
- Search codebase for usage: `grep -r "getMinimumDeliveryDate\|findEarliestDeliverySlot" --include="*.ts" --include="*.tsx"`

**Changes needed:**
```typescript
// Before:
const minDate = getMinimumDeliveryDate(pickupEnd, isRush)
const slot = findEarliestDeliverySlot(slots, pickupEnd, isRush)

// After:
const minDate = await getMinimumDeliveryDate(pickupEnd, isRush, 'LAUNDRY')
const slot = await findEarliestDeliverySlot(slots, pickupEnd, isRush, 'LAUNDRY')
```

---

## 📱 Phase 4: Mobile-First Admin UI

### Design Principles
- Mobile-first: Works perfectly on 320px+ screens
- Visual controls: Sliders, toggles, time pickers
- Real-time preview: Show impact of changes
- Inline validation: Helpful error messages
- Bottom sheet pattern on mobile

### 4.1 Component Structure

Create new components:
```
components/admin/
  DeliveryPolicyCard.tsx       // Main policy display card
  PolicyEditor.tsx              // Edit mode with form controls
  TimeSlider.tsx                // Visual hour slider (24-72h)
  ScenarioPreview.tsx           // Live examples of slot selection
```

### 4.2 UI Layout

**Desktop (≥1024px):**
- Side-by-side cards (Laundry | Cleaning)
- Inline editing
- Full explanatory text

**Mobile (<768px):**
- Swipeable tabs between services
- Bottom sheet modal for editing
- Sticky save/cancel buttons
- Large tap targets (44px min)

### 4.3 Key Features

**Visual Time Slider:**
```
┌─────────────────────────────┐
│ Standard Delivery Time      │
│                             │
│  [◄] [48 hours] [►]        │
│  ━━━━━━●━━━━━━━━           │
│  24h    48h    72h          │
│                             │
│  📦 Wed, Oct 22 delivery    │
└─────────────────────────────┘
```

**Rush Service Toggle:**
```
┌─────────────────────────────┐
│ ⚡ Rush Service [🟢 ON]     │
│                             │
│ ▼ Early Pickup (≤11 AM)    │
│   Same-day (evening only)   │
│                             │
│ ▼ Late Pickup (>11 AM)     │
│   Next-day (24h)            │
└─────────────────────────────┘
```

**Live Examples:**
```
┌─────────────────────────────┐
│ 📝 Example Scenarios        │
│                             │
│ Pickup: Mon 8-10 AM         │
│ └─ Earliest: Mon 6 PM ✓     │
│                             │
│ Pickup: Mon 2-4 PM          │
│ └─ Earliest: Tue 2 PM ✓     │
└─────────────────────────────┘
```

### 4.4 Integration into Admin Settings

**File:** `app/admin/settings/page.tsx`

Add new tab: "Delivery Time Policies"

Position: Between "Cancellation Policies" and "Change History"

---

## 🧪 Phase 5: Testing & Validation

### 5.1 Unit Tests
```typescript
// lib/__tests__/deliveryPolicies.test.ts
describe('Policy-driven slot selection', () => {
  test('uses database policy values')
  test('falls back to defaults on DB error')
  test('respects cache TTL')
  test('calculates earliest slots correctly')
})
```

### 5.2 Integration Tests
```typescript
// __tests__/api/delivery-policies.api.spec.ts
describe('Delivery Policy API', () => {
  test('GET /api/admin/settings/delivery-policies')
  test('PUT /api/admin/settings/delivery-policies/LAUNDRY')
  test('validates hour ranges')
  test('requires admin auth')
})
```

### 5.3 Manual Testing Checklist

**With Default Values:**
- [ ] Verify slot selection matches current behavior exactly
- [ ] Check both LAUNDRY and CLEANING services
- [ ] Test standard and rush orders
- [ ] Test early vs late pickups

**With Modified Values:**
- [ ] Change standard hours to 72 - verify slots update
- [ ] Change rush cutoff to 2 PM - verify qualification changes
- [ ] Disable rush - verify rush unavailable
- [ ] Change same-day hour to 8 PM - verify evening slots update

**Mobile Testing:**
- [ ] Test on iOS Safari (real device)
- [ ] Test on Android Chrome (real device)
- [ ] Verify swipe gestures work
- [ ] Check tap targets (44px min)
- [ ] Test landscape orientation

---

## 🚀 Deployment Steps

### 1. Run Migration
```bash
# In production Supabase dashboard
# Navigate to: SQL Editor
# Paste contents of: supabase/migrations/034_delivery_time_policies.sql
# Execute migration
```

### 2. Verify Default Values
```sql
SELECT * FROM delivery_time_policies WHERE active = true;
-- Should return 2 rows (LAUNDRY and CLEANING) with default values
```

### 3. Deploy Code
```bash
git add .
git commit -m "feat: configurable delivery time policies"
git push origin main
# Vercel will auto-deploy
```

### 4. Cache Warming
After deployment, make a test API call to warm the cache:
```bash
curl https://yourdomain.com/api/admin/settings/delivery-policies
```

### 5. Monitor
- Check Vercel logs for any errors
- Verify slot selection works correctly
- Monitor Supabase for query performance

---

## 🔄 Rollback Plan

If issues arise, rollback steps:

1. **Revert code deployment** (via Vercel dashboard)
2. **Database stays** (default values match old hardcoded logic)
3. **No data loss** (policies table can remain)

---

## 📊 Impact Analysis

### Performance
- **Cache:** 5-minute TTL reduces DB queries significantly
- **First call:** ~100ms (DB query)
- **Cached calls:** <1ms
- **Overall impact:** Negligible

### Backward Compatibility
- ✅ Default values match current behavior exactly
- ✅ Fallback to hardcoded defaults if DB fails
- ✅ No breaking changes for end users

### Benefits
- Real-time policy updates without code deployment
- A/B testing different timing strategies
- Seasonal adjustments (holidays, peak times)
- Service-specific optimization

---

## 📝 Notes

- **Cache invalidation:** Clear automatically after 5 minutes
- **Manual cache clear:** Restart server or update `cacheExpiry = 0`
- **Multi-region:** Each region has its own cache
- **Security:** Admin-only via RLS and `requireAdmin()`

---

## Next Steps for Developer

Current phase: **Need to decide**

Options:
1. **Continue with Phase 3** - Update core logic (breaking changes, requires careful testing)
2. **Skip to Phase 4** - Build UI first (can test with API calls manually)
3. **Run migration first** - Test database and APIs before touching core logic

Recommended: **Option 1** (Phase 3) - Update core logic so everything is functional, then build UI.
