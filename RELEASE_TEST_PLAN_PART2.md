# 🧪 TidyHood Release Test Plan (Enhanced) - Part 2

**Continuation from RELEASE_TEST_PLAN.md**

---

## 8. Security & Compliance (Continued)

### OWASP Top 10 Checklist

#### A01: Broken Access Control
- [ ] Test unauthorized access to `/api/admin/*`
- [ ] Test unauthorized access to `/api/partner/*`
- [ ] Test accessing other users' orders
- [ ] Test modifying other users' data
- [ ] Verify RLS policies block unauthorized queries

#### A02: Cryptographic Failures
- [ ] Verify HTTPS is enforced
- [ ] Check all sensitive data is encrypted at rest
- [ ] Verify passwords are hashed (Supabase handles this)
- [ ] Check API keys are not exposed in client code
- [ ] Verify Stripe keys are properly secured

#### A03: Injection
- [ ] Test SQL injection on form inputs
- [ ] Test XSS on user input fields (address, notes)
- [ ] Verify all API inputs are validated
- [ ] Check Supabase RLS prevents injection

#### A04: Insecure Design
- [ ] Review authentication flow security
- [ ] Verify session management is secure
- [ ] Check rate limiting on login attempts
- [ ] Verify password reset flow is secure

#### A05: Security Misconfiguration
- [ ] Check error messages don't expose sensitive info
- [ ] Verify CORS is properly configured
- [ ] Check security headers are set
- [ ] Verify environment variables are not exposed

#### A06: Vulnerable Components
- [ ] Run `npm audit` to check for vulnerabilities
- [ ] Update dependencies with known security issues
- [ ] Check Supabase SDK version is current
- [ ] Verify Next.js version is up to date

#### A07: Identification and Authentication Failures
- [ ] Test password complexity requirements
- [ ] Verify session timeout works correctly
- [ ] Test multi-device login scenarios
- [ ] Check "remember me" functionality

#### A08: Software and Data Integrity Failures
- [ ] Verify code signing/deployment process
- [ ] Check database backup procedures
- [ ] Verify rollback capability exists
- [ ] Test data integrity after migrations

#### A09: Security Logging and Monitoring
- [ ] Verify failed login attempts are logged
- [ ] Check critical actions are audited
- [ ] Set up alerts for suspicious activity
- [ ] Monitor API error rates

#### A10: Server-Side Request Forgery (SSRF)
- [ ] Test external URL inputs are validated
- [ ] Verify webhook endpoints are secured
- [ ] Check API rate limiting is in place

### PCI DSS Compliance (Stripe)

**Stripe handles most PCI compliance, but verify:**
- [ ] Never store credit card numbers
- [ ] Never log payment details
- [ ] Use Stripe's hosted checkout or Elements
- [ ] Verify SSL/TLS is enforced
- [ ] Check Stripe webhooks are validated

### GDPR & Privacy

- [ ] Privacy policy is accessible
- [ ] Terms of service is accessible
- [ ] User data can be exported
- [ ] User data can be deleted
- [ ] Cookie consent implemented (if EU traffic)
- [ ] Email opt-out works correctly

---

## 9. Edge Cases & Error Handling

### Network Failures

| Scenario | Expected Behavior | Test Status |
|----------|------------------|-------------|
| Submit order while offline | Show offline message, retry when online | ⏳ |
| Network drops mid-payment | Show error, allow retry | ⏳ |
| Slow network (3G) | Show loading indicators, no timeout errors | ⏳ |
| API timeout | Show user-friendly error message | ⏳ |
| Server 500 error | Show error page with retry option | ⏳ |

**How to Test:**
```bash
# Use Chrome DevTools
DevTools → Network tab → Throttling → Offline/Slow 3G
```

### Session Management Edge Cases

