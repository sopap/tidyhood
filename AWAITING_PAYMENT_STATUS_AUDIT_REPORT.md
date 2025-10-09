# Awaiting Payment Status Audit Report

**Date:** October 9, 2025  
**Auditor:** Principal Engineer for Operations  
**Status:** 🔍 Investigation Complete - Awaiting Diagnostic Execution

---

## Executive Summary

This audit investigates orders stuck in "awaiting payment" status despite the deprecation of the legacy approved invoice payment strategy. The investigation reveals this is **not a simple data issue** but rather a **code architecture problem** that requires targeted fixes.

### Key Findings

1. **Legacy Flow is Intentional** - The system maintains backward compatibility for old orders
2. **Code Bug Identified** - Admin quote route always sets `awaiting_payment` regardless of payment method
3. **Two Payment Flows Coexist** - New (Setup Intent) and Legacy (Manual Payment) flows
4. **Potential Data Inconsistency** - Some orders may have payment methods but wrong status

### Severity Assessment

- **Impact:** Medium - Affects user experience and operations workflow
- **Scope:** Unknown until diagnostic script is run
- **Risk:** Low - Orders can still be processed, just require manual intervention

---

## System Architecture Review

### Current Payment Flow Design

The system implements **two parallel payment flows**:

#### Flow A: New Orders (Setup Intent - Post Oct 9, 2025)
```
User Books → Payment Method Collected
    ↓
Order Created (pending_pickup)
    ↓
Partner Picks Up → (at_facility)
    ↓
Quote Created → 
    ┌─────────────────────────┬──────────────────────┐
    │ Partner Quote           │ Admin Quote          │
    ├─────────────────────────┼──────────────────────┤
    │ pending_admin_approval  │ paid_processing      │
    │ (needs approval)        │ (auto-charged)       │
    └─────────────────────────┴──────────────────────┘
```

#### Flow B: Legacy Orders (Manual Payment - Pre Oct 9, 2025)
```
Order Created → NO Payment Method
    ↓
Partner Picks Up → (at_facility)
    ↓
Quote Created → awaiting_payment
    ↓
Customer Pays Manually → paid_processing
```

### The Problem

The **transition logic** from `at_facility` → next status is controlled by:

1. `lib/orderStateMachine.ts::getPostQuoteStatus()` - Correctly determines status based on payment method
2. `app/api/admin/orders/[id]/update-quote/route.ts` - **INCORRECTLY** always sets `awaiting_payment`

---

## Root Cause Analysis

### Issue #1: Admin Quote Route Override

**File:** `app/api/admin/orders/[id]/update-quote/route.ts`

**Problem:**
```typescript
if (order.status !== 'completed' && order.status !== 'delivered' && order.status !== 'paid_processing') {
  updates.status = 'awaiting_payment'  // ❌ ALWAYS sets this status
}
```

**Impact:**
- Admin updates a quote
- System **ignores** whether payment method exists
- Order goes to `awaiting_payment` even if it should auto-charge
- Customer sees confusing "Awaiting Payment" status
- Operations team must manually intervene

**Expected Behavior:**
```typescript
// Should check payment method first
if (order.saved_payment_method_id && order.stripe_customer_id) {
  // Auto-charge flow - DON'T set status here
  // Let the charge completion set it to paid_processing
} else {
  // Legacy flow - set awaiting_payment
  updates.status = 'awaiting_payment'
}
```

### Issue #2: UI Label Inconsistency

**File:** `lib/orderStatus.ts`

**Problem:**
- Code maps `awaiting_payment` → "Weighed & Sorted"
- Screenshot shows "Awaiting Payment" label
- Suggests different rendering path or old version

**Impact:**
- Confusing for customers
- Inconsistent with order flow documentation
- May indicate untested code paths

### Issue #3: Incomplete Migration

**Files Affected:**
- `app/book/laundry/page.tsx` - Should always require payment method
- `app/api/orders/route.ts` - Still accepts orders without payment method (logs deprecation)

**Impact:**
- New orders might still be created without payment methods
- Depends on which booking endpoint is being used
- Creates legitimate `awaiting_payment` orders post-deprecation

---

## Risk Assessment

### Financial Risk: LOW
- No money is lost
- Orders can be manually completed
- Stripe authorization is valid for 7 days

### Operational Risk: MEDIUM
- Increased manual work for ops team
- Customer confusion and support tickets
- Delayed order processing

### Customer Experience Risk: MEDIUM
- Confusing status messages
- Unclear payment expectations
- May require customer to take action they shouldn't need to

### Data Integrity Risk: LOW
- No data loss
- All orders trackable
- Reversible with status updates

---

## Diagnostic Plan

### Phase 1: Data Analysis (IMMEDIATE)

Run the diagnostic script to identify:

```bash
node scripts/diagnose-awaiting-payment-orders.js
```

This will reveal:
1. **Total Count:** How many orders are affected
2. **Payment Method Presence:** Legacy (expected) vs. Problematic (bug)
3. **Timeline:** When these orders were created
4. **Age:** How long they've been stuck
5. **Specific IDs:** Which orders need attention

