# Safe Deployment Guide - Booking Flow Improvements
**Purpose:** Ensure booking flow improvements enhance UX without breaking existing functionality  
**Date:** October 25, 2025  
**Risk Level:** Medium (New code replacing production-tested code)

---

## Pre-Deployment Safety Checklist

### 1. Code Review & Compatibility Analysis

**Review existing integrations to ensure improvements don't break:**

```bash
# Files to review for compatibility
app/book/laundry/page.tsx          # Current production version
app/book/laundry/page-new.tsx      # Improved version (to deploy)
app/api/orders/route.ts            # Order creation endpoint
app/api/slots/route.ts             # Slot availability
app/api/estimate/route.ts          # Price estimation (NEW)
lib/pricing.ts                     # Core pricing logic
lib/capacity.ts                    # Capacity management
lib/sms.ts                         # SMS notifications
```

**Critical Integration Points:**
- [ ] Order creation flow unchanged (POST /api/orders)
- [ ] Database schema compatible (orders, profiles, capacity_calendar)
- [ ] Payment flow integration maintained
- [ ] SMS notification triggers preserved
- [ ] Slot booking logic intact
- [ ] Pricing calculation consistency verified

### 2. Environment Variable Check

**Ensure all required env vars exist:**

```bash
# Required for new features
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  # Payment integration
DATABASE_URL                         # Supabase connection
NEXT_PUBLIC_ALLOWED_ZIPS            # ZIP validation
GOOGLE_MAPS_API_KEY                 # Address autocomplete

# Optional but recommended
SENTRY_DSN                          # Error tracking
VERCEL_ENV                          # Environment detection
```

**Validation Command:**
```bash
node scripts/test-env-validation.js
```

### 3. Database Compatibility

**Verify database supports new features:**

```sql
-- Check if estimate-related tables exist (if any)
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%pricing%';

-- Verify orders table has all required fields
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders';

-- Check capacity_calendar structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'capacity_calendar';
```

**Expected fields in orders table:**
- `service_type` (laundry/cleaning)
- `weight_tier` or `estimated_pounds`
- `addons` (jsonb)
- `promo_code` (text, nullable)
- `subtotal`, `discount`, `total` (numeric)

---

## Deployment Strategy: Phased Rollout

### Phase 1: Shadow Testing (1-2 days)

**Deploy to staging/preview environment ONLY:**

```bash
# Create feature branch
git checkout -b booking-improvements-staging

# Deploy to Vercel preview
vercel --prod=false

# Test URL: https://tidyhood-[hash].vercel.app
```

**Test Matrix:**

| Test Case | Current Flow | New Flow | Pass/Fail |
|-----------|-------------|----------|-----------|
| Complete booking (laundry) | ✓ | ✓ | |
| Price estimation | N/A | ✓ | |
| Add-ons selection | ✓ | ✓ | |
| Promo code (WELCOME10) | ✗ | ✓ | |
| Slot selection | ✓ | ✓ | |
| SMS confirmation | ✓ | ✓ | |
| Mobile experience | ⚠️ | ✓ | |
| Keyboard navigation | ⚠️ | ✓ | |

**Required: 100% pass rate before proceeding**

### Phase 2: A/B Test (3-7 days) [RECOMMENDED]

**Deploy both versions, split traffic:**

```typescript
// middleware.ts or page.tsx
import { cookies } from 'next/headers';

export default function BookingPage() {
  const cookieStore = cookies();
  const variant = cookieStore.get('booking_variant')?.value;
  
  // 50/50 split for logged-in users, or based on date
  const useNewFlow = variant === 'new' || (Date.now() % 2 === 0);
  
  if (useNewFlow) {
    return <NewBookingFlow />;
  }
  return <LegacyBookingFlow />;
}
```

**Metrics to Monitor:**
- Conversion rate (old vs new)
- Average time to complete booking
- Abandonment rate by step
- Error rate
- Mobile vs desktop performance

**Success Criteria:**
- New flow conversion ≥ old flow (ideally 10%+ higher)
- Error rate ≤ old flow
- No increase in support tickets
- No payment processing issues

### Phase 3: Full Deployment

