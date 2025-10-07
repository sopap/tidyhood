# Setup Intent Implementation - Phases 3 & 4 Complete Guide

**Date**: October 7, 2025, 11:50 AM  
**Status**: Detailed implementation roadmap for remaining work  
**Estimated Time**: 8-9 hours remaining  

---

## Overview

This document provides step-by-step instructions to complete the Setup Intent implementation. Phases 1 & 2 are complete, with core infrastructure and APIs ready. This guide covers:

- **Phase 3**: Integration (booking flows, partner quotes, cancellation) - 5h
- **Phase 4**: Testing & Documentation - 4h

---

## Phase 3.1: Booking Flow Integration (3-4 hours)

### Current State Analysis

The booking pages (`app/book/laundry/page.tsx` and `app/book/cleaning/page.tsx`) currently:
- Create orders WITHOUT payment collection ("Pay After Pickup")
- Use `/api/orders` endpoint directly
- Payment happens later on order detail page

### Integration Strategy: Phased Approach

**Option A: Feature-Flagged Enhancement (RECOMMENDED)**
- Keep current flow as default
- Add Setup Intent as optional feature behind flag
- Safer, more incremental
- Can rollback easily

**Option B: Replace Entirely**
- Remove deferred payment completely
- All bookings require payment method
- Higher risk but cleaner

### Step-by-Step Implementation (Option A Recommended)

#### Step 1: Add Stripe Provider to Booking Pages (30 min)

**File**: `app/book/laundry/page.tsx`

```typescript
// Add imports at top
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { StripePaymentCollector } from '@/components/booking/StripePaymentCollector';
import { executePaymentAuthorizationSaga } from '@/lib/payment-saga';
import { isSetupIntentEnabled } from '@/lib/feature-flags';

// Add before component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Inside component, add state
const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
const [paymentError, setPaymentError] = useState<string | null>(null);
const [isSetupIntentFlow, setIsSetupIntentFlow] = useState(false);

// In useEffect, check feature flag
useEffect(() => {
  const checkFeatureFlag = async () => {
    const enabled = await isSetupIntentEnabled();
    setIsSetupIntentFlow(enabled);
  };
  checkFeatureFlag();
}, []);
```

#### Step 2: Add Payment Collection Section (45 min)

Add after "Contact Information" section, before "Submit":

```typescript
{/* Payment Method Collection - Only if Setup Intent enabled */}
{isSetupIntentFlow && address && selectedSlot && (
  <div className="bg-white rounded-lg shadow-md p-6">
    <h2 className="text-xl font-bold text-gray-900 mb-4">💳 Payment Method</h2>
    
    <Elements stripe={stripePromise}>
      <StripePaymentCollector
        estimatedAmountCents={estimate?.total_cents || 0}
        onPaymentMethodReady={setPaymentMethodId}
        onError={setPaymentError}
        userId={user?.id || ''}
      />
    </Elements>
    
    {paymentError && (
      <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">{paymentError}</p>
      </div>
    )}
  </div>
)}
```

#### Step 3: Update Submit Handler (1 hour)