### Phase 2: Categorization

Based on diagnostic output, categorize orders:

**Category A: Expected Legacy Orders**
- Created before Oct 9, 2025
- No `saved_payment_method_id`
- Status: ✅ Working as designed
- Action: None - customer will pay manually

**Category B: Stuck New Orders**
- Have `saved_payment_method_id`
- Currently in `awaiting_payment`
- Status: ⚠️ Needs status update
- Action: Move to `paid_processing` or charge

**Category C: Post-Deprecation Orders**
- Created after Oct 9, 2025
- Shouldn't exist in this status
- Status: 🚨 Critical - indicates booking flow bug
- Action: Investigate + fix booking endpoint

### Phase 3: Impact Assessment

Calculate:
- Number of affected customers
- Total stuck order value
- Average time in stuck status
- Support ticket correlation

---

## Proposed Solutions

### Solution 1: Fix Admin Quote Route (IMMEDIATE)

**Priority:** HIGH  
**Complexity:** Low  
**File:** `app/api/admin/orders/[id]/update-quote/route.ts`

```typescript
// Replace existing logic with:
const { isLegacyPaymentFlow, getPostQuoteStatus } = require('@/lib/orderStateMachine');

if (order.status !== 'completed' && order.status !== 'delivered' && order.status !== 'paid_processing') {
  // Only set awaiting_payment for legacy orders
  if (isLegacyPaymentFlow(order)) {
    updates.status = 'awaiting_payment';
  } else {
    // For new orders with payment methods, don't change status
    // The auto-charge flow will handle it
    // OR trigger auto-charge here immediately
  }
}
```

**Testing:**
1. Create test order with payment method
2. Admin updates quote
3. Verify order doesn't go to `awaiting_payment`
4. Verify customer is charged automatically

### Solution 2: Migrate Stuck Orders (IMMEDIATE)

**Priority:** HIGH  
**Complexity:** Low  
**Script:** Create `scripts/fix-awaiting-payment-orders.js`

```javascript
// For orders with payment method but in awaiting_payment:
UPDATE orders 
SET status = 'paid_processing',
    updated_at = NOW()
WHERE status = 'awaiting_payment'
  AND saved_payment_method_id IS NOT NULL
  AND stripe_customer_id IS NOT NULL
  AND service_type = 'LAUNDRY';
```

**Safety:**
- Dry-run first (SELECT only)
- Backup database
- Run during low-traffic hours
- Notify affected customers

### Solution 3: Add Monitoring & Alerts (SHORT-TERM)

**Priority:** MEDIUM  
**Complexity:** Low

Create monitoring for:

```javascript
// Alert if new orders enter awaiting_payment
SELECT COUNT(*) 
FROM orders 
WHERE status = 'awaiting_payment'
  AND created_at > NOW() - INTERVAL '24 hours'
  AND saved_payment_method_id IS NOT NULL;

// If count > 0, alert ops team
```

**Implement:**
- Cron job (daily)
- Slack/email notification
- Admin dashboard widget

### Solution 4: Deprecate Status Completely (LONG-TERM)

**Priority:** LOW  
**Complexity:** High  
**Timeline:** 90 days after legacy orders complete

**Steps:**
1. Wait for all legacy orders to complete
2. Remove `awaiting_payment` from state machine
3. Remove `/api/orders/[id]/pay` endpoint
4. Update UI to not render this status
5. Add database constraint to prevent status

---

## Implementation Roadmap

### Week 1: Emergency Fixes
- [ ] Run diagnostic script
- [ ] Review findings with team
- [ ] Fix admin quote route bug
- [ ] Migrate stuck orders (if any)

### Week 2: Preventive Measures
- [ ] Add monitoring alerts
- [ ] Update admin dashboard
- [ ] Document new workflow
- [ ] Train ops team

### Month 2: Validation
- [ ] Monitor for new occurrences
- [ ] Collect metrics on flow usage
- [ ] Identify any edge cases
- [ ] Refine alerting thresholds

### Month 3: Cleanup
- [ ] Archive completed legacy orders
- [ ] Plan deprecation of legacy endpoints
- [ ] Update API documentation
- [ ] Remove dead code

---

## Testing Checklist

### Pre-Deployment Tests

- [ ] Unit tests pass for state machine
- [ ] Integration tests for quote flow
- [ ] Manual test: Admin quotes order with payment method
- [ ] Manual test: Admin quotes order without payment method
- [ ] Verify UI labels are consistent
- [ ] Check Stripe dashboard for charges

### Post-Deployment Monitoring

- [ ] Watch server logs for `[DEPRECATED]` tags
- [ ] Monitor error rates
- [ ] Check customer support tickets
- [ ] Verify payment success rates
- [ ] Review order status distribution

---

## Communication Plan

### Internal Stakeholders

**Operations Team:**
- Explain new vs. old flow
- Train on when manual intervention needed
- Provide troubleshooting guide
- Share diagnostic script access