**Only after successful A/B test:**

```bash
# Backup current production version
git tag booking-flow-v1-backup
git push origin booking-flow-v1-backup

# Create backup file
cp app/book/laundry/page.tsx app/book/laundry/page-v1-backup.txt

# Deploy new version
mv app/book/laundry/page-new.tsx app/book/laundry/page.tsx

# Commit and deploy
git add .
git commit -m "Deploy improved booking flow (tested in A/B)"
git push origin main

# Monitor for 24-48 hours
```

---

## Testing Protocol

### Manual Testing Checklist

**Desktop (Chrome, Safari, Firefox):**
- [ ] Load booking page without errors
- [ ] Enter valid address, see slots load
- [ ] Select service type (Wash & Fold, Dry Clean, Mixed)
- [ ] Select load size (Small, Medium, Large)
- [ ] Add rush service addon
- [ ] See price estimate update in real-time
- [ ] Apply promo code WELCOME10 (should show discount)
- [ ] Select time slot
- [ ] Enter phone number
- [ ] Submit booking
- [ ] Verify order created in database
- [ ] Verify SMS sent (check logs)
- [ ] Navigate to order detail page
- [ ] Verify all order info displayed correctly

**Mobile (iOS Safari, Android Chrome):**
- [ ] All desktop tests pass
- [ ] Sticky CTA bar appears at bottom
- [ ] Touch targets sufficiently large (44x44px minimum)
- [ ] Form inputs trigger correct mobile keyboards
- [ ] No horizontal scrolling required
- [ ] Date/time pickers mobile-friendly

**Accessibility (NVDA/JAWS screen reader):**
- [ ] Page structure announced correctly
- [ ] Form labels read properly
- [ ] Error messages announced in live regions
- [ ] Price updates announced
- [ ] All interactive elements reachable via keyboard
- [ ] Focus indicators visible
- [ ] Skip links present and functional

**Edge Cases:**
- [ ] Invalid ZIP code (should show error)
- [ ] No available slots (should show empty state)
- [ ] Network error during slot fetch (should show retry)
- [ ] Duplicate booking attempt (should prevent)
- [ ] Invalid promo code (should show error)
- [ ] Session timeout (should preserve draft)

### Automated Testing

**Run existing test suite:**
```bash
npm test -- __tests__/booking.spec.tsx
npm test -- __tests__/api/orders.api.spec.ts
```

**Expected: All tests pass**

**Add new tests for new features:**
```typescript
// __tests__/booking-improvements.spec.tsx

describe('Booking Flow Improvements', () => {
  test('Price estimate updates when load size changes', async () => {
    // Test real-time estimation
  });
  
  test('Promo code WELCOME10 applies 10% discount', async () => {
    // Test promo code logic
  });
  
  test('Progress stepper shows correct step', async () => {
    // Test stepper component
  });
  
  test('Sticky CTA appears on mobile', async () => {
    // Test mobile sticky bar
  });
  
  test('Fallback to old flow if new components error', async () => {
    // Test error boundary
  });
});
```

---

## Compatibility Safeguards

### 1. Feature Flags (Recommended)

**Add ability to toggle new features on/off:**

```typescript
// lib/feature-flags.ts
export const features = {
  enableRealtimeEstimate: process.env.NEXT_PUBLIC_ENABLE_ESTIMATE === 'true',
  enableProgressStepper: process.env.NEXT_PUBLIC_ENABLE_STEPPER === 'true',
  enableStickyCTA: process.env.NEXT_PUBLIC_ENABLE_STICKY_CTA === 'true',
  enablePromoCodes: process.env.NEXT_PUBLIC_ENABLE_PROMO === 'true',
};

// Usage in component
import { features } from '@/lib/feature-flags';

{features.enableRealtimeEstimate && <EstimatePanel />}
```

**Benefits:**
- Instant rollback via environment variable
- No code deployment needed
- Can enable for specific users only

### 2. Error Boundaries

**Wrap new components in error boundaries:**

```typescript
// app/book/laundry/page.tsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function BookingPage() {
  return (
    <ErrorBoundary 
      fallback={<LegacyBookingFlow />}
      onError={(error) => {
        console.error('New booking flow error:', error);
        // Log to Sentry
      }}
    >
      <NewBookingFlow />
    </ErrorBoundary>
  );
}
```