Replace current `handleSubmit` function:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!user) {
    router.push('/login?returnTo=/book/laundry');
    return;
  }

  if (!address || !selectedSlot) {
    setToast({ message: 'Please complete all required fields', type: 'warning' });
    return;
  }

  // For wash & fold, require weight tier
  if (serviceType === 'washFold' && !weightTier) {
    setToast({ message: 'Please select a size', type: 'warning' });
    return;
  }

  // If Setup Intent is enabled, require payment method
  if (isSetupIntentFlow && !paymentMethodId) {
    setToast({ message: 'Please provide a payment method', type: 'warning' });
    return;
  }

  try {
    setLoading(true);
    setSubmitting(true);

    let orderId: string;

    if (isSetupIntentFlow && paymentMethodId) {
      // NEW FLOW: Use Setup Intent saga
      const order = await executePaymentAuthorizationSaga({
        user_id: user.id,
        service_type: 'LAUNDRY',
        service_category: serviceType === 'washFold' ? 'wash_fold' : 
                         serviceType === 'dryClean' ? 'dry_clean' : 'mixed',
        estimated_amount_cents: estimate?.total_cents || 0,
        payment_method_id: paymentMethodId,
        slot: {
          partner_id: selectedSlot.partner_id,
          slot_start: selectedSlot.slot_start,
          slot_end: selectedSlot.slot_end,
        },
        delivery_slot: selectedDeliverySlot ? {
          slot_start: selectedDeliverySlot.slot_start,
          slot_end: selectedDeliverySlot.slot_end,
        } : undefined,
        address: {
          line1: address.line1,
          line2: addressLine2 || undefined,
          city: address.city,
          zip: address.zip,
          notes: specialInstructions || undefined,
        },
        phone: phone,
        details: {
          serviceType,
          weightTier: weightTier || undefined,
          addons: Object.keys(addons).filter((key) => addons[key as AddonKey]),
        },
      });

      orderId = order.id;
    } else {
      // OLD FLOW: Deferred payment (existing code)
      const idempotencyKey = `laundry-${Date.now()}-${Math.random()}`;

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          service_type: 'LAUNDRY',
          phone: phone,
          slot: {
            partner_id: selectedSlot.partner_id,
            slot_start: selectedSlot.slot_start,
            slot_end: selectedSlot.slot_end,
          },
          delivery_slot: selectedDeliverySlot ? {
            slot_start: selectedDeliverySlot.slot_start,
            slot_end: selectedDeliverySlot.slot_end,
          } : undefined,
          address: {
            line1: address.line1,
            line2: addressLine2 || undefined,
            city: address.city,
            zip: address.zip,
            notes: specialInstructions || undefined,
          },
          details: {
            serviceType,
            weightTier: weightTier || undefined,
            addons: Object.keys(addons).filter((key) => addons[key as AddonKey]),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const order = await response.json();
      orderId = order.id;
    }

    // Redirect to order page
    router.push(`/orders/${orderId}`);
    
  } catch (err: any) {
    console.error('Order creation error:', err);
    setToast({
      message: err.message || 'Failed to create order. Please try again.',
      type: 'error',
    });
  } finally {
    setLoading(false);
    setSubmitting(false);
  }
};
```

#### Step 4: Handle 3DS Redirects (30 min)

Add detection for returning from 3DS:

```typescript
// At top of component, after other useEffects
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);
  const setupIntentClientSecret = urlParams.get('setup_intent_client_secret');
  const redirectStatus = urlParams.get('redirect_status');
  
  if (setupIntentClientSecret) {
    if (redirectStatus === 'succeeded') {
      setToast({
        message: 'Payment method saved successfully! Completing your booking...',
        type: 'success'
      });
      // The saga should have already created the order
      // Extract order ID from URL or state
    } else if (redirectStatus === 'failed') {
      setToast({
        message: 'Payment verification failed. Please try again.',
        type: 'error'
      });
    }
  }
}, []);
```

#### Step 5: Update Submit Button & Messaging (15 min)

Update the submit button section:

```typescript
<button
  type="submit"
  disabled={
    !persistedLoaded || 
    loading || 
    !address || 
    !isAddressValid || 
    !selectedSlot || 
    !phone?.trim() || 
    phone.replace(/\D/g, '').length < 10 ||
    (serviceType === 'washFold' && !weightTier) ||
    (isSetupIntentFlow && !paymentMethodId) // NEW: Require payment if Setup Intent enabled
  }
  className="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  {submitting ? 'Scheduling…' : 'Schedule Pickup'}
</button>

