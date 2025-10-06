# 🔍 TidyHood Code Audit Report

**Date:** October 6, 2025  
**Auditor:** Code Analysis  
**Scope:** Authentication, Booking, and Critical User Flows  
**Test Account:** franck.kengne@gmail.com

---

## 🚨 CRITICAL ISSUES (P0)

### 1. Mobile Login Infinite Loading

**File:** `app/login/page.tsx` + `lib/auth-context.tsx`  
**Severity:** CRITICAL - Blocking production use  
**Impact:** Users cannot log in on mobile devices

**Root Cause Analysis:**

```typescript
// app/login/page.tsx - Line 47
await refreshUser()  // ❌ NO TIMEOUT, NO ERROR HANDLING
```

**Problems:**

1. **No Timeout on `refreshUser()`**
   - If Supabase API is slow/unresponsive, this hangs forever
   - Mobile networks (3G/4G) have higher latency
   - No fallback or timeout mechanism

2. **Suspense + useSearchParams Pattern**
   ```typescript
   // app/login/page.tsx - Line 208
   <Suspense fallback={...}>
     <LoginForm /> // Uses useSearchParams inside
   </Suspense>
   ```
   - Known Next.js hydration issue on mobile
   - Can cause component to never resolve
   - iOS Safari particularly affected

3. **No Loading State During refreshUser**
   ```typescript
   // After successful login API call
   await refreshUser() // User still sees "Signing in..." spinner
   // But if this hangs, no feedback to user
   ```

**Fix Required:**
```typescript
// Add timeout wrapper
const refreshWithTimeout = async (timeout = 10000) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeout)
  )
  
  try {
    await Promise.race([refreshUser(), timeoutPromise])
  } catch (error) {
    if (error.message === 'Timeout') {
      // Handle timeout - maybe redirect anyway?
      console.error('RefreshUser timeout, proceeding anyway')
    }
    throw error
  }
}
```

---

## ⚠️ HIGH PRIORITY ISSUES (P1)

### 2. Auth Context - No Timeout Handling

**File:** `lib/auth-context.tsx`  
**Severity:** HIGH  
**Impact:** All auth operations can hang indefinitely

**Problems:**

```typescript
// Line 20-27
const refreshUser = async () => {
  try {
    const { data: { user } } = await supabaseClient.auth.getUser()
    // ❌ No timeout, no retry, no fallback
    setUser(user)
  } catch (error) {
    console.error('Error fetching user:', error) // ❌ Only logs to console
    setUser(null)
  }
}
```

**Issues:**
- No timeout on `supabaseClient.auth.getUser()`
- Error only logged, not surfaced to UI
- No retry logic for transient network failures
- Could block app initialization indefinitely

**Fix:**
```typescript
const refreshUser = async (maxRetries = 3) => {
  let attempts = 0
  while (attempts < maxRetries) {
    try {
      const timeoutMs = 10000 // 10 seconds
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      
      const { data: { user } } = await supabaseClient.auth.getUser()
      clearTimeout(timeoutId)
      setUser(user)
      return
    } catch (error) {
      attempts++
      if (attempts >= maxRetries) {
        console.error('Error fetching user after retries:', error)
        setUser(null)
        // Consider: toast notification to user
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
    }
  }
}
```

---

### 3. Login Page - Non-Functional Features

**File:** `app/login/page.tsx`  
**Severity:** HIGH (UX/Trust)  
**Impact:** Users think features are broken

**Non-Functional Elements:**

```typescript
// Line 147-150 - Remember Me Checkbox
<input
  id="remember-me"
  type="checkbox"
  // ❌ No onChange handler, does nothing
/>

// Line 155 - Forgot Password Link  
<a href="#" ...> // ❌ Goes nowhere
  Forgot your password?
</a>

// Lines 168-182 - Social Auth Buttons
<button type="button" ...> // ❌ Not implemented
  Google
</button>
<button type="button" ...> // ❌ Not implemented
  Apple
</button>
```

