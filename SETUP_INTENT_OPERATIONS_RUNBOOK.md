# Setup Intent Operations Runbook

**Version**: 1.0  
**Last Updated**: October 7, 2025  
**Audience**: Operations Team, Customer Support, DevOps

---

## 📖 Overview

This runbook provides operational procedures for managing the Setup Intent payment system. It covers common scenarios, troubleshooting steps, and escalation procedures.

---

## 🎯 Quick Reference

### Key Concepts

**Setup Intent**: Stripe's method to save payment information ($0.00 charge)
- Validates card is real and active
- Saves card securely for future charges
- No actual money charged until service complete

**Payment Saga**: Our atomic payment flow
- Creates order → Saves payment → Validates card → Finalizes order
- Auto-rolls back if any step fails
- Prevents orphaned orders or charges

**Variance Threshold**: 20%
- If partner's quote is >20% different from estimate
- Customer must approve before charging
- If <20%, auto-approve and charge

---

## 🔧 Common Scenarios

### Scenario 1: Customer Books Service Successfully

**What Happens**:
1. Customer enters card information
2. SetupIntent created with $0.00 authorization
3. Card validated (may require 3DS authentication)
4. Payment method saved to Stripe customer
5. Order created with status `pending_pickup`
6. Customer receives confirmation

**Verification**:
- Check Stripe dashboard for SetupIntent (status: `succeeded`)
- Verify order exists with `saved_payment_method_id` populated
- Confirm customer has `stripe_customer_id` in profile

**Logs to Look For**:
```
event: payment_saga_success
saga_id: <uuid>
order_id: <uuid>
steps_completed: 3
```

---

### Scenario 2: 3DS Authentication Required

**What Happens**:
1. Customer enters card requiring 3DS
2. SetupIntent returns `status: requires_action`
3. Customer redirected to bank's authentication page
4. Customer completes 3DS challenge
5. Redirected back with `redirect_status=succeeded`
6. Order creation completes

**Customer Sees**:
- Redirect to bank website/app
- Authentication challenge (SMS code, biometric, etc.)
- Return to Tidyhood with success message

**Troubleshooting**:
- **If redirect fails**: Check `NEXT_PUBLIC_BASE_URL` is set correctly
- **If stuck on auth page**: Customer may need to check bank notifications
- **If redirect_status=failed**: Card declined, ask customer to try different card

**Logs to Monitor**:
```
event: saga_payment_method_saved
status: requires_action
client_secret: seti_xxx...
```

---

### Scenario 3: Card Declined/Invalid

**What Happens**:
1. Customer enters card information
2. Stripe validates card
3. Card declined (insufficient funds, expired, etc.)
4. Saga rolls back (order deleted)
5. Customer sees error message

**Customer Sees**:
- Toast notification: "Payment verification failed. Please try again."
- Form remains filled (can try different card)

**Resolution Steps**:
1. Ask customer to verify card details
2. Check expiration date
3. Try different payment method
4. If persistent, may be bank-side fraud detection

**Logs to Look For**:
```
event: payment_saga_compensation_start
error: "Your card was declined..."
```

---

### Scenario 4: Payment Method from Different Customer

**What Happens**:
1. Saved payment method retrieved
2. Belongs to different Stripe customer
3. Saga auto-detaches and re-attaches to correct customer
4. Booking continues normally

**When This Occurs**:
- Testing with multiple accounts
- User's Stripe customer ID was reset
- Development/staging environment cleanup

**Resolution**: Automatic (no action needed)

**Logs to Look For**:
```
event: payment_method_reattachment_needed
old_customer: cus_xxx
new_customer: cus_yyy
---
event: payment_method_reattached
payment_method_id: pm_xxx
customer_id: cus_yyy
```

---

## 🚨 Error Scenarios

### Error 1: "Payment method does not belong to customer"

**Symptoms**:
- Booking fails with 500 error
- Saga compensation triggers
- Order deleted

**Cause**: Payment method attached to wrong customer

**Resolution**:
1. **Automatic** (as of Oct 7, 2025): Saga now auto-reattaches
2. **If still failing**: Ask customer to use "+ Use a different card"
3. **Last resort**: Clear saved payment methods via admin panel