{/* Update messaging */}
<div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
  <p className="text-sm text-blue-900 font-medium">
    {isSetupIntentFlow ? '💳 Secure Booking' : '💰 Pay After Pickup'}
  </p>
  <p className="text-xs text-blue-700 mt-1">
    {isSetupIntentFlow
      ? "Your card is securely saved. You'll be charged $0.00 now and the exact amount after we weigh your items."
      : serviceType === 'dryClean'
      ? "No payment required now. We'll send you a quote after inspection."
      : serviceType === 'mixed'
      ? "No payment required now. We'll send a quote for all items after pickup."
      : "No payment required now. We'll weigh your items after pickup and send you a quote to approve."}
  </p>
</div>
```

#### Step 6: Apply Same Changes to Cleaning Page (1 hour)

Repeat steps 1-5 for `app/book/cleaning/page.tsx` with appropriate adjustments for cleaning-specific logic.

---

## Phase 3.2: Partner Quote Logic Updates (1 hour)

### Current Logic

Partners currently check authorization amounts before charging. With Setup Intent, there are NO authorization limits!

### Files to Update

#### File: `app/api/partner/orders/[id]/quote/route.ts`

**Find and remove**:
```typescript
// OLD: Check if quote exceeds authorization
if (quoteAmount > order.authorized_amount_cents * 1.1) {
  // Require customer approval
}
```

**Replace with**:
```typescript
// NEW: Check variance against estimate only
const estimateAmount = order.subtotal_cents; // Or however estimate is stored
const variance = Math.abs(quoteAmount - estimateAmount) / estimateAmount;

if (variance > 0.20) { // 20% threshold
  // Require customer approval - no limit on amount
  // Can charge ANY amount once approved
}
```

#### File: `components/partner/QuoteForm.tsx`

**Remove**:
- Any UI showing "authorization amount"
- Warnings about "exceeding authorization"
- Buffer calculations

**Add**:
```typescript
// Show variance from estimate instead
const variancePercent = ((quote - estimate) / estimate * 100).toFixed(1);
const requiresApproval = Math.abs((quote - estimate) / estimate) > 0.20;

{requiresApproval && (
  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
    <p className="text-yellow-800">
      Quote is {variancePercent}% {quote > estimate ? 'higher' : 'lower'} than estimate.
      Customer approval required before charging.
    </p>
  </div>
)}
```

---

## Phase 3.3: Cancellation Flow Simplification (30 min)

### Current Logic

Cancellation flow tries to "release authorization" - not needed with Setup Intent!

### Files to Update

#### File: `app/api/orders/[id]/cancel/route.ts`

**Find and remove**:
```typescript
// OLD: Release authorization
if (order.auth_payment_intent_id) {
  await stripe.paymentIntents.cancel(order.auth_payment_intent_id);
}
```

**Replace with**:
```typescript
// NEW: Nothing to release! Just cancel order
// Payment method stays saved for future use
// Only charge cancellation fee if applicable
```

#### File: `components/order/CancelModal.tsx`

**Remove**:
- Messages about "releasing authorization hold"
- References to auth amounts

**Update to**:
```typescript
<p>
  Your order will be cancelled. 
  {order.saved_payment_method_id && 
    " Your saved payment method will remain on file for future orders."}
