# 🧪 Test Implementation Guide - Pre-Production Release

**Date:** October 19, 2025  
**Status:** 🟡 Phase 1 Test Templates Created - Ready for Implementation  
**Current Coverage:** ~15%  
**Target Coverage:** 60% (Phase 1) → 80% (Phase 2) → 90% (Phase 3)

---

## 📋 Executive Summary

This guide provides a complete roadmap for implementing comprehensive test coverage for the TidyHood application before production release. **Phase 1 tests are BLOCKING** - the application should not be deployed to production without implementing these critical tests.

### What's Been Completed

✅ **Comprehensive Test Audit** - Identified all coverage gaps  
✅ **Test Strategy Document** - 3-phase implementation plan  
✅ **Phase 1 Test Templates** - 200+ test cases created  
✅ **Mobile Login Regression Test** - Addresses reported bug  
✅ **Payment Security Tests** - Covers all Stripe integration scenarios

---

## 📁 Test Files Created

### Phase 1: Critical Path Tests (3/8 Complete)

#### ✅ 1. Authentication API Tests
**File:** `__tests__/api/auth.api.spec.ts`  
**Test Cases:** 40+  
**Priority:** 🔴 CRITICAL

**Coverage:**
- Login (success, failure, invalid credentials)
- Signup (validation, duplicate email, weak password)
- Logout (session clearing, cookie removal)
- Session management (refresh, expiration, timeout)
- Security (SQL injection, XSS, CSRF, rate limiting)
- **🔥 Mobile Login Bug Regression Test** (reported issue)

**Key Features:**
- Mobile Safari/Chrome user agent simulation
- Cookie attribute validation (SameSite=Lax, Secure)
- Session persistence across page refreshes
- Concurrent login handling

**Next Steps:**
1. Install `supertest` for API testing
2. Set up test Supabase instance
3. Replace `expect(true).toBe(true)` placeholders with real assertions
4. Mock Supabase auth API calls

---

#### ✅ 2. Orders API Tests
**File:** `__tests__/api/orders.api.spec.ts`  
**Test Cases:** 90+  
**Priority:** 🔴 CRITICAL

**Coverage:**
- Order creation (laundry, cleaning, dry cleaning)
- Order retrieval (list, detail, filter, search, pagination)
- Order updates (cancel, reschedule, status transitions)
- Payment integration (charge after service, upfront authorization)
- Recurring orders (frequency discounts, auto-generation)
- Authorization checks (access control, user isolation)
- Database transactions (rollback on failure, concurrency)

**Key Features:**
- Pricing calculation validation
- Slot availability checking
- Cancellation fee logic (>24h free, 12-24h 50%, <12h 100%)
- State machine transition validation
- Performance benchmarks (<1s for creation)

**Next Steps:**
1. Set up test database with seed data
2. Mock Stripe payment calls
3. Create test data fixtures for all service types
4. Implement slot availability mocking

---

#### ✅ 3. Payment API Tests
**File:** `__tests__/api/payment.api.spec.ts`  
**Test Cases:** 70+  
**Priority:** 🔴 CRITICAL (MONEY INVOLVED)

**Coverage:**
- Payment setup (SetupIntent, Stripe Customer creation)
- Payment methods (save, list, delete, default)
- Payment authorization (cleaning orders, 3DS, capture)
- Payment charges (laundry orders, success, failure)
- Auto-charge workflow (retry logic, failure notifications)
- Refunds (full, partial, validation)
- 3D Secure authentication (required, failed, expired)
- Webhook handling (payment_intent.*, charge.*, subscription.*)
- Security (PCI compliance, HTTPS, rate limiting)

**Key Features:**
- Stripe test cards for all scenarios
- Webhook signature validation
- Idempotency handling
- Concurrent payment prevention
- Sensitive data protection