**Fix Options:**
1. Remove non-functional features
2. Implement them properly
3. Disable with "Coming Soon" state

---

### 4. No Rate Limiting on Login

**File:** `app/api/auth/login/route.ts`  
**Severity:** HIGH (Security)  
**Impact:** Vulnerable to brute force attacks

**Missing:**
- No rate limiting on failed login attempts
- No account lockout after X failures
- No CAPTCHA after multiple failures
- No IP-based throttling

**Current Code:**
```typescript
// app/api/auth/login/route.ts
export async function POST(request: NextRequest) {
  // ❌ No rate limiting check
  const { email, password } = loginSchema.parse(body)
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  // ❌ No tracking of failed attempts
}
```

**Recommended Fix:**
```typescript
// Use rate limiting library or implement:
import rateLimit from 'express-rate-limit'

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
})
```

---

## 📋 MEDIUM PRIORITY ISSUES (P2)

### 5. Booking Flow - No Session Expiry Handling

**Impact:** Users lose booking data if session expires

**Scenario:**
1. User starts booking flow
2. Takes 20 minutes to fill form
3. Session expires
4. User submits → 401 Unauthorized
5. All data lost ❌

**Current Behavior:**
```typescript
// No check for session validity before submission
const handleSubmit = async () => {
  // ❌ If session expired, this fails
  await fetch('/api/orders', { ... })
}
```

**Fix:**
```typescript
const handleSubmit = async () => {
  // Check session first
  const { data: { session } } = await supabaseClient.auth.getSession()
  
  if (!session) {
    // Save booking data to localStorage
    localStorage.setItem('pendingBooking', JSON.stringify(formData))
    // Redirect to login with return URL
    router.push('/login?returnTo=/book/laundry&restore=true')
    return
  }
  
  // Proceed with submission
}
```

---

### 6. No Network Error Handling in Forms

**Files:** All booking pages  
**Severity:** MEDIUM  
**Impact:** Poor UX on network failures

**Problem:**
```typescript
// Typical pattern across booking forms:
const response = await fetch('/api/orders', {
  method: 'POST',
  body: JSON.stringify(data)
})

if (!response.ok) {
  throw new Error('Failed to create order')
  // ❌ Generic error, no retry option
}
```

**Issues:**
- No distinction between network error vs API error
- No retry mechanism
- No offline detection
- Generic error messages

**Fix:**
```typescript
const submitWithRetry = async (url, data, maxRetries = 3) => {
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Request failed')
      }
      
      return await response.json()
    } catch (error) {
      lastError = error
      
      // Check if it's a network error
      if (error.message.includes('fetch') || error.message.includes('network')) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
        continue
      }
      
      // Non-network error, don't retry
      throw error
    }
  }
  
  throw lastError
}
```

---

### 7. Payment Modal - No Double-Submit Prevention

**File:** `components/PaymentModal.tsx` (inferred)  
**Severity:** MEDIUM (Financial Risk)  
**Impact:** Users could be charged twice

**Risk:**
- User clicks "Pay" button
- Network is slow
- User clicks again
- Two charges processed

**Fix Needed:**
```typescript
const [isProcessing, setIsProcessing] = useState(false)

const handlePay

ment = async () => {
  if (isProcessing) return // ❌ Prevent double-click
  
  setIsProcessing(true)
  try {
    await processPayment()
  } finally {
    setIsProcessing(false)
  }
}

// Also disable button during processing:
<button disabled={isProcessing} ...>
  {isProcessing ? 'Processing...' : 'Pay Now'}
</button>
```

---

### 8. Orders Page - No Real-Time Updates

**File:** `app/orders/page.tsx`  
**Severity:** MEDIUM  
**Impact:** Users don't see status changes without refresh

**Current:**
```typescript
// Orders page loads data once on mount
const { data: orders } = await fetch('/api/orders')
// ❌ No real-time subscription
```