**Ensures:** If new flow breaks, users see old working version

### 3. Gradual Rollout via Vercel

**Use Vercel's edge config for canary deployment:**

```bash
# Deploy to 10% of traffic first
vercel --prod
# Monitor for 24 hours

# If successful, increase to 50%
# Then 100% after another 24 hours
```

---

## Rollback Procedures

### Instant Rollback (If Major Issue)

**Option 1: Revert via Git (5 minutes)**
```bash
# Revert to previous version
git revert HEAD
git push origin main

# Vercel auto-deploys in ~2-3 minutes
```

**Option 2: Feature Flag (Instant)**
```bash
# In Vercel dashboard, update env vars:
NEXT_PUBLIC_ENABLE_NEW_BOOKING=false

# Redeploy (or auto-redeploy on env change)
```

**Option 3: Vercel Instant Rollback**
```bash
# In Vercel dashboard: Deployments → Previous → Promote to Production
# Takes effect in ~30 seconds
```

### Partial Rollback (Disable Specific Features)

**If only one feature is problematic:**
```bash
# Disable just real-time estimates
NEXT_PUBLIC_ENABLE_ESTIMATE=false

# Keep other improvements (stepper, mobile CTA, etc.)
```

---

## Monitoring & Alerts

### Critical Metrics to Watch (First 48 Hours)

**Real-time monitoring:**
```javascript
// Set up alerts in Vercel/Sentry/Datadog

// Alert if:
- Error rate > 1% (previously <0.5%)
- Booking completion rate drops >10%
- API response time > 3s (previously <1s)
- Mobile crash rate > 0.5%
- /api/estimate endpoint 5xx errors
```

**Key URLs to Monitor:**
- `/book/laundry` - Page load errors
- `/api/orders` - Order creation errors  
- `/api/estimate` - Estimation endpoint (NEW)
- `/api/slots` - Slot availability

**Customer-Facing Indicators:**
- Support ticket volume (should not increase)
- Booking completion rate (should increase 10-30%)
- Cart abandonment rate (should decrease)
- Time to complete booking (should decrease)

### Logging Strategy

**Add detailed logging to new features:**
```typescript
// lib/logger.ts
import * as Sentry from '@sentry/nextjs';

export function logBookingEvent(event: string, data: any) {
  console.log(`[Booking] ${event}`, data);
  
  Sentry.addBreadcrumb({
    category: 'booking',
    message: event,
    data,
    level: 'info',
  });
}

// Usage
logBookingEvent('estimate_calculated', { 
  tier: 'medium', 
  total: 54.99,
  hasPromo: true 
});
```

---

## Known Risks & Mitigations

### Risk 1: New API Endpoint Overload
**Risk:** `/api/estimate` endpoint gets called too frequently  
**Mitigation:**
- Implement debouncing (500ms) ✅ Already in code
- Add rate limiting per IP
- Cache responses for common scenarios
- Monitor endpoint performance

### Risk 2: Browser Compatibility
**Risk:** New React features not supported in older browsers  
**Mitigation:**
- Test on IE11 (if needed), Safari 12+, Chrome 80+
- Add polyfills if necessary
- Graceful degradation for unsupported browsers

### Risk 3: Database Load
**Risk:** Real-time estimates query pricing rules frequently  
**Mitigation:**
- Cache pricing rules in Redis/memory
- Implement query optimization
- Monitor database CPU/connections

### Risk 4: Session/State Management
**Risk:** New stateful components conflict with existing logic  
**Mitigation:**
- Review all useState/useEffect hooks
- Test page refresh scenarios
- Verify no state leaks between bookings

### Risk 5: Third-Party Dependencies
**Risk:** New npm packages introduce vulnerabilities  
**Mitigation:**
```bash
# Audit dependencies
npm audit
npm audit fix

# Check for known vulnerabilities
npx snyk test
```

---

## Post-Deployment Validation

### First Hour Checklist