**Stripe Test Cards:**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3DS Required: 4000 0025 0000 3155
Insufficient Funds: 4000 0000 0000 9995
```

**Next Steps:**
1. Set up Stripe test mode (sk_test_*, pk_test_*)
2. Install `stripe-mock` or `nock` for API mocking
3. Configure webhook forwarding (Stripe CLI)
4. Implement payment flow integration tests

---

### Phase 1: Remaining Test Files (5/8 To Create)

#### 4. Webhook Integration Tests
**File:** `__tests__/api/webhooks.api.spec.ts` (NOT YET CREATED)  
**Priority:** 🔴 CRITICAL  
**Estimated Test Cases:** 30+

**Should Cover:**
- Stripe webhooks (payment_intent.*, charge.*, customer.*)
- Partner SMS webhooks (intent parsing, action execution)
- Webhook signature validation
- Idempotency (duplicate event handling)
- Error recovery (retry logic)
- Event ordering
- Database updates from webhooks

---

#### 5-7. End-to-End Tests
**Files:** (NOT YET CREATED)
- `__tests__/e2e/laundryBooking.e2e.spec.ts`
- `__tests__/e2e/cleaningBooking.e2e.spec.ts`
- `__tests__/e2e/auth.e2e.spec.ts`

**Priority:** 🔴 CRITICAL  
**Estimated Test Cases:** 50+ total

**Should Cover:**
- Complete user journeys from start to finish
- Multi-step form flows
- Payment completion
- Mobile device testing
- Cross-browser compatibility

**Requires:**
- Playwright or Cypress setup
- Test user accounts
- Test payment methods
- Mobile device simulators

---

#### 8. Test Infrastructure
**Files:** (NOT YET CREATED)
- `__tests__/utils/testHelpers.ts`
- `__tests__/mocks/handlers.ts`
- `__tests__/fixtures/testData.ts`

**Should Include:**
- Mock data generators
- Test user factory
- Supabase mocking utilities
- Stripe mocking helpers
- Common assertions
- Cleanup utilities

---

## 🚀 Implementation Roadmap

### Week 1: Phase 1 - Critical Path Implementation

#### Day 1-2: Auth & Infrastructure
**Goal:** Get auth tests running

**Tasks:**
1. Install dependencies
   ```bash
   npm install --save-dev supertest @types/supertest nock
   ```

2. Create test helpers
   ```typescript
   // __tests__/utils/testHelpers.ts
   export const createTestUser = async () => { /* ... */ };
   export const getAuthToken = async (user) => { /* ... */ };
   export const cleanupTestData = async () => { /* ... */ };
   ```

3. Set up test database
   - Use Supabase test project or local instance
   - Run migrations
   - Seed with test data

4. Implement auth test placeholders
   - Replace `expect(true).toBe(true)` with real assertions
   - Add beforeEach/afterEach cleanup
   - Mock Supabase auth API

**Success Criteria:**
- Auth tests pass consistently
- Mobile login regression test exists
- Zero console errors
- <5 second test execution time

---

#### Day 3-4: Orders & Payment Tests
**Goal:** Get orders and payment tests running

**Tasks:**
1. Set up Stripe test mode
   ```bash
   # .env.test
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_PUBLIC_KEY=pk_test_xxx
   ```

2. Mock Stripe API
   ```typescript
   // __tests__/mocks/stripe.ts
   import nock from 'nock';
   
   export const mockStripeSuccess = () => {
     nock('https://api.stripe.com')
       .post('/v1/payment_intents')
       .reply(200, { /* mock response */ });
   };
   ```

3. Create test fixtures
   ```typescript
   // __tests__/fixtures/orders.ts
   export const mockLaundryOrder = {
     service_type: 'LAUNDRY',
     weight_lbs: 15,
     // ...
   };
   ```

4. Implement order & payment tests
   - Replace placeholders
   - Add test data cleanup
   - Verify database state after operations

**Success Criteria:**
- Orders tests pass
- Payment tests pass
- Stripe mocking works correctly
- All money calculations validated

---

#### Day 5: Webhooks & E2E Setup
**Goal:** Webhook tests + E2E framework

**Tasks:**
1. Create webhook tests
2. Set up Playwright
   ```bash
   npm install --save-dev @playwright/test
   npx playwright install
   ```

3. Create first E2E test
   ```typescript
   // __tests__/e2e/auth.e2e.spec.ts
   test('should login successfully', async ({ page }) => {
     await page.goto('/login');
     await page.fill('[name="email"]', 'test@test.com');
     await page.fill('[name="password"]', 'password');
     await page.click('button[type="submit"]');
     await expect(page).toHaveURL('/orders');
   });
   ```

**Success Criteria:**
- Webhook tests created
- Playwright configured
- First E2E test passes
- Mobile testing works

---

### Week 2: Phase 1 Completion

#### Day 6-8: E2E Tests
**Goal:** Complete E2E test coverage

**Tasks:**
1. Laundry booking E2E
2. Cleaning booking E2E
3. Mobile-specific tests
4. Cross-browser testing

**Success Criteria:**
- All E2E tests pass
- Mobile tests pass
- Multi-browser tests pass

---

#### Day 9-10: Integration & Polish
**Goal:** All Phase 1 tests passing

**Tasks:**
1. Fix flaky tests
2. Optimize test performance
3. Add test documentation
4. Set up CI/CD integration

**Success Criteria:**
- All Phase 1 tests pass consistently
- Test suite runs in <10 minutes
- Zero flaky tests
- CI/CD pipeline configured

---

## 🔧 Technical Setup

### Required Dependencies

```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/supertest": "^2.0.16",
    "nock": "^13.4.0",
    "supertest": "^6.3.3",
    "stripe-mock": "^0.1.0"
  }
}
```

### Test Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:ci": "jest --ci --coverage && playwright test"
  }
}
```

