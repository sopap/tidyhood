# 🧪 TidyHood Release Test Plan (Enhanced)

**Version:** 1.0  
**Last Updated:** October 6, 2025  
**Status:** Active - Pre-Release Testing

---

## 📋 Table of Contents

1. [Critical Issues & Mobile Login Bug](#1-critical-issues--mobile-login-bug)
2. [Pre-Release Checklist](#2-pre-release-checklist)
3. [Feature Test Matrix](#3-feature-test-matrix)
4. [Critical User Journeys](#4-critical-user-journeys)
5. [Console Error Audit Protocol](#5-console-error-audit-protocol)
6. [GitHub Integration Guide](#6-github-integration-guide)
7. [Performance & Load Testing](#7-performance--load-testing)
8. [Security & Compliance](#8-security--compliance)
9. [Edge Cases & Error Handling](#9-edge-cases--error-handling)
10. [Regression Tests](#10-regression-tests)
11. [Mobile-Specific Testing](#11-mobile-specific-testing)
12. [Accessibility Testing](#12-accessibility-testing)
13. [Test Credentials & Setup](#13-test-credentials--setup)
14. [Rollback Procedures](#14-rollback-procedures)

---

## 1. Critical Issues & Mobile Login Bug

### 🔴 **PRIORITY 1: Mobile Login Loading Forever**

#### Current Status
- **Severity:** Critical
- **Platforms Affected:** Mobile (iOS Safari, Android Chrome)
- **Impact:** Users cannot log in on mobile devices
- **User Report:** Login page loads forever after submitting credentials

#### Test Environment Setup

**Mobile Device Matrix:**
```
iOS Devices:
├── iPhone 12 Mini - iOS 16.0+
├── iPhone 13 Pro - iOS 16.5+
├── iPhone 14 - iOS 17.0+
└── iPhone 15 - iOS 17.2+

Android Devices:
├── Samsung Galaxy S21 - Android 12
├── Google Pixel 6 - Android 13
├── Samsung Galaxy S23 - Android 14
└── OnePlus 11 - Android 14
```

**Browser Versions:**
- iOS Safari: 15.6+, 16.0+, 17.0+
- Chrome Mobile: 100+, 110+, 120+
- Firefox Mobile: 100+, 110+
- Samsung Internet: 18+, 20+

#### Reproduction Steps

1. **Navigate to login page** on mobile device
   - URL: `https://[your-domain]/login`
   - Expected: Page loads in < 3s

2. **Enter test credentials**
   - Email: franck.kengne@gmail.com
   - Password: [see secure credentials section]
   - Expected: Input fields accept text without delay

3. **Tap "Sign in" button**
   - Expected: Loading state shows immediately
   - Actual (Bug): Infinite loading spinner

4. **Monitor for timeout**
   - Wait: 60 seconds
   - Expected: Error message or success
   - Actual (Bug): No response, page hangs

#### Debug Checklist

**Browser Developer Tools (Mobile):**

```bash
# On iOS Safari:
Settings → Safari → Advanced → Web Inspector
# Then connect to Mac and use Safari Developer Tools

# On Chrome Mobile:
chrome://inspect#devices
# Then use Chrome DevTools on desktop
```

**Console Logs to Check:**
- [ ] Check for JavaScript errors
- [ ] Check for React hydration errors
- [ ] Check for Supabase auth errors
- [ ] Check for network timeout errors
- [ ] Check for CORS errors

**Network Tab Investigation:**
```
POST /api/auth/login
├── Status: 200? 401? 500? Pending?
├── Response Time: < 500ms? > 30s?
├── Response Body: Check for error messages
└── Headers: Check Set-Cookie headers
```

**Application Storage:**
```
Developer Tools → Application → Cookies
Check for:
├── Supabase session cookies
├── sb-access-token
├── sb-refresh-token
└── Cookie flags: Secure, SameSite=Lax
```

**Potential Root Causes:**

1. **Suspense + useSearchParams Issue**
   - File: `app/login/page.tsx`
   - Issue: Hydration mismatch on mobile
   - Test: Remove Suspense boundary temporarily

2. **Auth State Management**
   - File: `lib/auth-context.tsx`
   - Issue: `refreshUser()` timeout on mobile
   - Test: Add 30-second timeout to refreshUser

3. **Cookie Policy Issues**
   - iOS Safari: Intelligent Tracking Prevention (ITP)
   - Chrome Mobile: Third-party cookie blocking
   - Test: Check SameSite=Lax and Secure flags

4. **Network Latency**
   - Mobile networks: Slower than WiFi
   - Test: Use Chrome DevTools network throttling (Slow 3G)

#### Test Scenarios

| Scenario | Device | Network | Expected Result | Status |
|----------|--------|---------|----------------|--------|
| Login on WiFi | iPhone 14 | WiFi | Success < 3s | ⏳ |
| Login on 4G | iPhone 14 | 4G | Success < 5s | ⏳ |
| Login on Slow 3G | Android Pixel | 3G | Success < 10s | ⏳ |
| Login in Private Mode | iPhone 14 Safari | WiFi | Success < 3s | ⏳ |
| Login in Incognito | Android Chrome | WiFi | Success < 3s | ⏳ |
| Login after timeout | iPhone 14 | WiFi | Error message | ⏳ |

#### Pass Criteria

- ✅ Login completes in < 5s on mobile
- ✅ No console errors during login
- ✅ Proper error messages for failures
- ✅ Works on all tested devices/browsers
- ✅ Cookies persist after page refresh

---

## 2. Pre-Release Checklist

### Environment Verification

**Before Testing:**
- [ ] **Production Environment**
  - [ ] URL accessible: https://[your-domain]
  - [ ] SSL certificate valid
  - [ ] DNS resolves correctly
  - [ ] CDN/Cloudflare enabled

- [ ] **Environment Variables**
  ```bash
  # Check .env.local has:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  - STRIPE_PUBLIC_KEY
  - STRIPE_SECRET_KEY
  ```

- [ ] **Database State**
  - [ ] All migrations applied (run `npm run supabase:migrations`)
  - [ ] Seed data loaded (if needed)
  - [ ] RLS policies active
  - [ ] No pending schema changes

- [ ] **External Services**
  - [ ] Supabase: Auth & Database operational
  - [ ] Stripe: Test mode enabled
  - [ ] Twilio: SMS service active (if used)
  - [ ] Google Maps: API key valid, billing enabled

### API Health Check

```bash
# Test all critical endpoints:
curl https://[your-domain]/api/auth/login -I
# Expected: 405 Method Not Allowed (GET not allowed)

curl https://[your-domain]/api/orders -I
# Expected: 401 Unauthorized (no auth)

curl https://[your-domain]/api/slots -I
# Expected: 200 OK or 401
```

### Console Error Baseline

**Before Making Changes:**
1. Open homepage in Chrome DevTools
2. Check Console tab - should show 0 errors
3. Document any existing warnings
4. Take screenshot for reference

---

## 3. Feature Test Matrix

### 3.1 User Authentication

#### Login Flow

| Test Case | Web Desktop | Mobile iOS | Mobile Android | Console Clean | Status |
|-----------|------------|------------|----------------|--------------|--------|
| Valid credentials | ✅ | ⏳ | ⏳ | ✅ | ⏳ |
| Invalid email | ✅ | ⏳ | ⏳ | ✅ | ⏳ |
| Invalid password | ✅ | ⏳ | ⏳ | ✅ | ⏳ |
| Empty fields | ✅ | ⏳ | ⏳ | ✅ | ⏳ |
| Email validation | ✅ | ⏳ | ⏳ | ✅ | ⏳ |
| Remember me checkbox | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Forgot password link | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Redirect after login | ✅ | ⏳ | ⏳ | ✅ | ⏳ |
| Session persistence | ✅ | ⏳ | ⏳ | ✅ | ⏳ |

**Steps to Test:**
1. Navigate to `/login`
2. Enter credentials: franck.kengne@gmail.com / [password]
3. Click "Sign in"
4. Verify redirect to `/orders` page
5. Check session persists after page refresh
6. Open DevTools Console - should show 0 errors

#### Signup Flow

| Test Case | Web Desktop | Mobile iOS | Mobile Android | Console Clean | Status |
|-----------|------------|------------|----------------|--------------|--------|
| New user signup | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Duplicate email | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Weak password | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Email confirmation | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Profile creation | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

#### Logout Flow

| Test Case | Web Desktop | Mobile iOS | Mobile Android | Console Clean | Status |
|-----------|------------|------------|----------------|--------------|--------|
| Logout clears session | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Redirect to homepage | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Cannot access protected routes | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

### 3.2 Booking Flows

#### Laundry Booking

| Test Case | Web Desktop | Mobile iOS | Mobile Android | Console Clean | Status |
|-----------|------------|------------|----------------|--------------|--------|
| Service type selection | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Item count input | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Price estimation | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Address autocomplete | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Delivery slot selection | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Pickup slot selection | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Add-ons selection | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Order summary preview | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Payment flow | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Order confirmation | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

**Steps to Test:**
1. Navigate to `/book/laundry`
2. Select "Wash & Fold" service
3. Enter item count: 20 lbs
4. Enter address using autocomplete
5. Select delivery slot (tomorrow)
6. Select pickup slot (2 days from delivery)
7. Add any add-ons (e.g., "Delicate Wash")
8. Review order summary
9. Proceed to payment
10. Complete payment with test card
11. Verify order confirmation page shows
12. Check email for confirmation
13. Open DevTools Console - should show 0 errors

#### Cleaning Booking

| Test Case | Web Desktop | Mobile iOS | Mobile Android | Console Clean | Status |
|-----------|------------|------------|----------------|--------------|--------|
| Cleaning type selection | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Bedrooms/bathrooms input | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Square footage input | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Add-ons selection | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Frequency selection | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Recurring plan discount | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Time slot selection | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Order summary | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Payment flow | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

#### Dry Cleaning Booking

| Test Case | Web Desktop | Mobile iOS | Mobile Android | Console Clean | Status |
|-----------|------------|------------|----------------|--------------|--------|
| Item selection | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Price tooltips | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Special instructions | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Slot selection | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Order flow completion | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

### 3.3 Order Management

#### View Orders

| Test Case | Web Desktop | Mobile iOS | Mobile Android | Console Clean | Status |
|-----------|------------|------------|----------------|--------------|--------|
| Orders list loads | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Filter by status | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Sort orders | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Order detail view | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Status timeline | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Partner information | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

#### Payment Actions

| Test Case | Web Desktop | Mobile iOS | Mobile Android | Console Clean | Status |
|-----------|------------|------------|----------------|--------------|--------|
| Complete deferred payment | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Stripe payment modal | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| 3D Secure flow | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Payment confirmation | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Receipt generation | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

**Test Cards (Stripe):**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3DS Required: 4000 0025 0000 3155
Insufficient Funds: 4000 0000 0000 9995
```

#### Cancel/Reschedule

| Test Case | Web Desktop | Mobile iOS | Mobile Android | Console Clean | Status |
|-----------|------------|------------|----------------|--------------|--------|
| Cancel within policy | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Cancel with fee | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Cancel with refund | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Reschedule order | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Reschedule conflicts | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

### 3.4 Partner Portal

| Test Case | Web Desktop | Mobile iOS | Mobile Android | Console Clean | Status |
|-----------|------------|------------|----------------|--------------|--------|
| Partner login | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Dashboard metrics | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Order list view | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Accept/reject orders | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Update order status | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Submit quote | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Capacity management | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

### 3.5 Admin Dashboard

| Test Case | Web Desktop | Mobile iOS | Mobile Android | Console Clean | Status |
|-----------|------------|------------|----------------|--------------|--------|
| Admin login | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Dashboard overview | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| User management | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Partner management | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Order management | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Capacity management | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Force status changes | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |
| Issue refunds | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ |

---

## 4. Critical User Journeys

### 4.1 New User Complete Journey

**Objective:** Test end-to-end flow for a brand new user

**Test Credentials:**
- Email: franck.kengne@gmail.com
- Password: 19173709414

**Steps:**
1. **Sign Up (if new account)**
   - Navigate to `/signup`
   - Enter email: franck.kengne+test@gmail.com
   - Enter password: [test password]
   - Submit form
   - Verify email confirmation sent
   - Click email link
   - Confirm account activated

2. **First Booking - Laundry**
   - Log in at `/login`
   - Navigate to `/book/laundry`
   - Select "Wash & Fold"
   - Enter 25 lbs
   - Enter address: [test address]
   - Select delivery slot: Tomorrow 9-11 AM
   - Select pickup slot: 2 days later 2-4 PM
   - Add "Delicate Wash" add-on
   - Review summary
   - Proceed to payment
   - Enter card: 4242 4242 4242 4242
   - Complete payment
   - Verify order confirmation

3. **Track Order**
   - Navigate to `/orders`
   - Find newly created order
   - Click to view details
   - Verify all information correct
   - Check status timeline

4. **Logout and Login Again**
   - Click logout
   - Log in again
   - Verify order still visible
   - Verify session persisted

**Pass Criteria:**
- ✅ All steps complete without errors
- ✅ No console errors throughout journey
- ✅ Order saved correctly in database
- ✅ Email confirmations received
- ✅ Payment processed successfully

### 4.2 Recurring Service Journey

**Steps:**
1. Log in
2. Navigate to `/book/cleaning`
3. Select "Deep Cleaning"
4. Enter: 3 bedrooms, 2 bathrooms, 1500 sq ft
5. Select frequency: "Weekly"
6. Verify discount applied
7. Select time slot: Tuesday 10 AM - 2 PM
8. Complete payment
9. Navigate to `/orders`
10. Verify recurring plan created
11. Check next scheduled visit

### 4.3 Cancel and Refund Journey

**Steps:**
1. Log in
2. Navigate to `/orders`
3. Select an order in "pending" status
4. Click "Cancel Order"
5. Select cancellation reason
6. Confirm cancellation
7. Verify refund amount displayed
8. Verify order status updated to "cancelled"
9. Check Stripe dashboard for refund

### 4.4 Partner Fulfillment Journey

**Steps:**
1. Log in to partner portal: `/partner/login`
2. View dashboard
3. See pending order
4. Accept order
5. Update status to "In Progress"
6. Submit quote (if required)
7. Update status to "Completed"
8. Verify customer sees update

---

## 5. Console Error Audit Protocol

### JavaScript Errors

**Zero Tolerance Errors:**
- Uncaught TypeError
- Uncaught ReferenceError
- Uncaught Promise rejection
- 404 errors for critical assets

**How to Check:**
1. Open Chrome DevTools → Console tab
2. Filter by "Errors" only
3. Test each major page:
   - Homepage `/`
   - Login `/login`
   - Signup `/signup`
   - Booking pages `/book/*`
   - Orders page `/orders`
   - Order detail `/orders/[id]`

**Document Format:**
```
Page: /login
Error: Uncaught TypeError: Cannot read property 'user' of undefined
File: auth-context.tsx:45
Severity: Critical
Status: ❌ Blocking
```

### Network Errors

**Check Network Tab:**
```
Status Codes to Monitor:
├── 4xx Errors (Client errors)
│   ├── 400 Bad Request
│   ├── 401 Unauthorized
│   ├── 403 Forbidden
│   └── 404 Not Found
└── 5xx Errors (Server errors)
    ├── 500 Internal Server Error
    ├── 502 Bad Gateway
    └── 503 Service Unavailable
```

**API Endpoints to Test:**
```bash
# Auth
POST /api/auth/login
POST /api/auth/signup
POST /api/auth/logout

# Orders
GET /api/orders
POST /api/orders
GET /api/orders/[id]
PUT /api/orders/[id]/cancel
PUT /api/orders/[id]/reschedule

# Payment
POST /api/orders/[id]/pay

# Partner
GET /api/partner/orders
PUT /api/partner/orders/[id]/status
POST /api/partner/orders/[id]/quote

# Admin
GET /api/admin/orders
GET /api/admin/partners
POST /api/admin/orders/[id]/refund
```

### React Warnings

**Acceptable Warnings (Document):**
- Development mode warnings
- Missing key props (if intentional)

**Unacceptable Warnings:**
- Hydration mismatches
- Memory leaks
- Deprecated API usage

### Supabase Auth Errors

**Check for:**
- Session expired errors
- PKCE flow errors
- Cookie issues
- RLS policy violations

---

## 6. GitHub Integration Guide

### Pre-Push Checklist

**Before every push to `main` or `production` branch:**

```bash
# 1. Run tests
npm test

# 2. Check for TypeScript errors
npm run build

# 3. Run linter
npm run lint

# 4. Manual smoke test
npm run dev
# Test login, logout, and one booking flow

# 5. Check git diff
git diff --staged
# Review all changes

# 6. Commit with descriptive message
git commit -m "feat: [description] - Tested on web/mobile"

# 7. Push
git push origin [branch-name]
```

### GitHub Actions Workflow (Recommended)

Create `.github/workflows/test.yml`:

```yaml
name: Release Tests

on:
  push:
    branches: [ main, production ]
  pull_request:
    branches: [ main, production ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Build
      run: npm run build
      
    - name: Run E2E tests (if configured)
      run: npm run test:e2e
      
    - name: Check for console errors
      run: npm run test:console-errors
```

### Automated E2E Testing (Recommended)

**Using Playwright:**

```bash
# Install Playwright
npm install -D @playwright/test

# Create test file: e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('login flow', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'franck.kengne@gmail.com');
  await page.fill('[name="password"]', process.env.TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/orders');
});
```

**Using Cypress:**

```bash
# Install Cypress
npm install -D cypress

# Create test file: cypress/e2e/auth.cy.ts
describe('Authentication', () => {
  it('should login successfully', () => {
    cy.visit('/login');
    cy.get('[name="email"]').type('franck.kengne@gmail.com');
    cy.get('[name="password"]').type(Cypress.env('TEST_PASSWORD'));
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/orders');
  });
});
```

---

## 7. Performance & Load Testing

### Page Load Metrics

**Target Metrics:**
```
First Contentful Paint (FCP): < 1.5s
Largest Contentful Paint (LCP): < 2.5s
Time to Interactive (TTI): < 3.5s
Cumulative Layout Shift (CLS): < 0.1
First Input Delay (FID): < 100ms
```

**How to Measure:**
1. Open Chrome DevTools → Lighthouse tab
2. Run audit for each major page
3. Test on both Desktop and Mobile
4. Document scores

**Pages to Test:**
- Homepage: `/`
- Login: `/login`
- Booking: `/book/laundry`
- Orders: `/orders`
- Order Detail: `/orders/[id]`

### API Response Times

**Target Response Times:**
```
Auth endpoints: < 500ms
Order list: < 800ms
Order detail: < 500ms
Booking submission: < 1000ms
Payment processing: < 2000ms
```

**How to Test:**
```bash
# Use curl with timing
curl -w "@curl-format.txt" -o /dev/null -s https://[domain]/api/orders

# curl-format.txt:
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
```

### Load Testing

**Tools:** Apache JMeter, k6, or Artillery

**Test Scenarios:**

**Scenario 1: Normal Load**
```
Concurrent Users: 50
Duration: 5 minutes
Ramp-up: 30 seconds
Target: 0 errors, avg response < 1s
```

**Scenario 2: Peak Load**
```
Concurrent Users: 200
Duration: 2 minutes
Ramp-up: 30 seconds
Target: < 1% errors, avg response < 2s
```

**Scenario 3: Stress Test**
```
Concurrent Users: 500
Duration: 1 minute
Ramp-up: 15 seconds
Target: System remains stable, graceful degradation
```

**k6 Example:**
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '5m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

export default function () {
  let res = http.get('https://[domain]/api/orders');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1s': (r) => r.timings.duration < 1000,
  });
  sleep(1);
}
```

---

## 8. Security & Compliance

### OWASP Top 10 Checklist

#### A01: Broken Access Control
- [ ] Test unauthorized access to `/api/admin/*`
- [ ] Test unauthorized access to `/api/partner/*`
- [ ] Test accessing other users' orders
- [ ] Test
