# Laundry Status Audit Report
**Date:** October 9, 2025  
**Scope:** Status handling for laundry orders in Admin Panel, Orders List, and Order Detail pages

## Executive Summary

The codebase has a **service-aware status labeling system** in place (`SERVICE_AWARE_STATUS_LABELS` in `orderStateMachine.ts`), but it is **not being consistently used** across the application. Most pages display generic status labels instead of service-specific ones, leading to potentially confusing UX for laundry orders.

## Critical Findings

### ✅ What's Working Well

1. **State Machine Infrastructure** (`lib/orderStateMachine.ts`)
   - Well-designed `SERVICE_AWARE_STATUS_LABELS` object with different labels for LAUNDRY vs CLEANING
   - `getStatusLabel(status, serviceType?)` function accepts optional service type parameter
   - Comprehensive status definitions and transitions

2. **Status Grouping Logic** (`lib/orders.ts`)
   - Correctly uses `getStatusSection()` for grouping orders
   - Works correctly for both laundry and cleaning services

3. **Status Badge Component** (`components/orders/StatusBadge.tsx`)
   - Simple, functional component
   - Properly styled with color variants

### ❌ Issues Identified

#### 1. **Admin Orders Page** (`app/admin/orders/page.tsx`)
**Location:** Lines 8-20, 122-136

**Issues:**
- ❌ Does NOT use service-aware labels
- ❌ Custom `getStatusTone()` function instead of using state machine's `getStatusColor()`
- ❌ Manual mapping of colors to tones (redundant with state machine)
- ❌ Filter dropdown uses hardcoded status options without service context
- ❌ Status display uses generic labels via `formatStatus()` which calls `STATUS_LABELS[status]` instead of `getStatusLabel(status, serviceType)`

**Current Code:**
```typescript
function formatStatus(status: string): string {
  return STATUS_LABELS[status as OrderStatus] || status
}
```

**Should Be:**
```typescript
function formatStatus(status: string, serviceType: string): string {
  return getStatusLabel(status as OrderStatus, serviceType)
}
```

**Impact:**
- Laundry orders show "Pending Pickup" instead of the intended service-specific label
- No differentiation between laundry and cleaning workflows in admin view

#### 2. **Order Detail Page** (`app/orders/[id]/page.tsx`)
**Location:** Lines 7-8, 142

**Issues:**
- ❌ Imports from `lib/orderStatus.ts` instead of directly from `orderStateMachine.ts`
- ❌ Does NOT pass service type to `getStatusLabel()`
- ✅ DOES use service type for `getServiceTypeLabel()` (good!)

**Current Code:**
```typescript
const currentStep = mapDatabaseStatus(order.status);
const statusLabel = getStatusLabel(order.status); // Missing service type!
```

**Should Be:**
```typescript
const currentStep = mapDatabaseStatus(order.status);
const statusLabel = getStatusLabel(order.status, order.service_type);
```

**Impact:**
- Customers see generic status labels instead of service-appropriate ones
- Inconsistent with the intended UX design

#### 3. **Orders List Page** (`app/orders/page.tsx`)
**Location:** Component doesn't directly show status badges

**Status:** ✅ OK - This page doesn't display individual status labels, only groups orders into sections (Upcoming, In Progress, Completed). The grouping logic is correct.

#### 4. **OrderCard Component** (`components/orders/OrderCard.tsx`)
**Need to Check:** This component is used to display individual orders in the list

**Action Required:** Need to verify if OrderCard uses service-aware labels

#### 5. **lib/orderStatus.ts**
**Need to Check:** This file is imported by the order detail page but we haven't examined it yet

**Action Required:** Verify this isn't creating duplicate/conflicting status logic

## Recommended Fixes

### Priority 1: Fix Admin Orders Page

Update `app/admin/orders/page.tsx`:

```typescript
// Replace formatStatus function
function formatStatus(status: string, serviceType: string): string {
  return getStatusLabel(status as OrderStatus, serviceType)
}

// Update usage in the table
<td className="px-6 py-4 whitespace-nowrap">
  <StatusBadge tone={getStatusTone(order.status)}>
    {formatStatus(order.status, order.service_type)}
  </StatusBadge>
</td>
```

### Priority 2: Fix Order Detail Page

Update `app/orders/[id]/page.tsx`:

```typescript
// Pass service type to getStatusLabel
const statusLabel = getStatusLabel(order.status, order.service_type);
```

### Priority 3: Review and Consolidate

1. **Check `lib/orderStatus.ts`** - Ensure it's not duplicating logic from `orderStateMachine.ts`
2. **Check `components/orders/OrderCard.tsx`** - Verify it uses service-aware labels
3. **Update filter dropdowns** - Consider making status filters service-aware in admin panel

## Service-Aware Label Examples

For reference, here are the current service-aware labels from `orderStateMachine.ts`:

| Status | Generic Label | LAUNDRY Label | CLEANING Label |
|--------|--------------|---------------|----------------|
| `pending_pickup` | "Pending Pickup" | "Pending Pickup" | "Scheduled" |
| `at_facility` | "At Facility" | "At Facility" | "Confirmed" |
| `paid_processing` | "Processing" | "Processing" | "Confirmed" |
| `out_for_delivery` | "Out for Delivery" | "Out for Delivery" | "Completed" |
| `delivered` | "Delivered" | "Delivered" | "Completed" |

## Testing Checklist

After implementing fixes:

- [ ] Admin page shows service-appropriate status labels for laundry orders
- [ ] Order detail page shows service-appropriate status labels
- [ ] Status badges have correct colors for all laundry statuses
- [ ] Filter functionality still works correctly in admin panel
- [ ] No breaking changes to cleaning order displays

## Additional Observations

### Status Badge Colors
The status badge component supports these tones: `blue`, `indigo`, `green`, `yellow`, `gray`, `red`, `orange`

The state machine defines colors as: `blue`, `yellow`, `purple`, `orange`, `indigo`, `green`, `red`, `gray`

**Note:** There's a mismatch - state machine uses `purple` but badge component uses `indigo`. The admin page code maps `purple` → `indigo` which works, but this could be standardized.

## Files Requiring Updates

1. ✅ **High Priority:**
   - `app/admin/orders/page.tsx` - Add service type to status formatting
   - `app/orders/[id]/page.tsx` - Pass service type to getStatusLabel

2. 📋 **Medium Priority (Pending Review):**
   - `lib/orderStatus.ts` - Review for duplicate logic
   - `components/orders/OrderCard.tsx` - Verify service-aware labels

3. 🔍 **Low Priority (Enhancement):**
   - `lib/orderStateMachine.ts` - Consider standardizing color names
   - `app/admin/orders/page.tsx` - Make filter dropdown service-aware

## Conclusion

The infrastructure for service-aware status labeling exists and is well-designed, but it's not being used consistently. The fixes are straightforward - primarily ensuring the `serviceType` parameter is passed to `getStatusLabel()` in all locations where status labels are displayed.

**Estimated Implementation Time:** 1-2 hours for Priority 1 & 2 fixes