- [ ] Zero 5xx errors in logs
- [ ] At least 1 successful test booking
- [ ] SMS notifications still working
- [ ] Payment processing functional
- [ ] Mobile app not broken (if exists)
- [ ] Admin dashboard shows orders correctly

### First 24 Hours

- [ ] Conversion rate stable or improved
- [ ] Error rate < 0.5%
- [ ] No spike in support tickets
- [ ] Performance metrics stable
- [ ] All integrations working (Stripe, Twilio, etc.)

### First Week

- [ ] A/B test results positive (if applicable)
- [ ] Customer feedback collected
- [ ] Analytics data reviewed
- [ ] No regression issues reported
- [ ] Team trained on new features

---

## Emergency Contacts

**If issues arise during deployment:**

**Technical Lead:** [Name, Phone]  
**DevOps:** [Name, Slack channel]  
**Product Manager:** [Name, Email]  
**On-Call Engineer:** [Rotation schedule]

**Communication Plan:**
1. Identify issue severity (P0-P3)
2. Notify #engineering-alerts Slack channel
3. If P0 (site down): Immediate rollback
4. If P1 (major feature broken): Rollback within 1 hour
5. If P2 (minor issue): Fix forward or rollback within 4 hours
6. If P3 (cosmetic): Add to backlog, fix in next sprint

---

## Success Criteria Summary

**Deployment considered successful if:**

✅ Booking completion rate increases 10%+ OR stays stable  
✅ No increase in error rate  
✅ No increase in support tickets related to booking  
✅ Payment processing works 100%  
✅ SMS notifications delivered 100%  
✅ Mobile experience improved (measured via analytics)  
✅ Accessibility score improved (Lighthouse audit)  
✅ Page load time stable or improved  

**If any of these fail: Rollback and investigate**

---

## Appendix: Detailed Test Scenarios

### Scenario 1: Happy Path - Complete Booking

```gherkin
Given I am a customer on tidyhood.nyc
When I navigate to /book/laundry
Then I should see the booking form

When I enter address "123 Lenox Ave, New York, NY 10027"
Then I should see available time slots

When I select "Medium" load size
Then I should see estimated price ~$44

When I add "Rush (24h)" addon
Then price should update to ~$54

When I apply promo code "WELCOME10"
Then I should see 10% discount applied
And total should be ~$48.60

When I select tomorrow at 2 PM slot
And I enter phone number "555-0123"
And I click "Complete Booking"
Then I should be redirected to order confirmation
And I should receive SMS confirmation
And order should appear in database with status "pending"
```

### Scenario 2: Error Handling - Invalid Promo Code

```gherkin
Given I am on the booking form
And I have selected service options
When I enter promo code "INVALID123"
Then I should see error "Invalid promo code"
And price should remain unchanged
And booking should still be completable
```

### Scenario 3: Mobile UX - Sticky CTA

```gherkin
Given I am on mobile device (viewport <768px)
When I scroll down the booking form
Then I should see sticky CTA bar at bottom
And it should show current price estimate
And "Continue" button should be accessible
When I tap "Continue"
Then form should validate and proceed to next step
```

### Scenario 4: Accessibility - Screen Reader

```gherkin
Given I am using NVDA screen reader
When I navigate to booking form with keyboard
Then all form fields should be announced
When price updates after selecting options
Then update should be announced in live region
When I reach "Complete Booking" button
Then button purpose should be clearly announced
```

### Scenario 5: Network Error - Graceful Degradation

```gherkin
Given I am on booking form
When network connection is lost
And I try to fetch time slots
Then I should see "Connection error" message
And I should see "Retry" button
When I click "Retry"
Then slots should fetch successfully
And error message should disappear
```

---

## Conclusion

**Key Takeaways:**
1. **Test extensively** in staging before production
2. **Monitor closely** for first 48 hours post-deployment
3. **Be ready to rollback** instantly if needed
4. **Use feature flags** for gradual rollout
5. **Communicate clearly** with team about deployment status

**Remember:** The goal is to improve conversion WITHOUT breaking existing functionality. When in doubt, rollback and investigate.

---

**Document Version:** 1.0  
**Last Updated:** October 25, 2025  
**Next Review:** After first production deployment