**Fix with Supabase Realtime:**
```typescript
useEffect(() => {
  const subscription = supabaseClient
    .channel('orders-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`,
      },
      (payload) => {
        // Update orders list
        setOrders(prev => updateOrderInList(prev, payload))
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}, [user.id])
```

---

## 🐛 LOW PRIORITY ISSUES (P3)

### 9. Missing Input Validation

**Various Forms**  
**Examples:**

```typescript
// Missing validation:
- Phone numbers (no format validation)
- Zip codes (should be 5 digits)
- Special characters in addresses
- XSS in text inputs (notes, special instructions)
```

**Fix:**
Use validation libraries like `zod` consistently:
```typescript
import { z } from 'zod'

const bookingSchema = z.object({
  phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Invalid phone format'),
  zipCode: z.string().regex(/^\d{5}$/, 'Must be 5 digits'),
  address: z.string().max(200).trim(),
  notes: z.string().max(500).optional(),
})
```

---

### 10. No Loading Skeletons

**Impact:** Poor perceived performance

**Current:** Most pages show blank screen while loading  
**Better:** Show skeleton loaders

```typescript
// Example:
{loading ? (
  <OrdersSkeleton />
) : (
  <OrdersList orders={orders} />
)}
```

---

### 11. Accessibility Issues

**WCAG 2.1 Violations:**

```typescript
// Missing alt text on images
<img src="/logo.png" /> // ❌ No alt

// Buttons without aria-labels
<button onClick={handleClose}>
  <X /> // ❌ Icon only, no label
</button>

// Form inputs without labels
<input placeholder="Enter email" /> // ❌ Placeholder is not a label

// Insufficient color contrast (needs testing)
```

**Fixes:**
```typescript
<img src="/logo.png" alt="TidyHood Logo" />

<button onClick={handleClose} aria-label="Close modal">
  <X />
</button>

<label htmlFor="email">Email</label>
<input id="email" placeholder="you@example.com" />
```

---

### 12. Console Errors in Production

**Check:** Open browser console on any page

**Common Issues:**
- React hydration warnings
- Missing key props in lists
- Deprecated API usage warnings
- Unhandled promise rejections

**Fix:** Audit with browser console and fix each error

---

## 📊 TEST COVERAGE GAPS

### Missing Test Cases:

1. **Authentication:**
   - [ ] Login with invalid credentials
   - [ ] Login with expired session
   - [ ] Session timeout during booking
   - [ ] Concurrent logins from multiple devices
   - [ ] Password reset flow (not implemented)

2. **Booking:**
   - [ ] Submit booking with expired session
   - [ ] Network failure during submission
   - [ ] Double-submit prevention
   - [ ] Browser back button during flow
   - [ ] Form data persistence

3. **Payment:**
   - [ ] Card declined
   - [ ] 3DS authentication flow
   - [ ] Payment timeout
   - [ ] Duplicate payment prevention
   - [ ] Network failure after charge

4. **Orders:**
   - [ ] Real-time status updates
   - [ ] Cancel with network failure
   - [ ] Reschedule conflicts
   - [ ] Concurrent modifications

---

## 🔐 SECURITY CONCERNS

### 1. Exposed API Keys (Check Required)

```bash
# Check if these are in client-side code:
grep -r "sk_live" . # ❌ Should never be in client code
grep -r "pk_live" . # ✅ OK in client
```

### 2. No CSRF Protection

API routes don't implement CSRF tokens. Next.js handles some of this, but verify:

```typescript
// Should add CSRF token validation for state-changing operations
```

### 3. SQL Injection via RLS

While Supabase RLS helps, verify all queries use parameterized queries:

```sql
-- ❌ BAD
SELECT * FROM orders WHERE user_id = '${userId}'