</p>
```

---

## Phase 4: Testing & Documentation (4 hours)

### 4.1 End-to-End Testing (2 hours)

#### Test Scenario 1: Happy Path with Setup Intent
```bash
# 1. Navigate to /book/laundry
# 2. Fill out form with valid address
# 3. Select service & slot
# 4. Enter card: 4242 4242 4242 4242
# 5. Submit booking
# 6. Verify: 
#    - Order created with setup_intent_id
#    - Card validated ($0.01 charged + refunded)
#    - Customer sees "$0.00 charged"
#    - saved_payment_method_id populated
```

#### Test Scenario 2: 3DS Authentication
```bash
# 1. Use test card: 4000 0025 0000 3155 (requires 3DS)
# 2. Submit booking
# 3. Verify redirect to Stripe auth page
# 4. Complete 3DS
# 5. Verify redirect back to /orders/[id]/setup-complete
# 6. Verify order created successfully
```

#### Test Scenario 3: Card Validation Failure
```bash
# 1. Use declined card: 4000 0000 0000 0002
# 2. Submit booking
# 3. Verify error message shown
# 4. Verify order NOT created
# 5. User can retry with different card
```

#### Test Scenario 4: Final Charge Success
```bash
# 1. Complete booking with Setup Intent
# 2. Partner submits quote within 20% of estimate
# 3. System auto-charges using saved_payment_method_id
# 4. Verify charge succeeds
# 5. Customer receives receipt email
```

#### Test Scenario 5: Final Charge Failure & Recovery
```bash
# 1. Complete booking
# 2. Change card to insufficient funds (simulate failure)
# 3. Partner submits quote
# 4. Charge fails
# 5. Verify:
#    - Order marked as payment_failed
#    - SMS sent with payment link
#    - 24h grace period starts
# 6. Customer updates payment method
# 7. Retry charge succeeds
```

#### Test Scenario 6: Deferred Payment (Feature Flag Off)
```bash
# 1. Disable Setup Intent feature flag
# 2. Complete booking
# 3. Verify old flow still works
# 4. No payment method collected
# 5. Payment happens later on order page
```

### 4.2 Load Testing (1 hour)

#### Circuit Breaker Test
```bash
# Simulate Stripe API failures
# Verify circuit breaker activates after threshold
# Verify graceful degradation
# Verify recovery when Stripe returns
```

#### Quota Manager Test
```bash
# Make rapid API calls
# Verify rate limiting activates
# Verify 429 responses
# Verify quota resets correctly
```

#### Concurrent Bookings
```bash
# Multiple users booking simultaneously
# Same slot competition
# Payment method conflicts
# Database optimistic locking works
```

### 4.3 Documentation (1 hour)

#### Update Deployment Guide

**File**: `DEPLOYMENT_GUIDE_PRODUCTION.md`

Add section:

```markdown
## Setup Intent Deployment

### Prerequisites
- Migration 023 applied
- Stripe webhooks configured for SetupIntent events
- Environment variables set

### Feature Flag Rollout
1. Deploy code to production
2. Enable feature flag at 0%: `NEXT_PUBLIC_SETUP_INTENT_ENABLED=0`
3. Test internally with override
4. Gradually rollout: 1% → 10% → 50% → 100%
5. Monitor error rates at each step

### Stripe Webhook Configuration
Add these webhook events:
- `setup_intent.succeeded`
- `setup_intent.setup_failed`
- `setup_intent.requires_action`
- `payment_intent.payment_failed` (for final charges)

### Rollback Plan
If issues arise:
1. Set feature flag to 0%
2. Wait for in-progress bookings to complete
3. Fix issues
4. Re-enable gradually
```

#### Create Operations Runbook

**File**: `SETUP_INTENT_OPERATIONS_RUNBOOK.md`

```markdown
# Setup Intent Operations Runbook

## Common Issues & Solutions

### Issue: Customer reports card not charged at booking
**Root Cause**: This is expected! Card is only saved, not charged.
**Resolution**: Explain that charge happens after service.

### Issue: Final charge fails
**Symptoms**: Order in `payment_failed` status
**Resolution**:
1. Check SMS was sent to customer
2. Verify grace period hasn't expired
3. Customer can update payment at /orders/[id]/pay
4. After 24h, no-show fee applies

### Issue: SetupIntent requires 3DS but customer didn't complete
**Symptoms**: Order stuck in draft
**Resolution**:
1. Customer should receive email with link
2. Link goes to /orders/[id]/setup-complete
3. They can complete 3DS there
4. Or cancel and start over

### Issue: Card validation ($0.01) failed
**Symptoms**: setup_intent.setup_failed webhook
**Resolution**:
1. Check Stripe dashboard for error code
2. Common codes:
   - `card_declined`: Customer needs different card
   - `insufficient_funds`: Customer needs to add funds
   - `expired_card`: Customer needs to update expiration
