# Guest Card Collection - Implementation Status

**Date:** October 25, 2025  
**Goal:** Collect payment cards from ALL users (guest + authenticated)

---

## ✅ COMPLETED - UI Layer

### 1. Payment Section Now Visible for Guests
- **Before:** Only shown if `user && address && selectedSlot`
- **After:** Shown if `address && selectedSlot` (for everyone)
- **Location:** Appears between "Schedule" and "Contact Information" sections

### 2. Guest-Specific Messaging
Added yellow banner for guests:
> ⚡ **Secure your booking** - We'll save your card now and charge you after service completion. $0.00 charged today.

### 3. Submit Button Updated
- Requires `paymentMethodId` for ALL users
- No longer auth-only requirement

###4. Stripe Payment Collector Fixed
- Skips saved cards API call for guest users
- Shows new card form directly for guests

---

## ⚠️ REMAINING WORK - Backend Saga

### Problem
The payment saga (`lib/payment-saga.ts`) requires updates to handle guest users:

**Current Issues:**
1. **Line 285:** `getOrCreateStripeCustomer(userId)` expects non-null userId
2. **Line 368:** Creates Stripe customer using guest email (needs implementation)
3. **Line 422:** Stores `stripe_customer_id` in profiles table (guests don't have profiles)
4. **Line 152:** Creates order with `user_id` field (needs to support guest fields)

### Required Changes

#### 1. Update `createDraftOrder()` Method
```typescript
const orderData = {
  // Conditional user_id assignment
  user_id: params.user_id || null,
  
  // Add guest fields if not authenticated
  guest_name: params.guest_name || null,
  guest_email: params.guest_email || null,
  guest_phone: params.guest_phone || null,
  
  // ... rest of order data
};
```

#### 2. Update `getOrCreateStripeCustomer()` Method
```typescript
private async getOrCreateStripeCustomer(
  userId?: string,
  guestEmail?: string,
  guestName?: string
): Promise<string> {
  // For authenticated users
  if (userId) {
    // Existing profile logic
  }
  
  // For guest users  
  if (guestEmail) {
    // Create ephemeral Stripe customer
    const customer = await stripe.customers.create({
      email: guestEmail,
      name: guestName,
      metadata: { 
        is_guest: 'true',
        guest_email: guestEmail 
      }
    });
    
    return customer.id;
  }
  
  throw new Error('Either userId or guestEmail required');
}
```

#### 3. Update `finalizeOrder()` Method
```typescript
private async finalizeOrder(orderId: string, setupResult: SetupResult) {
  const { data: order } = await this.db
    .from('orders')
    .select('user_id, guest_email')
    .eq('id', orderId)
    .single();
    
  let stripeCustomerId: string;
  
  if (order.user_id) {
    // Authenticated user - get from profile
    const { data: profile } = await this.db
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', order.user_id)
      .single();
      
    stripeCustomerId = profile.stripe_customer_id;
  } else {
    // Guest user - retrieve from SetupIntent
    const setupIntent = await stripe.setupIntents.retrieve(setupResult.setup_intent_id);
    stripeCustomerId = setupIntent.customer as string;
  }
  
  // Update order with payment details
  await this.db
    .from('orders')
    .update({
      stripe_customer_id: stripeCustomerId,
      saved_payment_method_id: setupResult.payment_method_id,
      // ...
    })
    .eq('id', orderId);
}
```

#### 4. Update `validateCard()` Signature
```typescript
private async validateCard(
  paymentMethodId: string,
  userId?: string,
  guestEmail?: string,
  guestName?: string
) {
  const customerId = await this.getOrCreateStripeCustomer(userId, guestEmail, guestName);
  // ... rest of validation
}
```

#### 5. Update `savePaymentMethod()` Call
```typescript
const setupResult = await this.savePaymentMethod(params, draftOrder);

// Update to pass guest info to validateCard
if (getCardValidationAmount() > 0) {
  await this.validateCard(
    setupResult.payment_method_id,
    params.user_id,
    params.guest_email,
    params.guest_name
  );
}
```

---

## 🧪 TESTING PLAN

### After Backend Updates:

1. **Guest Booking with Card:**
   - Visit `/book/cleaning` while logged out
   - Fill form, select slot
   - **Verify:** Card input section appears
   - Enter test card: `4242 4242 4242 4242`
   - Enter guest contact info
   - Submit booking
   - **Verify:** Order created with guest fields + stripe_customer_id

2. **Database Validation:**
   ```sql
   SELECT 
     id,
     user_id,
     guest_name,
     guest_email,
     guest_phone,
     stripe_customer_id,
     saved_payment_method_id
   FROM orders 
   WHERE guest_email IS NOT NULL
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

3. **Stripe Dashboard:**
   - Check that customer was created with `is_guest: true` metadata
   - Verify payment method is attached to customer
   - Check SetupIntent status is `succeeded`

---

## 📝 NEXT STEPS

To complete Option A (card collection for guests):

1. Update `lib/payment-saga.ts` with the 5 changes above
2. Test guest booking end-to-end
3. Verify Stripe customer creation
4. Verify auto-charge works after service completion
5. Add migration to add `stripe_customer_id` to orders table if not already present

**Estimated Time:** 1-2 hours

---

## 🎯 CURRENT STATE

**What Works:**
- ✅ Guest checkout UI (name, email, phone)
- ✅ Card input appears for guests after slot selection
- ✅ Guest data passed to `/api/payment/setup`
- ✅ Login wall removed
- ✅ "Book as Guest" button working

**What Needs Work:**
- ⚠️ Payment saga fails when guest submits (Unauthorized error)
- ⚠️ Needs guest Stripe customer creation logic
- ⚠️ Needs to store stripe_customer_id on orders (not just profiles)

**To Test UI Now:**
Visit `/book/cleaning`, fill out form, select a date + time slot → card input should appear!