### Environment Variables

Create `.env.test`:

```bash
# Supabase Test Instance
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test_anon_key
SUPABASE_SERVICE_ROLE_KEY=test_service_key

# Stripe Test Mode
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLIC_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx

# Test Configuration
NODE_ENV=test
BASE_URL=http://localhost:3000
```

---

## 📊 Success Metrics

### Phase 1 Completion Criteria

**Must Have:**
- [ ] All auth tests pass (40+ cases)
- [ ] All orders tests pass (90+ cases)
- [ ] All payment tests pass (70+ cases)
- [ ] Webhook tests pass (30+ cases)
- [ ] E2E tests pass (50+ cases)
- [ ] Mobile login regression test passes
- [ ] Test coverage >60%
- [ ] Zero flaky tests
- [ ] Test suite <10 min execution time

**Quality Metrics:**
- [ ] Zero console errors during tests
- [ ] All critical paths covered
- [ ] Payment logic 100% covered
- [ ] State transitions validated
- [ ] Security tests passing

---

## ⚠️ Known Issues & Risks

### 🔥 Mobile Login Bug (UNRESOLVED)
**Status:** Regression test created, bug not fixed  
**Impact:** Users cannot log in on mobile devices  
**Test:** `__tests__/api/auth.api.spec.ts` - line 110  
**Action:** This test will FAIL until bug is fixed, then serve as regression prevention

### 🔥 Payment Webhook Reliability (UNTESTED)
**Status:** No webhook tests yet  
**Impact:** Failed webhooks = lost revenue  
**Action:** Prioritize webhook test creation

### 🔥 Concurrent Payment Handling (UNTESTED)
**Status:** Idempotency logic not validated  
**Impact:** Double charges possible  
**Action:** Add concurrent payment tests

---

## 📚 Resources

### Documentation
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks/test)
- [Playwright Docs](https://playwright.dev)
- [Jest Documentation](https://jestjs.io)
- [Supabase Testing](https://supabase.com/docs/guides/getting-started)

### Test Files Location
```
__tests__/
├── api/
│   ├── auth.api.spec.ts (✅ CREATED)
│   ├── orders.api.spec.ts (✅ CREATED)
│   ├── payment.api.spec.ts (✅ CREATED)
│   └── webhooks.api.spec.ts (❌ TODO)
├── e2e/
│   ├── auth.e2e.spec.ts (❌ TODO)
│   ├── laundryBooking.e2e.spec.ts (❌ TODO)
│   └── cleaningBooking.e2e.spec.ts (❌ TODO)
├── integration/
│   └── payment.integration.spec.ts (❌ TODO)
├── fixtures/
│   └── testData.ts (❌ TODO)
├── mocks/
│   └── handlers.ts (❌ TODO)
└── utils/
    └── testHelpers.ts (❌ TODO)
```

---

## 🎯 Quick Start

### Day 1 - Get First Test Running

```bash
# 1. Install dependencies
npm install --save-dev supertest @types/supertest

# 2. Create test helper
mkdir -p __tests__/utils
echo "export const testUser = { email: 'test@test.com', password: 'test123' };" > __tests__/utils/testHelpers.ts

# 3. Run existing test
npm test -- __tests__/api/auth.api.spec.ts

# 4. Implement first real test
# Edit __tests__/api/auth.api.spec.ts
# Replace first placeholder with actual API call

# 5. Run again
npm test -- __tests__/api/auth.api.spec.ts
```

---

## 📞 Support & Questions

If you encounter issues during implementation:

1. Review implementation notes in each test file
2. Check the TEST_COVERAGE_AUDIT_PRE_PRODUCTION.md for context
3. Refer to existing test patterns in:
   - `lib/__tests__/orderStateMachine.test.ts`
   - `lib/partner/__tests__/quoteCalculation.test.ts`
   - `__tests__/stripeReceipts.spec.tsx`

---

## ✅ Final Checklist Before Production

**Before deploying to production, verify:**

- [ ] All Phase 1 tests passing
- [ ] Test coverage >60%
- [ ] Mobile login test passing
- [ ] Payment tests passing (all Stripe scenarios)
- [ ] E2E tests passing (all browsers)
- [ ] CI/CD pipeline running tests
- [ ] No flaky tests
- [ ] Test execution <10 minutes
- [ ] Production test run completed
- [ ] Mobile devices tested manually
- [ ] Payment flow tested end-to-end
- [ ] Rollback procedure documented
- [ ] Monitoring/alerting configured

---

**Last Updated:** October 19, 2025  
**Status:** 📝 Ready for Implementation  
**Next Action:** Begin Week 1, Day 1 - Auth & Infrastructure Setup