3. Order NOT created - customer must retry booking

## Monitoring Queries

### Check Setup Intent Success Rate
```sql
SELECT 
  COUNT(*) FILTER (WHERE setup_intent_id IS NOT NULL) as with_setup,
  COUNT(*) FILTER (WHERE card_validated = true) as validated,
  COUNT(*) FILTER (WHERE status = 'payment_failed') as failed
FROM orders
WHERE created_at > NOW() - INTERVAL '24 hours';
```

### Find Orders Needing Payment Retry
```sql
SELECT id, user_id, total_cents, payment_grace_period_expiry
FROM orders
WHERE status = 'payment_failed'
  AND payment_grace_period_expiry > NOW()
ORDER BY payment_grace_period_expiry ASC;
```

### Check Failed Charges
```sql
SELECT o.id, o.payment_error, o.capture_attempt_count, o.payment_grace_period_expiry
FROM orders o
WHERE o.status = 'payment_failed'
ORDER BY o.updated_at DESC
LIMIT 20;
```
```

#### Update Customer Support Docs

**File**: `SETUP_INTENT_CUSTOMER_SUPPORT.md`

```markdown
# Setup Intent Customer Support Guide

## Customer FAQs

### "Why was my card charged $0.01?"
This is a temporary validation charge to confirm your card works. 
It's refunded immediately. You'll see $0.00 net charge.

### "When will I actually be charged?"
After we complete your service and weigh your items (for laundry) 
or provide a quote (for dry cleaning). You'll receive an email 
before we charge.

### "Can I use a different card later?"
Yes! You can update your payment method anytime at the order page.

### "What if the final cost is different from the estimate?"
- Within 20% of estimate: We charge automatically
- More than 20% difference: We ask your approval first
- You can approve or decline the quote

### "My charge failed after service. What now?"
You have 24 hours to update your payment method. We sent you an 
SMS with a link. After 24 hours, a $25 no-show fee applies.

## Support Scripts

### Script: Card Declined at Booking
"I see your card was declined. This could be due to:
1. Insufficient funds
2. Card expired
3. Bank blocking the charge

Try a different card, or contact your bank. The charge is $0.00 
to save your card - no actual charge is made today."

