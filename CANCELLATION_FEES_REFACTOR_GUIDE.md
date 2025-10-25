# Cancellation Fees Refactor Guide

## Overview

Refactoring `lib/cancellationFees.ts` to read from database instead of hardcoded values. This enables admin to configure policies without code changes.

**CRITICAL**: This refactor changes `getCancellationPolicy` from sync to async, which affects all callers.

---

## Current Issues (Lines to Fix)

### Hardcoded Values
- **Line 95**: `const feePercent = 0.15` ❌ HARDCODED
- **Line 97**: `const withinNoticeWindow = hoursUntilSlot >= 24` ❌ HARDCODED
- **Line 109**: `noticeHours: 24` ❌ HARDCODED

### Missing Fields
- Order interface doesn't include `policy_id`
- CancellationPolicy doesn't include `policyVersion`

---

## Step 1: Update Interfaces

```typescript
// Add policy_id to Order interface
export interface Order {
  id: string
  user_id: string | null  // ← Make nullable for guest orders
  service_type: 'LAUNDRY' | 'CLEANING'
  status: string
  slot_start: string
  slot_end: string
  total_cents: number
  paid_at?: string
  payment_id?: string
  partner_id: string
  policy_id: string | null  // ← ADD THIS (FK to cancellation_policies)
}

// Add policyVersion to CancellationPolicy interface
export interface CancellationPolicy {
  canCancel: boolean
  canReschedule: boolean
  requiresNotice: boolean
  noticeHours: number
  cancellationFee: number
  rescheduleFee: number
  refundAmount: number
  policyVersion?: number  // ← ADD THIS
  reason?: string
}
```

---

## Step 2: Add Database Import

```typescript
import { getServiceClient } from '@/lib/db'
```

---

## Step 3: Create getDefaultPolicy Helper

```typescript
/**
 * Get default fallback policy for orders without policy_id (pre-migration 035)
 * Uses hardcoded values that match original business logic
 */
function getDefaultPolicy(serviceType: 'LAUNDRY' | 'CLEANING'): {
  noticeHours: number
  cancellationFeePercent: number
  rescheduleFeePercent: number
  allowCancellation: boolean
  allowRescheduling: boolean
} {
  if (serviceType === 'LAUNDRY') {
    return {
      noticeHours: 0,
      cancellationFeePercent: 0,
      rescheduleFeePercent: 0,
      allowCancellation: true,
      allowRescheduling: true,
    }
  }
  
  // CLEANING defaults
  return {
    noticeHours: 24,
    cancellationFeePercent: 0.15,  // 15%
    rescheduleFeePercent: 0,
    allowCancellation: true,
    allowRescheduling: true,
  }
}
```

---

## Step 4: Refactor getCancellationPolicy to Async

