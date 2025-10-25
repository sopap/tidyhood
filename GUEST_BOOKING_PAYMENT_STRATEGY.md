# Guest Booking Payment Strategy

**Date:** October 25, 2025  
**Status:** Recommendation  

---

## Problem

The Setup Intent payment saga (`/api/payment/setup`) is tightly coupled to authenticated users:
- Requires `user_id` to create/lookup Stripe customer
- Stores `stripe_customer_id` in user profile
- Card validation requires user account

**Current Error:** "Unauthorized" when guest users try to use Setup Intent flow

---

## Recommended Solution: Two-Tier Payment Strategy

### Tier 1: Guest Users → Deferred Payment (No Card Upfront)
**Better for conversion!**

- ✅ Guest books cleaning without providing payment
- ✅ Service is completed
- ✅ Partner submits quote
- ✅ Guest receives payment link via email
- ✅ Guest pays via Stripe Checkout link
- ✅ No friction during booking

**UX Message:**
"💰 Pay After Service - No payment required now. We'll email you the final invoice after completing your cleaning."

### Tier 2: Authenticated Users → Setup Intent (Card on File)
**Better for retention!**

- User provides card during booking ($0 charged)
- Card saved to their account
- Auto-charged after service completion
- Faster repeat bookings

**UX Message:**
"💳 Secure Booking - Your card is securely saved. You'll be charged $0.00 now and the exact amount after service."

---

## Implementation Plan

### Option A: Disable Setup Intent for Guests (Quick Win)

Update `app/book/cleaning/page.tsx`:

```typescript
// Only show payment collection for authenticated users
{isSetupIntentFlow && user && address && selectedSlot && pricing.total > 0 && (
  <div>
    <StripePaymentCollector ... />
  </div>
)}
```

Guests would use deferred payment automatically. No code changes needed to `/api/payment/setup` or saga.

### Option B: Full Guest Setup Intent Support (Complex)

Would require:
1. Update payment saga to create Stripe customer for guests
2. Store `stripe_customer_id` on orders table (not just profiles)
3. Handle guest customer lookup/creation differently
4. Skip card validation for guests (or handle without user_id)
5. Email guest with order lookup token

**Estimated effort:** 2-3 hours

---

## Recommendation

**Go with Option A** for now:

**Pros:**
- Zero backend changes needed
- Guest checkout still works (deferred payment)
- Better conversion (no payment friction for first-time users)
- Authenticated users get card-on-file benefit
- Can upgrade to Option B later if needed

**Cons:**
- Guests can't save card for repeat bookings (but they can create account later)
- Manual payment collection via email link

**UX remains good** because we show clear messaging about when payment happens.

---

## Next Steps

1. Disable Setup Intent for guest users (2-line change)
2. Ensure deferred payment flow works for guests
3. Test guest booking end-to-end
4. Consider post-booking account creation upsell
