# Stripe Test/Live Mode Mismatch Fix

## Problem
Error: "No such PaymentMethod: 'pm_1SJyYWS3pEwV8LQSp8A4tGzk'"

This error occurs when there's a mismatch between test/live Stripe keys and the payment method being used.

## Root Cause Analysis

1. **Your Environment**: Using **test keys** (`.env.local` shows `sk_test_...` and `pk_test_...`)
2. **Payment Method**: The payment method ID `pm_1SJyYWS3pEwV8LQSp8A4tGzk` doesn't exist in your test Stripe account

This typically happens when:
- A payment method was created with live keys but you're now using test keys
- The payment method doesn't exist in your current Stripe account
- There was a previous session with different Stripe keys

## Solution Implemented

### 1. Enhanced Error Handling in `lib/payment-saga.ts`
Added validation that detects test/live mode mismatches and provides clear error messages:

```typescript
} catch (error: any) {
  // Check if this is a "No such PaymentMethod" error
  if (error.code === 'resource_missing' || error.message?.includes('No such')) {
    const isTestKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
    const isLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
    
    logger.error({
      event: 'payment_method_not_found',
      payment_method_id: params.payment_method_id,
      stripe_mode: isTestKey ? 'test' : isLiveKey ? 'live' : 'unknown',
      error: error.message
    });
    
    throw new Error(
      `Payment method not found. This usually means:\n` +
      `1. You're using ${isTestKey ? 'test' : 'live'} keys but the card was saved with ${isTestKey ? 'live' : 'test'} keys\n` +
      `2. The payment method doesn't exist in your Stripe account\n\n` +
      `Solution: Please add a new card or ensure you're using the correct Stripe keys (test vs live).`
    );
  }
  
  // Continue for other error types
  logger.warn({
    event: 'payment_method_check_skipped',
    payment_method_id: params.payment_method_id,
    error: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

## Immediate Fix for Users

When users encounter this error, they should:

1. **Clear saved payment methods** by logging out and logging back in
2. **Add a new card** using the test card numbers:
   - Test Card: `4242 4242 4242 4242`
   - Exp: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

3. **For testing with live keys**, update `.env.local`:
   ```bash
   # Replace test keys with live keys from Stripe Dashboard
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_SECRET_KEY=sk_live_...
   ```

## Verification Steps

1. Check your current Stripe mode:
   ```bash
   # In .env.local
   grep "STRIPE_SECRET_KEY" .env.local
   # Should show either sk_test_ (test mode) or sk_live_ (live mode)
   ```

2. Test with Stripe test cards:
   - https://stripe.com/docs/testing#cards

3. Monitor logs for payment method errors:
   ```typescript
   logger.error({
     event: 'payment_method_not_found',
     payment_method_id: '<ID>',
     stripe_mode: 'test|live',
   });
   ```

## Prevention

To prevent this issue in the future:

1. **Use separate databases** for test and live environments
2. **Clear browser storage** when switching between test/live modes:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

3. **Add environment indicators** to the UI showing test/live mode

4. **Database cleanup script** to remove payment methods created with wrong keys:
   ```sql
   -- Remove invalid Stripe customer IDs when switching modes
   UPDATE profiles 
   SET stripe_customer_id = NULL 
   WHERE stripe_customer_id LIKE 'cus_%';
   ```

## Testing

Test the fix with:
1. Try to pay with an invalid payment method ID
2. Verify error message shows clear instructions
3. Add a new test card
4. Complete a test payment

## Monitoring

Watch for these log events:
- `payment_method_not_found` - Indicates test/live mismatch
- `payment_method_check_skipped` - Other payment method errors
- `stripe_customer_created` - New customer created
- `payment_method_reattached` - Payment method moved between customers

## References

- [Stripe Test Cards](https://stripe.com/docs/testing#cards)
- [Stripe API Keys](https://dashboard.stripe.com/test/apikeys)
- [Stripe Customer Portal](https://dashboard.stripe.com/test/customers)