| Scenario | Expected Behavior | Test Status |
|----------|------------------|-------------|
| Session expires during booking | Redirect to login, preserve booking data | ⏳ |
| Session expires during payment | Redirect to login, preserve cart | ⏳ |
| Login on multiple devices | Sessions work independently | ⏳ |
| Logout on one device | Other devices session persists (or expires based on design) | ⏳ |
| Browser back button after logout | Redirects to login, no data exposed | ⏳ |

### Payment Edge Cases

| Scenario | Expected Behavior | Test Status |
|----------|------------------|-------------|
| Card declined | Show error, allow retry | ⏳ |
| Insufficient funds | Show specific error message | ⏳ |
| 3DS authentication failure | Show error, allow retry | ⏳ |
| Double-click submit | Prevent duplicate charges | ⏳ |
| Close modal during payment | Cancel payment, allow retry | ⏳ |
| Network fails after charge | Verify order still created | ⏳ |

### Booking Edge Cases

| Scenario | Expected Behavior | Test Status |
|----------|------------------|-------------|
| Select past date | Validation error, can't proceed | ⏳ |
| Select fully booked slot | Show "unavailable" message | ⏳ |
| Address not in service area | Show error with service area info | ⏳ |
| Invalid zip code | Validation error | ⏳ |
| Extremely large order | Handle gracefully, may require manual quote | ⏳ |
| Browser back during booking | Preserve form data | ⏳ |
| Submit booking twice | Prevent duplicate orders | ⏳ |

### Data Validation Edge Cases

| Field | Invalid Input | Expected Behavior | Test Status |
|-------|--------------|------------------|-------------|
| Email | "notanemail" | Validation error | ⏳ |
| Phone | "123" | Validation error | ⏳ |
| Zip Code | "ABCDE" | Validation error | ⏳ |
| Item Count | "-5" | Validation error | ⏳ |
| Item Count | "999999" | Validation error or warning | ⏳ |
| Bedrooms | "0" | Validation error or warning | ⏳ |
| Square Feet | "10" | Validation error or warning | ⏳ |

### Concurrent Operations

| Scenario | Expected Behavior | Test Status |
|----------|------------------|-------------|
| Partner accepts same order simultaneously | Only one succeeds, optimistic locking | ⏳ |
| User cancels while partner updates status | Proper conflict resolution | ⏳ |
| Multiple users book last slot | Only one succeeds | ⏳ |
| Edit order during status transition | Prevent edit or handle gracefully | ⏳ |

---

## 10. Regression Tests

### Previously Fixed Bugs

**Create checklist from git history:**

```bash
# Example format:
git log --oneline --grep="fix:" --since="6 months ago"
```

| Bug ID | Description | Fixed In | Re-test Status |
|--------|-------------|----------|----------------|
| #001 | Mobile login timeout | v1.0.1 | ⏳ |
| #002 | Address autocomplete fails on iOS | v1.0.2 | ⏳ |
| #003 | Payment modal doesn't close | v1.0.3 | ⏳ |
| #004 | Laundry form bedrooms/bathrooms error | v1.1.0 | ⏳ |
| #005 | Order status not updating real-time | v1.1.0 | ⏳ |

### Feature Regression Tests

**Test these features haven't broken after new changes:**

- [ ] Login/Signup (always test after any auth changes)
- [ ] Booking flows (test after any booking changes)
- [ ] Payment processing (test after any payment changes)
- [ ] Order management (test after any order changes)
- [ ] Partner portal (test after any partner changes)
- [ ] Admin dashboard (test after any admin changes)

### Database Schema Changes

**After any migration:**
- [ ] Run migration on test environment
- [ ] Verify existing data is not corrupted
- [ ] Test all CRUD operations
- [ ] Verify RLS policies still work
- [ ] Check for any performance degradation
- [ ] Test rollback migration works

---

## 11. Mobile-Specific Testing

### iOS Safari Specific Tests