**Prevention**: Now handled automatically by payment saga

---

### Error 2: "SetupIntent requires action but client not redirecting"

**Symptoms**:
- Order stuck in pending
- Customer reports "nothing happening"

**Cause**: Frontend not handling `requires_action` status

**Resolution**:
1. Check browser console for errors
2. Verify `NEXT_PUBLIC_BASE_URL` is set
3. Ensure JavaScript is enabled
4. Try different browser

**Escalation**: Engineering team if persistent

---

### Error 3: "Card validation charge failed"

**Symptoms**:
- Saga compensation
- Customer charged $0.01 and refunded
- Order not created

**Cause**: 
- Card has insufficient funds
- Card blocked for online transactions
- Bank fraud detection

**Resolution**:
1. Check `CARD_VALIDATION_ENABLED` flag (should be `false` for production)
2. If enabled, customer sees instant refund
3. Ask customer to contact bank
4. Try different payment method

**Note**: Card validation is optional (disabled in production to reduce friction)

---

## 💳 Payment Capture Scenarios

### Scenario 5: Partner Quotes Within 20% Variance

**What Happens**:
1. Partner submits quote
2. System calculates variance: `(quote - estimate) / estimate * 100`
3. If < 20%: Auto-approve
4. Payment captured immediately
5. Customer charged
6. Email receipt sent

**Timeline**: Immediate (within seconds)

**Verification**:
- Check order status changed to `awaiting_payment` → `paid`
- Verify Stripe PaymentIntent created and captured
- Confirm customer email receipt sent

---

### Scenario 6: Partner Quotes >20% Variance

**What Happens**:
1. Partner submits quote
2. Variance calculated: >20%
3. Partner sees yellow warning banner
4. Quote still submitted
5. Customer must approve via email/SMS link
6. After approval, payment captured

**Customer Experience**:
- Receives SMS/email: "Your quote is ready: $XX.XX (X% higher than estimated)"
- Link to approve or contact support
- Approval required before charging

**Partner Experience**:
- Warning: "Large Price Variance Detected"
- Shows estimate vs quote comparison
- Encourages double-checking measurements

**Resolution Timeline**: Customer-dependent (up to 24 hours)

---

## 🏃 Rush Service Scenarios

### Scenario 7: Customer Selects Rush Service

**What Happens**:
1. Customer checks "24-Hour Rush Service"
2. Pricing updates: +25% surcharge
3. Order created with `rushService: true` flag
4. Partner sees rush indicator
5. SLA countdown starts from pickup time

**Rush SLA**:
- Pickup before 11 AM → Same-day return
- Pickup after 11 AM → Next-day return
- 24-hour maximum from pickup

**Partner Notifications**:
- Rush orders flagged with ⚡ icon
- SMS alert for rush pickups
- Priority in order queue

**Escalation**: If SLA missed, refund rush fee automatically

---

## 📞 Customer Support FAQs

### "Why did you charge $0.00 to my card?"

**Answer**: 
"We saved your payment information securely to hold your booking. No actual charge was made - this is just a temporary $0.00 authorization to verify your card works. You'll only be charged the exact amount after we complete your service."

### "When will I actually be charged?"

**Answer**:
"For cleaning: After we finish cleaning your home (same day as service)
For laundry: After we weigh your items and calculate the final price (usually within 24 hours of pickup)

You'll receive an email receipt immediately when charged."

### "Why is the final price different from the estimate?"

**Answer**:
"For laundry, the estimate is based on your selected load size, but we charge based on actual weight.
For cleaning, we may discover additional work needed or use less time than estimated.

If the difference is more than 20%, we'll ask for your approval before charging. If it's less than 20%, we charge the actual amount automatically to save you time."

### "Is my credit card information secure?"

**Answer**:
"Yes! Your card information is stored by Stripe, our PCI-compliant payment processor. We never store your full card number on our servers - we only store a secure reference token. Stripe is used by millions of businesses worldwide including Amazon, Google, and Shopify."

### "Can I change my payment method?"

**Answer**:
"Yes! Go to your account settings to add a new card or remove old ones. You can also select a different saved card when booking."

---