```typescript
/**
 * Calculate comprehensive cancellation policy for an order
 * Reads from database using policy locked at booking time
 */
export async function getCancellationPolicy(order: Order): Promise<CancellationPolicy> {
  const now = new Date()
  const slotTime = new Date(order.slot_start)
  const hoursUntilSlot = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  // Check if order status allows modifications
  const canModify = MODIFIABLE_STATUSES.includes(order.status.toLowerCase())
  
  if (!canModify) {
    return {
      canCancel: false,
      canReschedule: false,
      requiresNotice: false,
      noticeHours: 0,
      cancellationFee: 0,
      rescheduleFee: 0,
      refundAmount: 0,
      reason: `Cannot modify order in ${order.status} status`
    }
  }
  
  // Check if service time has passed
  if (hoursUntilSlot < 0) {
    return {
      canCancel: false,
      canReschedule: false,
      requiresNotice: true,
      noticeHours: 24,
      cancellationFee: 0,
      rescheduleFee: 0,
      refundAmount: 0,
      reason: 'Service time has passed'
    }
  }
  
  // Fetch policy from database (policy locked at booking time)
  let policyData
  let policyVersion
  
  if (order.policy_id) {
    const db = getServiceClient()
    const { data: policy, error } = await db
      .from('cancellation_policies')
      .select('*')
      .eq('id', order.policy_id)
      .single()
    
    if (error || !policy) {
      console.warn(`[getCancellationPolicy] Policy ${order.policy_id} not found for order ${order.id}, using defaults`)
      policyData = getDefaultPolicy(order.service_type)
      policyVersion = undefined
    } else {
      policyData = {
        noticeHours: policy.notice_hours,
        cancellationFeePercent: policy.cancellation_fee_percent,
        rescheduleFeePercent: policy.reschedule_fee_percent,
        allowCancellation: policy.allow_cancellation,
        allowRescheduling: policy.allow_rescheduling,
      }
      policyVersion = policy.version
    }
  } else {
    // Old orders without policy_id (pre-migration 035)
    console.warn(`[getCancellationPolicy] No policy_id for order ${order.id}, using defaults`)
    policyData = getDefaultPolicy(order.service_type)
    policyVersion = undefined
  }
  
  // Calculate using database values (NOT hardcoded)
  const withinNoticeWindow = hoursUntilSlot >= policyData.noticeHours
  
  // LAUNDRY - always free to modify (no payment yet)
  if (order.service_type === 'LAUNDRY') {
    return {
      canCancel: policyData.allowCancellation,
      canReschedule: policyData.allowRescheduling,
      requiresNotice: policyData.noticeHours > 0,
      noticeHours: policyData.noticeHours,
      cancellationFee: 0,
      rescheduleFee: 0,
      refundAmount: 0, // No refund because no payment made yet
      policyVersion,
      reason: 'Free cancellation/rescheduling for unpaid laundry orders'
    }
  }
  
  // CLEANING - calculate using database values
  const cancellationFee = withinNoticeWindow 
    ? 0 
    : Math.round(order.total_cents * policyData.cancellationFeePercent)
  
  const rescheduleFee = withinNoticeWindow
    ? 0
    : Math.round(order.total_cents * policyData.rescheduleFeePercent)
  
  if (!withinNoticeWindow) {
    // Within notice window - can cancel with fee, may not reschedule
    return {
      canCancel: policyData.allowCancellation,
      canReschedule: false, // Too late to reschedule
      requiresNotice: true,
      noticeHours: policyData.noticeHours,
      cancellationFee,
      rescheduleFee: 0,
      refundAmount: order.total_cents - cancellationFee,
      policyVersion,
      reason: `Cancellations within ${policyData.noticeHours} hours incur a ${Math.round(policyData.cancellationFeePercent * 100)}% fee. Rescheduling not available.`
    }
  }
  
  // Sufficient notice - both cancel and reschedule are free
  return {
    canCancel: policyData.allowCancellation,
    canReschedule: policyData.allowRescheduling,
    requiresNotice: policyData.noticeHours > 0,
    noticeHours: policyData.noticeHours,
    cancellationFee: 0,
    rescheduleFee: 0,
    refundAmount: order.total_cents,
    policyVersion,
    reason: `Free rescheduling and cancellation with ${policyData.noticeHours}+ hours notice.`
  }
}
```

---

## Step 5: Update validateModification to Async

```typescript
/**
 * Validate that a cancellation/reschedule is allowed
 * Throws error if not allowed
 */
export async function validateModification(
  order: Order,
  modificationType: 'cancel' | 'reschedule'
): Promise<void> {  // ← Now returns Promise
  const policy = await getCancellationPolicy(order)  // ← Now awaits
  
  if (modificationType === 'cancel' && !policy.canCancel) {
    throw new Error(policy.reason || 'Cannot cancel this order')
  }
  
  if (modificationType === 'reschedule' && !policy.canReschedule) {
    throw new Error(policy.reason || 'Cannot reschedule this order')
  }
}
```

---

## Step 6: Update All Callers

### Files that import getCancellationPolicy:

1. **components/order/CancelModal.tsx**
2. **components/order/RescheduleModal.tsx**
3. **components/cleaning/CancelCleaningModal.tsx**
4. **components/cleaning/RescheduleCleaningModal.tsx**
5. **app/api/orders/[id]/cancel/route.ts**
6. **app/api/orders/[id]/reschedule/route.ts**

### Update Pattern:

```typescript
// BEFORE (sync)
const policy = getCancellationPolicy(order)

// AFTER (async)
const policy = await getCancellationPolicy(order)
```

### Search for callers:

```bash
# Find all files that call getCancellationPolicy
grep -r "getCancellationPolicy" --include="*.ts" --include="*.tsx" app/ components/
```

---

## Step 7: Update Tests

Create `lib/__tests__/cancellationFees.test.ts`:

```typescript
import { getCancellationPolicy, validateModification } from '../cancellationFees'
import { getServiceClient } from '../db'

// Mock the database client
jest.mock('../db', () => ({
  getServiceClient: jest.fn()
}))

describe('getCancellationPolicy', () => {
  const mockOrder = {
    id: 'order_123',
    user_id: 'user_123',
    service_type: 'CLEANING' as const,
    status: 'pending',
    slot_start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours from now
    slot_end: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
    total_cents: 15000,
    partner_id: 'partner_123',
    policy_id: 'policy_123',
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('uses database policy values not hardcoded', async () => {
    const mockPolicy = {
      id: 'policy_123',
      version: 2,
      notice_hours: 48,
      cancellation_fee_percent: 0.20,
      reschedule_fee_percent: 0.10,
      allow_cancellation: true,
      allow_rescheduling: true,
    }
    
    ;(getServiceClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockPolicy, error: null })
          })
        })
      })
    })
    
    const policy = await getCancellationPolicy(mockOrder)
    
    // Should use database values, NOT hardcoded 0.15 or 24
    expect(policy.noticeHours).toBe(48)
    expect(policy.cancellationFee).toBe(0) // Within notice window
    expect(policy.policyVersion).toBe(2)
  })
  
  it('handles missing policy_id gracefully (old orders)', async () => {
    const orderWithoutPolicy = { ...mockOrder, policy_id: null }
    
    const policy = await getCancellationPolicy(orderWithoutPolicy)
    
    // Should not throw, should use defaults
    expect(policy).toBeDefined()
    expect(policy.noticeHours).toBe(24) // Default for CLEANING
  })
  
  it('respects policy locked at booking time', async () => {
    const mockPolicy = {
      id: 'policy_123',
      version: 1,
      notice_hours: 24,
      cancellation_fee_percent: 0.15,
      reschedule_fee_percent: 0,
      allow_cancellation: true,
      allow_rescheduling: true,
    }
    
    ;(getServiceClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockPolicy, error: null })
          })
        })
      })
    })
    
    const policy = await getCancellationPolicy(mockOrder)
    
    // Even if admin changed policy to version 2, order should use locked version 1
    expect(policy.policyVersion).toBe(1)
  })
  
  it('calculates fees within notice window correctly', async () => {
    const orderSoon = {
      ...mockOrder,
      slot_start: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
    }
    
    const mockPolicy = {
      id: 'policy_123',
      version: 1,
      notice_hours: 24,
      cancellation_fee_percent: 0.15,
      reschedule_fee_percent: 0,
      allow_cancellation: true,
      allow_rescheduling: true,
    }
    
    ;(getServiceClient as jest.Mock).mockReturnValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: mockPolicy, error: null })
          })
        })
      })
    })
    
    const policy = await getCancellationPolicy(orderSoon)
    
    // Within 24 hours: should charge 15% fee
    expect(policy.cancellationFee).toBe(2250) // 15000 * 0.15
    expect(policy.refundAmount).toBe(12750) // 15000 - 2250
    expect(policy.canReschedule).toBe(false) // Too late
  })
})
```

---

## Migration Checklist

- [ ] Update Order interface to include `policy_id: string | null`
- [ ] Update CancellationPolicy interface to include `policyVersion?: number`
- [ ] Add database import: `getServiceClient`
- [ ] Create `getDefaultPolicy` helper function
- [ ] Refactor `getCancellationPolicy` to async
- [ ] Remove hardcoded values (0.15, 24)
- [ ] Update `validateModification` to async
- [ ] Search and update all callers to await
- [ ] Update components that use getCancellationPolicy
- [ ] Update API routes that use getCancellationPolicy
- [ ] Create unit tests
- [ ] Run existing tests to ensure no regressions
- [ ] Test with old orders (policy_id = null)
- [ ] Test with database policies
- [ ] Verify policy locking works (old version stays even if admin updates)

---

## Testing Strategy

### Unit Tests
```bash
npm test lib/__tests__/cancellationFees.test.ts
```

### Integration Tests
1. Create order with policy_id set
2. Admin updates policy to new version
3. Verify order still uses original policy version
4. Test cancellation fee calculation matches database values

### Manual Testing
1. Test old order (policy_id = null) - should use defaults
2. Test new order with policy - should use database values
3. Test within notice window - should charge fee
4. Test outside notice window - should be free
5. Verify admin can change policies without code changes

---

## Rollback Plan

If issues arise:
1. Revert `lib/cancellationFees.ts` to previous version
2. Revert all caller updates
3. Policy system still works (just not used yet)
4. No database rollback needed

---

## Performance Considerations

- **Database Query**: Adds one query per cancellation policy check
- **Caching**: Consider caching policies by ID (they rarely change)
- **Optimization**: Policy is already loaded with order in many cases

---

## Benefits After Refactor

✅ No more hardcoded values  
✅ Admin can configure policies without code deployment  
✅ Policy versioning works correctly  
✅ Old orders gracefully handled  
✅ Compliant with regulatory requirements (policy locking)  

---

**Status**: Ready for implementation after Migration 035 is applied.