-- ✅ GOOD  
SELECT * FROM orders WHERE user_id = $1
```

### 4. XSS Vulnerabilities

Check all user input fields for proper sanitization:
- Order notes
- Special instructions
- Address fields
- Customer names

---

## 📱 MOBILE-SPECIFIC ISSUES

### 1. iOS Safari Cookie Issues

**Problem:** iOS Intelligent Tracking Prevention (ITP) may block cookies

**Check:**
```typescript
// Verify Set-Cookie headers have:
Set-Cookie: session=...; SameSite=Lax; Secure
```

### 2. Virtual Keyboard Overlap

**Problem:** iOS keyboard covers input fields

**Fix:**
```typescript
// Add to form inputs:
useEffect(() => {
  const input = inputRef.current
  input?.addEventListener('focus', () => {
    setTimeout(() => {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  })
}, [])
```

### 3. Touch Target Sizes

**Problem:** Buttons too small for touch

**Verify:** All interactive elements are >= 44x44px

```css
/* Minimum touch target size */
button, a {
  min-width: 44px;
  min-height: 44px;
}
```

---

## 🎯 PRIORITY FIX ROADMAP

### Week 1 (Critical):
1. ✅ Fix mobile login timeout issue
2. ✅ Add timeout to refreshUser()
3. ✅ Implement rate limiting on login
4. ✅ Add double-submit prevention

### Week 2 (High Priority):
5. ✅ Implement session expiry handling
6. ✅ Add network error retry logic
7. ✅ Remove/implement social auth buttons
8. ✅ Add real-time order updates

### Week 3 (Medium Priority):
9. ✅ Improve error messages
10. ✅ Add loading skeletons
11. ✅ Fix accessibility issues
12. ✅ Add comprehensive input validation

### Week 4 (Testing):
13. ✅ Mobile device testing matrix
14. ✅ Security audit
15. ✅ Performance optimization
16. ✅ Console error cleanup

---

## 📝 TESTING RECOMMENDATIONS

### 1. Add E2E Tests

```typescript
// Using Playwright
test('login flow on mobile', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('[type="submit"]')
  
  // Should redirect to orders within 5 seconds
  await page.waitForURL('/orders', { timeout: 5000 })
})
```

### 2. Add Unit Tests for Critical Functions

```typescript
describe('refreshUser', () => {
  it('should timeout after 10 seconds', async () => {
    jest.useFakeTimers()
    const promise = refreshUser()
    jest.advanceTimersByTime(11000)
    await expect(promise).rejects.toThrow('Timeout')
  })
})
```

### 3. Load Testing

```bash
# Test with k6
k6 run load-test.js --vus 100 --duration 30s
```

---

## 🔄 CONTINUOUS MONITORING

### Metrics to Track:

1. **Authentication:**
   - Login success rate (target: >98%)
   - Average login time (target: <2s)
   - Failed login attempts
   - Session timeout rate

2. **Performance:**
   - Page load time (target: <3s)
   - API response time (target: <500ms)
   - Time to Interactive (target: <3.5s)

3. **Errors:**
   - JavaScript errors per session (target: 0)
   - API error rate (target: <1%)
   - Failed payment rate

4. **User Experience:**
   - Booking completion rate
   - Form abandonment rate
   - Mobile vs desktop usage

---

## ✅ SIGN-OFF CHECKLIST

Before marking this audit as complete:

- [ ] All P0 issues have fixes implemented
- [ ] All P1 issues have fixes planned
- [ ] Security review completed
- [ ] Mobile testing on real devices
- [ ] Performance benchmarks met
- [ ] Console errors cleaned up
- [ ] Accessibility audit passed
- [ ] E2E tests added for critical flows

---

**Next Steps:**
1. Review this audit with the team
2. Prioritize fixes based on impact
3. Create GitHub issues for each item
4. Implement fixes starting with P0
5. Re-test after each fix
6. Update test plan with new cases

**Audit Complete:** October 6, 2025