| Test | Details | Status |
|------|---------|--------|
| Touch events | Tap, swipe, pinch-to-zoom work correctly | ⏳ |
| Virtual keyboard | Doesn't block input fields, scrolls correctly | ⏳ |
| Safe area | Content not hidden by notch/home indicator | ⏳ |
| Private browsing | All features work (cookies, localStorage) | ⏳ |
| Add to Home Screen | App icon and name display correctly | ⏳ |
| iOS 16 compatibility | Test on iOS 16.x | ⏳ |
| iOS 17 compatibility | Test on iOS 17.x | ⏳ |

### Android Chrome Specific Tests

| Test | Details | Status |
|------|---------|--------|
| Chrome gestures | Back gesture doesn't break navigation | ⏳ |
| Samsung Internet | Test on Samsung devices | ⏳ |
| Auto-fill | Address/payment autofill works | ⏳ |
| Dark mode | Respect system dark mode | ⏳ |
| Split screen | App works in split-screen mode | ⏳ |

### Network Conditions

**Test on various network speeds:**

| Network | Target Performance | Test Status |
|---------|-------------------|-------------|
| WiFi (50+ Mbps) | < 2s page load | ⏳ |
| 4G LTE (10 Mbps) | < 4s page load | ⏳ |
| 3G (1.5 Mbps) | < 8s page load | ⏳ |
| Slow 3G (400 Kbps) | < 15s page load, graceful degradation | ⏳ |

### Mobile Form Usability

- [ ] Input fields have appropriate keyboard type (email, number, tel)
- [ ] Tap targets are >= 44x44px
- [ ] Form scrolls when keyboard appears
- [ ] Submit button visible with keyboard open
- [ ] Autocomplete attributes set correctly
- [ ] Error messages clearly visible
- [ ] No horizontal scrolling required

### Push Notifications (Future)

- [ ] Request permission correctly
- [ ] Notifications appear on lock screen
- [ ] Tapping notification opens correct page
- [ ] Notifications work on iOS
- [ ] Notifications work on Android

---

## 12. Accessibility Testing

### WCAG 2.1 Level AA Compliance

#### Perceivable

**1.1 Text Alternatives**
- [ ] All images have alt text
- [ ] Icons have aria-labels
- [ ] Form inputs have labels

**1.2 Time-based Media**
- [ ] Video/audio has captions (if applicable)

**1.3 Adaptable**
- [ ] Content structure is semantic (headings, lists)
- [ ] Forms use proper labels and fieldsets
- [ ] Tables use proper headers

**1.4 Distinguishable**
- [ ] Text contrast ratio >= 4.5:1 for normal text
- [ ] Text contrast ratio >= 3:1 for large text
- [ ] Color is not the only visual means of info
- [ ] Text can be resized to 200% without loss of content
- [ ] No content is lost when zoomed

#### Operable

**2.1 Keyboard Accessible**
- [ ] All interactive elements keyboard accessible
- [ ] No keyboard traps
- [ ] Tab order is logical

**2.2 Enough Time**
- [ ] No time limits on tasks (or adjustable)
- [ ] Sessions don't expire mid-transaction

**2.3 Seizures**
- [ ] No content flashes more than 3 times per second

**2.4 Navigable**
- [ ] Skip navigation link provided
- [ ] Page titles are descriptive
- [ ] Focus order makes sense
- [ ] Link text is descriptive
- [ ] Multiple ways to navigate

**2.5 Input Modalities**
- [ ] Touch targets are >= 44x44px
- [ ] Gestures have alternatives

#### Understandable

**3.1 Readable**
- [ ] Page language is set
- [ ] Unusual words are defined

**3.2 Predictable**
- [ ] Navigation is consistent
- [ ] No unexpected context changes

**3.3 Input Assistance**
- [ ] Error messages are clear
- [ ] Labels and instructions provided
- [ ] Error prevention for critical actions

#### Robust

**4.1 Compatible**
- [ ] HTML is valid
- [ ] ARIA attributes used correctly
- [ ] Status messages announced to screen readers

### Screen Reader Testing

**Test with:**
- [ ] VoiceOver (iOS/macOS)
- [ ] TalkBack (Android)
- [ ] NVDA (Windows)
- [ ] JAWS (Windows)