## 🔍 Troubleshooting Guide

### Issue: Order Created But No Payment Method Saved

**Check**:
1. Order status - should be `pending_pickup` not `draft`
2. `saved_payment_method_id` field - should be populated
3. `setup_intent_id` field - should be populated

**If Missing**:
1. Check payment_sagas table for failed saga
2. Review error logs for compensation triggers
3. Verify Stripe customer exists for user
4. Manual fix: Contact customer for new payment method

---

### Issue: Customer Charged Twice

**Should Never Happen** (saga prevents this)

**If It Does**:
1. Check payment_intents in Stripe for duplicates
2. Review order_events table for multiple capture attempts
3. Issue immediate refund
4. Escalate to engineering ASAP
5. Investigate saga compensation failure

---

### Issue: Rush Service Not Applied

**Check**:
1. Order details → `rushService: true/false`
2. Pricing breakdown for rush line item
3. Partner dashboard showing rush indicator

**If Missing**:
1. Verify UI checkbox was checked
2. Check pricing calculation included rush
3. Review API request body logs
4. Manual fix: Adjust invoice or refund difference

---

## 📊 Monitoring & Alerts

### Key Metrics to Monitor

**Setup Intent Success Rate**:
- Target: >95%
- If <90%: Investigate card declines or 3DS failures

**Saga Completion Rate**:
- Target: >98%
- If <95%: Check Stripe API errors or database timeouts

**3DS Completion Rate**:
- Target: >85%
- If <80%: May indicate redirect issues

**Variance Approval Rate**:
- Track: % of quotes >20% variance
- Trend: Should decrease as partners improve estimates

**Rush Service Adoption**:
- Track: % of laundry orders with rush
- Revenue: Rush premium revenue per week

### Log Events to Monitor

**Success Events**:
- `payment_saga_success` - Normal flow
- `saga_payment_method_saved` - PM saved
- `payment_method_reattached` - Auto-fix worked

**Warning Events**:
- `payment_method_reattachment_needed` - Testing artifact
- `payment_method_check_skipped` - Failed PM retrieval
- `large_variance_detected` - Partner quote >20%

**Error Events**:
- `payment_saga_failed` - Booking failed
- `saga_compensation_start` - Rollback triggered
- `stripe_api_error` - Stripe issues

---

## 🔐 Security Procedures

### PCI Compliance

**What We Store**:
- Stripe customer ID (`cus_xxx`)
- Payment method ID (`pm_xxx`)  
- Last 4 digits, brand, expiration (from Stripe)

**What We DON'T Store**:
- Full card numbers
- CVV codes
- Raw card data

**Compliance**: PCI-DSS Level 1 via Stripe

### Data Retention

**Payment Methods**:
- Stored indefinitely until customer removes
- Can be deleted via account settings
- Automatically detached if customer deleted

**SetupIntents**:
- Logged for 90 days
- Then archived to cold storage
- Available for dispute resolution

### Incident Response