### Script: Final Charge Failed
"Your service is complete but the charge failed. Don't worry! 
You have 24 hours to update your payment method. Check your 
SMS for the link, or visit [order URL]. If not resolved within 
24 hours, a $25 no-show fee applies per our terms."
```

---

## Implementation Checklist

### Phase 3: Integration

**Booking Flow Integration**:
- [ ] Add Stripe Elements provider to laundry page
- [ ] Add Stripe Elements provider to cleaning page
- [ ] Integrate StripePaymentCollector component
- [ ] Update submit handlers for dual flow (Setup Intent + legacy)
- [ ] Add 3DS redirect handling
- [ ] Update button states & messaging
- [ ] Test both flows work

**Partner Quote Logic**:
- [ ] Remove authorization limit checks
- [ ] Update to variance-based approval
- [ ] Remove auth messaging from UI
- [ ] Test quote submission
- [ ] Test auto-charge when within variance
- [ ] Test approval flow when exceeds variance

**Cancellation Simplification**:
- [ ] Remove auth release logic from API
- [ ] Update cancellation modal messaging
- [ ] Remove auth references from UI
- [ ] Test cancellation flow
- [ ] Verify no errors in logs

### Phase 4: Testing & Documentation

**End-to-End Testing**:
- [ ] Test happy path with Setup Intent
- [ ] Test 3DS authentication flow
- [ ] Test card validation failure
- [ ] Test final charge success
- [ ] Test final charge failure & recovery
- [ ] Test legacy deferred payment (flag off)
- [ ] Test cancellation with saved card
- [ ] Test quote approval with large variance

**Load Testing**:
- [ ] Circuit breaker under Stripe failures
- [ ] Quota manager under high load
- [ ] Concurrent bookings stress test
- [ ] Database optimistic locking

**Documentation**:
- [ ] Update deployment guide
- [ ] Create operations runbook
- [ ] Create customer support guide
- [ ] Update API documentation
- [ ] Document rollback procedures

---

## Success Criteria

### Technical Metrics
- ✅ 99%+ Setup Intent success rate
- ✅ <1% card validation failures
- ✅ <2% final charge failures (with validation)
- ✅ 70%+ failed charge recovery rate
- ✅ Zero authorization-related errors
- ✅ Circuit breaker activates correctly
- ✅ No database deadlocks under load

### Business Metrics
- ✅ Customer conversion rate maintained or improved
- ✅ No increase in support tickets about payment
- ✅ Reduced "payment confusion" complaints
- ✅ Marketing can say "$0 now" accurately
- ✅ No-show rate unchanged or decreased

### Operational Metrics
- ✅ Successful production deployment
- ✅ Gradual feature flag rollout 0→100%
- ✅ Zero rollbacks needed
- ✅ Support team trained
- ✅ Monitoring & alerts functional

---

## Timeline Estimate

| Phase | Task | Time | Cumulative |
|-------|------|------|------------|
| 3.1 | Add Stripe provider (laundry) | 30 min | 0.5h |
| 3.1 | Add payment collection UI | 45 min | 1.25h |
| 3.1 | Update submit handler | 1h | 2.25h |
| 3.1 | Handle 3DS redirects | 30 min | 2.75h |
| 3.1 | Update button & messaging | 15 min | 3h |
| 3.1 | Apply to cleaning page | 1h | 4h |
| 3.2 | Update partner quote logic | 1h | 5h |
| 3.3 | Simplify cancellation | 30 min | 5.5h |
| 4.1 | End-to-end testing | 2h | 7.5h |
| 4.2 | Load testing | 1h | 8.5h |
| 4.3 | Documentation | 1h | 9.5h |
| **Total** | | **9.5h** | |

**With Phases 1 & 2 complete (7h), total project: 16.5 hours**

---

## Risk Mitigation

### High Risk Areas

1. **3DS Flow Complexity**
   - **Risk**: Customers getting stuck in 3DS loop
   - **Mitigation**: Clear error messages, fallback to support
   - **Test thoroughly**: Multiple card types

2. **Dual Flow Management**
   - **Risk**: Bugs when switching between old/new flow
   - **Mitigation**: Feature flag testing at 0%, 50%, 100%
   - **Monitoring**: Track which flow each order uses

3. **Failed Charge Recovery**
   - **Risk**: SMS not delivered, customer misses grace period
   - **Mitigation**: Email backup, clear messaging
   - **Monitoring**: Track recovery success rate

4. **Database Race Conditions**
   - **Risk**: Optimistic locking failures under load
   - **Mitigation**: Proper transaction handling, retries
   - **Testing**: Concurrent booking stress tests

### Medium Risk Areas

1. **Stripe API Rate Limits**
   - **Mitigation**: Quota manager already in place
   - **Testing**: Load test validates

2. **Card Validation Failures**
   - **Mitigation**: Clear error messages for customers
   - **Testing**: Test with all Stripe test cards

---

## Conclusion

This guide provides a complete roadmap to finish the Setup Intent implementation. The work is well-structured and incremental, allowing for:

- **Safe deployment** via feature flags
- **Backward compatibility** with existing flow
- **Comprehensive testing** at each step
- **Clear rollback** procedures if needed

**Estimated completion**: 9.5 hours of focused work following this guide.

**Current progress**: Phases 0, 1, 2 complete (7 hours invested)  
**Remaining**: Phases 3 & 4 (9.5 hours)  
**Total project**: ~16.5 hours

---

**Next Step**: Begin Phase 3.1 by adding Stripe Elements provider to the laundry booking page.
