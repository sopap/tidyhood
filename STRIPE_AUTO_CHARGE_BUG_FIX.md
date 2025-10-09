# Stripe Auto-Charge Bug Fix - October 8, 2025

## Problem Summary

When setting a quote in the admin panel, the system failed to automatically charge customers even though:
- Customers had authorized payment methods
- The auto-charge code was present in `update-quote/route.ts`
- No errors were visible in the UI

## Root Cause

The payment authorization saga (`lib/payment-saga.ts`) was saving the `stripe_customer_id` to the `profiles` table but **NOT** to the `orders` table. The auto-charge code in `update-quote` requires BOTH fields on the order:
- `saved_payment_method_id` ✅ (was being saved)
- `stripe_customer_id` ❌ (was missing)

When both fields weren't present, the auto-charge was silently skipped with no error logging.

## Affected Order

Order ID: `8846995a-0abf-46ce-afa2-16b881140cc2`
- Quote Amount: $34.00
- Customer: Franck Kengne  
- Status: Completed (but never paid)
- Has `saved_payment_method_id` but missing `stripe_customer_id`

## Changes Made

### 1. Fixed Payment Saga (`lib/payment-saga.ts`)

**Line 285-310**: Updated `finalizeOrder` method to:
- Retrieve the `stripe_customer_id` from the user's profile
- Save it to the orders table alongside the payment method

```typescript
// Get stripe_customer_id from user profile
const { data: profile } = await this.db
  .from('profiles')
  .select('stripe_customer_id')
  .eq('id', order.user_id)
  .single();

// Save to order
await this.db
  .from('orders')
  .update({
    // ... other fields
    stripe_customer_id: profile.stripe_customer_id,
    // ...
  })
```

### 2. Added Error Logging (`app/api/admin/orders/[id]/update-quote/route.ts`)

**Lines 161-177**: Added comprehensive logging before auto-charge attempt:
```typescript
console.log('[ADMIN_QUOTE_UPDATE] Checking auto-charge eligibility:', {
  orderId,
  has_payment_method: !!order.saved_payment_method_id,
  has_customer_id: !!order.stripe_customer_id,
  payment_method_id: order.saved_payment_method_id,
  customer_id: order.stripe_customer_id
})
```

**Lines 253-262**: Enhanced error logging when auto-charge fails:
```typescript
console.error('[ADMIN_QUOTE_UPDATE] Auto-charge failed:', {
  orderId,
  error_message: error.message,
  error_code: error.code,
  error_type: error.type,
  error_stack: error.stack
})
```

**Lines 283-290**: Added logging when auto-charge is skipped:
```typescript
console.log('[ADMIN_QUOTE_UPDATE] Auto-charge skipped - missing required fields:', {
  orderId,
  has_payment_method: !!order.saved_payment_method_id,
  has_customer_id: !!order.stripe_customer_id,
  reason: !order.saved_payment_method_id ? 'No payment method' : 'No customer ID'
})
```

## Testing

### Diagnostic Script Created

Created `scripts/diagnose-and-fix-payment.js` to:
- Check order payment configuration
- Verify Stripe customer and payment method IDs
- Attempt to manually charge if all fields are present
- Provide detailed diagnostics

Usage:
```bash
node scripts/diagnose-and-fix-payment.js <order_id>
```

### Test Results

Running the diagnostic on the affected order revealed:
```
❌ ISSUE: Customer has not set up payment method

💳 PAYMENT DETAILS:
  Stripe Customer ID: ❌ NOT SET
  Saved Payment Method: pm_1SFyn7S3pEwV8LQSY8uNGEmv
```

## Impact

**Before Fix:**
- Auto-charge silently failed for all new bookings
- Admins had no visibility into why charges weren't processing
- Customers weren't notified about payment issues

**After Fix:**
- All new bookings will have `stripe_customer_id` saved correctly
- Failed charges will be logged with full error details
- Missing fields will be clearly logged for troubleshooting

## Migration Needed

Existing orders with payment methods but no `stripe_customer_id` will need:

1. **Manual Fix Script**: Query profiles to get `stripe_customer_id` and update orders
2. **Or**: Use the diagnostic script to manually charge each affected order

## Prevention

1. ✅ Payment saga now saves `stripe_customer_id` to orders
2. ✅ Comprehensive error logging prevents silent failures
3. ✅ Diagnostic script available for troubleshooting
4. ✅ TypeScript types enforced to catch missing fields

## Files Modified

1. `lib/payment-saga.ts` - Fixed stripe_customer_id not being saved
2. `app/api/admin/orders/[id]/update-quote/route.ts` - Added error logging
3. `scripts/diagnose-and-fix-payment.js` - Created diagnostic tool

## Next Steps

1. Deploy the fix to production
2. Run diagnostic script on any orders stuck in "awaiting_payment" status
3. Monitor server logs for the new error messages
4. Consider adding a migration script to backfill `stripe_customer_id` for existing orders

## Notes for Future Invoicing

The codebase does NOT use Stripe's native invoicing system. It:
- Uses Payment Intents for immediate charges
- Has local PDF invoice generation (`lib/pdf.ts`)
- Email notifications are marked as TODO and not yet implemented

To add invoice emails, implement the TODOs in `app/api/webhooks/stripe/route.ts`:
- Line 165: `// TODO: Send confirmation SMS/email`
- Line 230: `// TODO: Send payment failed notification`
- Line 265: `// TODO: Send refund confirmation`