**Key Pages to Test:**
1. Homepage
2. Login/Signup
3. Booking flow
4. Order details
5. Payment

**Screen Reader Checklist:**
- [ ] All content is readable
- [ ] Navigation is clear
- [ ] Form labels are announced
- [ ] Error messages are announced
- [ ] Button purposes are clear
- [ ] Loading states are announced

### Tools for Testing

```bash
# Automated Testing
npm install -D @axe-core/react
npm install -D jest-axe

# Browser Extensions
- axe DevTools
- WAVE
- Lighthouse Accessibility Audit
```

**Manual Checks:**
- [ ] Keyboard-only navigation
- [ ] Zoom to 200%
- [ ] High contrast mode
- [ ] Screen reader testing
- [ ] Color blindness simulation

---

## 13. Test Credentials & Setup

### User Accounts

**Primary Test Account:**
```
Email: franck.kengne@gmail.com
Password: 19173709414
Role: Customer
Notes: Use for all customer-facing tests
```

**Additional Test Accounts:**
```
Email: franck.kengne+partner@gmail.com
Password: [same as above]
Role: Partner
Notes: Use for partner portal tests

Email: franck.kengne+admin@gmail.com
Password: [same as above]
Role: Admin
Notes: Use for admin dashboard tests
```

**Creating Test Orders:**
```
Test Address: 123 Main St, San Francisco, CA 94102
Test Phone: (415) 555-0123
```

### Stripe Test Cards

```
# Successful Payments
4242 4242 4242 4242 (Visa)
5555 5555 5555 4444 (Mastercard)
378282246310005 (American Express)

# Failed Payments
4000 0000 0000 0002 (Generic decline)
4000 0000 0000 9995 (Insufficient funds)
4000 0000 0000 9987 (Lost card)
4000 0000 0000 9979 (Stolen card)

# 3D Secure Authentication
4000 0025 0000 3155 (Requires authentication)
4000 0000 0000 3220 (Authentication fails)

# All test cards:
- Use any future expiration date (e.g., 12/34)
- Use any 3-digit CVC (e.g., 123)
- Use any ZIP code (e.g., 94102)
```

### Test Data Setup

**Before starting tests:**

```bash
# 1. Ensure test database is seeded
npm run supabase:seed

# 2. Create test capacity slots
# Navigate to admin panel and create slots for next 7 days

# 3. Set up test partner
# Navigate to admin panel and create partner with capabilities

# 4. Verify Stripe test mode
# Check .env.local has test keys (starting with pk_test_)
```

### Environment Setup

**Required Environment Variables:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...
```

---

## 14. Rollback Procedures

### Pre-Rollback Checklist

**If critical issues found post-deployment:**

1. **Assess Severity**
   - [ ] Is production completely down?
   - [ ] Are users unable to complete orders?
   - [ ] Is data at risk?
   - [ ] Is there a workaround?

2. **Document Issue**
   - [ ] Screenshot errors
   - [ ] Copy console errors
   - [ ] Note affected features
   - [ ] Note number of affected users

3. **Communicate**
   - [ ] Notify team via Slack/Discord
   - [ ] Update status page (if available)
   - [ ] Prepare user communication

### Rollback Steps

#### Option 1: Git Revert (Preferred)

```bash
# 1. Identify commit to revert to
git log --oneline -10

# 2. Revert to previous stable version
git revert [commit-hash]

# 3. Push revert
git push origin main

# 4. Trigger new deployment
# (Vercel/Netlify will auto-deploy, or manually trigger)

# 5. Verify rollback successful
curl https://[your-domain]/api/health
```

#### Option 2: Database Rollback

```bash
# If database migration caused issues:

# 1. Connect to database
psql $DATABASE_URL

# 2. Identify last migration
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 5;

# 3. Run rollback migration (if exists)
# e.g., supabase/migrations/010_unified_order_status_rollback.sql