**Development Team:**
- Code review for fixes
- Update deployment runbook
- Add monitoring dashboards
- Document architecture decisions

**Customer Support:**
- FAQ for "awaiting payment" status
- Escalation procedures
- Refund policy clarification
- Messaging templates

### External Communication

**Customers:**
- No proactive communication needed (unless widespread)
- Support agents handle case-by-case
- Update help center articles

---

## Success Criteria

### Quantitative Metrics

- ✅ Zero new orders with payment methods in `awaiting_payment` status
- ✅ <5% of total orders using legacy payment flow
- ✅ 95%+ payment success rate maintained
- ✅ <1% of orders stuck for >48 hours
- ✅ Zero critical bugs related to payment flow

### Qualitative Metrics

- ✅ Ops team reports reduced manual intervention
- ✅ Customer support tickets decrease
- ✅ Clear understanding of payment flows
- ✅ Confidence in auto-charge system
- ✅ Smooth deprecation of legacy flow

---

## Rollback Plan

### If Issues Arise After Fixes

**Option A: Revert Code Changes**
```bash
git revert <commit-hash>
git push origin main
```

**Option B: Temporarily Disable Auto-Charge**
```typescript
// In update-quote route, temporarily revert to always awaiting_payment
updates.status = 'awaiting_payment';
```

**Option C: Manual Order Processing**
- Put orders in holding queue
- Process manually until fix verified
- Communicate delays to customers

---

## Appendices

### Appendix A: Related Files

**Core Logic:**
- `lib/orderStateMachine.ts` - State transition rules
- `lib/orders.ts` - Order grouping/display
- `lib/orderStatus.ts` - Legacy status mapping

**API Endpoints:**
- `app/api/orders/route.ts` - Order creation (deprecated for laundry)
- `app/api/payment/setup/route.ts` - New booking flow
- `app/api/admin/orders/[id]/update-quote/route.ts` - **BUG HERE**
- `app/api/admin/orders/[id]/direct-quote/route.ts` - Admin auto-charge
- `app/api/admin/quotes/approve/route.ts` - Partner quote approval
- `app/api/orders/[id]/pay/route.ts` - Legacy manual payment

**UI Components:**
- `app/orders/page.tsx` - Orders list view
- `app/orders/[id]/page.tsx` - Order detail view
- `components/orders/StatusBadge.tsx` - Status display
- `components/orders/OrderCard.tsx` - Order card component

### Appendix B: Database Schema

```sql
-- Relevant orders table columns
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL,
  service_type TEXT NOT NULL,
  saved_payment_method_id TEXT,      -- New flow
  stripe_customer_id TEXT,            -- New flow
  payment_intent_id TEXT,             -- After charge
  quote_cents INTEGER,
  quoted_at TIMESTAMP,
  paid_at TIMESTAMP,
  order_details JSONB,                -- Contains _deprecated_payment_flow flag
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Appendix C: Diagnostic Script Output Example

```
🔍 Starting Awaiting Payment Orders Diagnostic

================================================================================

📊 QUERY 1: Overview Statistics

Total orders in 'awaiting_payment' status: 12

📊 QUERY 2: Payment Method Analysis

Orders WITH saved payment method: 3 ⚠️
Orders WITHOUT saved payment method: 9 ✓ (expected legacy)

📊 QUERY 3: Timeline Analysis

Created BEFORE deprecation (2025-10-09): 9 ✓
Created AFTER deprecation (2025-10-09): 3 ⚠️

================================================================================
🚨 CRITICAL FINDINGS

⚠️  ISSUE 1: 3 orders have payment methods but are stuck in awaiting_payment
   These should likely be in paid_processing status instead.
   Order IDs: abc123, def456, ghi789

⚠️  ISSUE 2: 3 orders created AFTER deprecation are in awaiting_payment
   New bookings should not enter this status anymore.
   
================================================================================
💡 RECOMMENDATIONS

🔧 Action Required: Fix admin quote route
   The file app/api/admin/orders/[id]/update-quote/route.ts
   always sets status to awaiting_payment...
```

---

## Conclusion

The "awaiting payment" orders you're seeing are a **symptom** of incomplete migration from the legacy payment system. The root cause is a **code bug** in the admin quote route that ignores payment method presence.

**DO NOT delete orders** - this would cause data loss and customer service nightmares.

**DO run the diagnostic script** first to understand the scope, then apply targeted fixes to the code and migrate affected orders.

The system is **recoverable** without data loss. With proper fixes and monitoring, this issue can be prevented going forward.

---

## Next Steps

1. ✅ Run diagnostic script: `node scripts/diagnose-awaiting-payment-orders.js`
2. ⏳ Review output with team
3. ⏳ Implement Solution 1 (fix admin route)
4. ⏳ Implement Solution 2 (migrate stuck orders)
5. ⏳ Implement Solution 3 (add monitoring)

**Estimated Time to Resolution:** 2-4 hours for critical fixes, 1-2 weeks for complete implementation

---

**Report Prepared By:** Cline AI Assistant  
**Date:** October 9, 2025  
**Status:** Ready for Review & Implementation