**If Card Data Leaked**:
1. This should be impossible (we don't store card data)
2. If Stripe credentials leaked:
   - Rotate API keys immediately
   - Notify all customers
   - Force re-authentication
   - Review all recent transactions

---

## 📈 Operational Playbooks

### Playbook: High Decline Rate

**Trigger**: >10% of bookings failing payment validation

**Investigation Steps**:
1. Check Stripe dashboard for decline reasons
2. Group by decline code (insufficient_funds, expired_card, etc.)
3. Review card brands affected
4. Check for geographic patterns

**Actions**:
- If fraud detection: Review with Stripe Risk team
- If expired cards: Email campaign to update cards
- If insufficient funds: Offer deposit option

---

### Playbook: Variance Disputes

**Trigger**: Customer disputes charge due to variance

**Resolution Steps**:
1. Pull order details and pricing breakdown
2. Show customer original estimate vs final quote
3. Explain variance calculation
4. If quote error: Issue refund and apologize
5. If measurement accurate: Offer 10% goodwill discount

**Prevention**:
- Train partners on accurate estimation
- Add photos to quotes for transparency
- Improve estimate accuracy over time

---

### Playbook: Rush Service SLA Miss

**Trigger**: Rush order not completed within 24 hours

**Immediate Actions**:
1. Contact partner for status update
2. If delay on partner side: Issue rush fee refund
3. If delay on customer side: Document reason
4. Notify customer of delay

**Compensation**:
- Full rush fee refund ($X.XX)
- Apology email
- 10% off next order coupon

---

## 🛠️ Admin Tools

### View Payment Saga Status

```sql
-- Check saga for specific order
SELECT * FROM payment_sagas 
WHERE params->>'order_id' = '<order_id>';

-- Recent failed sagas
SELECT * FROM payment_sagas
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### View Saved Payment Methods

```sql
-- Customer's saved cards
SELECT 
  stripe_customer_id,
  email,
  name
FROM profiles
WHERE id = '<user_id>';
```

Then check Stripe dashboard for `cus_xxx` to see payment methods.

### Manually Trigger Payment Capture

**Use Case**: Quote approved but capture failed

**Steps**:
1. Go to admin panel → Orders → [Order ID]
2. Click "Force Payment Capture"
3. System creates PaymentIntent with saved card
4. Or use API:

```bash
curl -X POST /api/orders/<order_id>/capture \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json"
```

---

## 📞 Escalation Procedures

### Level 1: Customer Support
**Handles**:
- General payment questions
- Rush service inquiries
- Invoice clarifications
- Card decline explanations

### Level 2: Operations Manager  
**Handles**:
- Variance disputes
- SLA violations
- Refund approvals
- Partner payment issues

### Level 3: Engineering
**Handles**:
- Saga failures
- Stripe API errors
- Circuit breaker trips
- Database consistency issues

**Escalate Immediately If**:
- Multiple payment sagas failing (>5% failure rate)
- Stripe webhook not firing
- Circuit breaker open for >30 minutes
- Customer charged without order completion
- Data inconsistency between Stripe and database

---

## 📊 Reporting

### Daily Reports

**Payment Saga Dashboard**:
- Total bookings attempted
- Success rate
- Average saga duration
- Failure breakdown by error type

**Revenue Metrics**:
- Total payment captures
- Rush service revenue
- Average order value
- Refund rate

### Weekly Reviews

**Operational Health**:
- Variance dispute rate
- Rush SLA compliance rate
- 3DS completion rate
- Payment method retention

**Partner Performance**:
- Variance accuracy per partner
- Rush service completion per partner
- Payment capture time

---

## 🔄 Rollback Procedures

### Disable Setup Intent Feature

**If Critical Issue Discovered**:

1. Set feature flag:
```bash
# In .env.production
SETUP_INTENT_ENABLED=false
```

2. Deploy or restart application

3. System automatically falls back to deferred payment

**Impact**:
- New bookings use old flow (no card at booking)
- Existing saved cards still work
- Orders in progress continue normally

### Rollback Database Changes

**If Migration Issues**:

```bash
# Use rollback migration
npm run migrate:rollback -- 023_payment_authorization_system
```

**Post-Rollback**:
- Verify old payment flow working
- Communicate with customers about any saved cards
- Plan re-deployment with fixes

---

## 📚 Related Resources

- Stripe Dashboard: https://dashboard.stripe.com
- Stripe API Docs: https://stripe.com/docs/api/setup_intents
- Internal Wiki: [Setup Intent Technical Guide]
- Deployment Guide: `DEPLOYMENT_GUIDE_PRODUCTION.md`
- Test Scenarios: `STRIPE_PAYMENT_TESTING_AUDIT_PLAN.md`

---

## ✅ Operational Checklist

### Daily:
- [ ] Review payment saga success rate
- [ ] Check for failed bookings
- [ ] Monitor variance disputes
- [ ] Verify rush SLA compliance

### Weekly:
- [ ] Analyze decline reasons
- [ ] Review partner variance accuracy
- [ ] Check 3DS completion trends
- [ ] Assess rush service adoption

### Monthly:
- [ ] Audit payment method security
- [ ] Review refund patterns
- [ ] Update documentation
- [ ] Train new support staff

---

**Maintained By**: Engineering Team  
**Questions**: support@tidyhood.com  
**Emergency**: #engineering-alerts Slack channel