# 4. Verify data integrity
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM users;
```

#### Option 3: Vercel/Netlify Rollback

```bash
# Vercel
vercel rollback [deployment-url]

# Or via dashboard:
# 1. Go to Vercel dashboard
# 2. Select project
# 3. Go to Deployments
# 4. Find previous stable deployment
# 5. Click "Promote to Production"
```

### Post-Rollback Steps

1. **Verify System Stability**
   - [ ] Run smoke tests
   - [ ] Check error monitoring (Sentry, etc.)
   - [ ] Monitor API response times
   - [ ] Check database connections

2. **Investigate Root Cause**
   - [ ] Review failed deployment logs
   - [ ] Identify what broke
   - [ ] Determine why tests didn't catch it
   - [ ] Document lessons learned

3. **Plan Fix**
   - [ ] Create bug ticket
   - [ ] Assign priority
   - [ ] Develop fix in staging
   - [ ] Re-run full test suite
   - [ ] Deploy fix with monitoring

4. **Update Documentation**
   - [ ] Add regression test for this issue
   - [ ] Update deployment checklist
   - [ ] Document rollback in changelog

### Monitoring After Deployment

**First 30 minutes:**
- [ ] Monitor error rates
- [ ] Check API response times
- [ ] Watch user session analytics
- [ ] Monitor payment success rates

**First 24 hours:**
- [ ] Review error logs
- [ ] Check for user reports
- [ ] Monitor conversion rates
- [ ] Review performance metrics

**First week:**
- [ ] Weekly error summary
- [ ] User feedback review
- [ ] Performance comparison
- [ ] Plan improvements

---

## 15. Test Execution Tracker

### Daily Test Status

**Date:** _______  
**Tester:** _______  
**Environment:** Production / Staging / Local

| Feature | Status | Notes | Blocker? |
|---------|--------|-------|----------|
| Login (Web) | ⏳ | | No |
| Login (Mobile) | ⏳ | | Yes - Loading issue |
| Signup | ⏳ | | No |
| Laundry Booking | ⏳ | | No |
| Cleaning Booking | ⏳ | | No |
| Payment | ⏳ | | No |
| Order Management | ⏳ | | No |
| Partner Portal | ⏳ | | No |
| Admin Dashboard | ⏳ | | No |

### Sign-Off Checklist

**Release Manager:** _______  
**Date:** _______

- [ ] All critical tests passed
- [ ] All blocker issues resolved
- [ ] No P0/P1 bugs open
- [ ] Performance metrics meet targets
- [ ] Security scan passed
- [ ] Console errors documented/accepted
- [ ] Rollback procedure tested
- [ ] Monitoring alerts configured
- [ ] Team briefed on changes
- [ ] Documentation updated

**Approval Signatures:**
- Tech Lead: _______
- QA Lead: _______
- Product Manager: _______

---

## Appendix A: Quick Reference

### Critical Commands

```bash
# Start dev server
npm run dev

# Run tests
npm test

# Build production
npm run build

# Database migration
npm run supabase:migrations

# Check for vulnerabilities
npm audit

# Update dependencies
npm update
```

### Key URLs

```
Production: https://[your-domain]
Staging: https://staging.[your-domain]
Admin: https://[your-domain]/admin
Partner: https://[your-domain]/partner
```

### Emergency Contacts

```
Tech Lead: [contact]
DevOps: [contact]
Database Admin: [contact]
Security: [contact]
```

### Related Documents

- [STRIPE_PAYMENT_TESTING_AUDIT_PLAN.md](./STRIPE_PAYMENT_TESTING_AUDIT_PLAN.md)
- [CLEANING_V2_TESTING_GUIDE.md](./CLEANING_V2_TESTING_GUIDE.md)
- [AUTH_API_ERRORS_FIX.md](./AUTH_API_ERRORS_FIX.md)

---

**End of Release Test Plan Part 2**

For Part 1, see [RELEASE_TEST_PLAN.md](./RELEASE_TEST_PLAN.md)
