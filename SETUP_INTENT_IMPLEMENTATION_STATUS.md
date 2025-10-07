# Setup Intent Implementation - Active Work

**Started**: October 7, 2025, 9:49 AM  
**Approach**: Setup Intent + $0.01 Card Validation  
**Estimated Completion**: 18 hours  
**Status**: IN PROGRESS

---

## 📋 Implementation Checklist

### Phase 1: Core Modifications (6h)
- [ ] Update `lib/payment-config.ts` - Remove authorization buffer logic
- [ ] Refactor `lib/payment-saga.ts` - Use SetupIntent + validation
- [ ] Update `supabase/migrations/023_payment_authorization_system.sql` - Change schema
- [ ] Update type definitions - Rename auth fields to setup fields
- [ ] Update `lib/orderStateMachine.ts` - Simplify transitions

### Phase 2: API Updates (4h)
- [ ] Rename `app/api/payment/authorize/route.ts` → `app/api/payment/setup/route.ts`
- [ ] Update `app/api/webhooks/stripe-payment/route.ts` - Handle SetupIntent events
- [ ] Rename `app/orders/[id]/auth-complete/page.tsx` → `setup-complete/page.tsx`
- [ ] Create `app/api/orders/[id]/request-payment/route.ts` - Failed charge recovery
- [ ] Delete `app/api/cron/auth-expiry-check/route.ts` - Not needed

### Phase 3: Integration (4h)
- [ ] Update `components/booking/StripePaymentCollector.tsx` - Change messaging
- [ ] Update `app/book/laundry/page.tsx` - Integrate Setup Intent flow
- [ ] Update partner quote logic - Auto-charge with saved payment method
- [ ] Update cancellation flow - Simpler (no auth to release)
- [ ] Add SMS templates for failed charges

### Phase 4: Testing & Documentation (4h)
- [ ] Test Setup Intent flow end-to-end
- [ ] Test $0.01 validation
- [ ] Test failed charge recovery
- [ ] Update documentation
- [ ] Create deployment guide

---

## 🎯 Current Status

**What's Built**:
- ✅ 20 files from authorization approach
- ✅ 70% directly reusable
- ✅ Infrastructure ready (circuit breaker, quota manager, etc.)

**What's Next**:
- 🔄 Adapting authorization files to Setup Intent
- 🔄 Simplifying where possible
- 🔄 Adding validation logic

---

## 📝 Key Changes from Authorization Approach

### Simpler Because:
- No authorization buffer calculations
- No 7-day expiry monitoring  
- No 10% Stripe capture limit
- No authorization vs estimate confusion

### Same Protection:
- Card validated at booking
- $25 no-show fee capability
- Payment method on file
- Can charge anytime

### Better Experience:
- Customer sees $0.00 (not $39 authorized)
- Marketing is 100% accurate
- No confusing holds
- Charge exact quote amount

---

**Next**: Begin file modifications
