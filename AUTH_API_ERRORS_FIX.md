# 🔧 Auth & API Errors - Troubleshooting Guide

**Date:** October 5, 2025  
**Errors:** Supabase 403 Forbidden + Orders API 500 Internal Server Error

---

## 🐛 Errors Detected

### 1. Supabase Auth Error (403 Forbidden)
```
GET https://gbymheksmnenuranuvjr.supabase.co/auth/v1/user 403 (Forbidden)
```

### 2. Orders API Error (500 Internal Server Error)
```
GET http://localhost:3000/api/orders 500 (Internal Server Error)
Error: Failed to fetch orders
```

---

## 🔍 Root Cause Analysis

### Primary Issue: **No Authenticated Session**

The errors occur because:
1. **No user is logged in** → Supabase returns 403
2. **`requireAuth()` throws error** → Orders API returns 500
3. **Session cookies missing** → Auth check fails

### Secondary Issues (Possible)
- Environment variables not set correctly
- RLS policies blocking access
- Session expired or invalid

---

## ✅ Quick Fix Steps

### Step 1: Check If You're Logged In

The app requires authentication to view orders. Check if you're logged in:

```bash
# Check browser console for auth state
# Look for: "User authenticated: [user-id]" in logs
```

### Step 2: Log In

Navigate to the login page:
```
http://localhost:3000/login
```

Or create an account:
```
http://localhost:3000/signup
```

### Step 3: Verify Environment Variables

Check `.env.local` has these values:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gbymheksmnenuranuvjr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# These must be set!
```

### Step 4: Restart Dev Server

After setting environment variables:

```bash
# Stop server (Ctrl+C)
# Restart
npm run dev
```

---

## 🔧 Detailed Troubleshooting

### Issue 1: Auth Context Not Initialized

**Problem:** The auth context might not be wrapping the app properly.

**Check:** `app/layout.tsx` should have `AuthProvider`:

```tsx
import { AuthProvider } from '@/lib/auth-context';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Issue 2: Protected Routes

**Problem:** Orders page is protected but user isn't authenticated.

**Check:** `app/orders/page.tsx` should handle unauthenticated state:

```tsx
'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/orders');
    }
  }, [user, loading, router]);
  
  if (loading) return <div>Loading...</div>;
  if (!user) return null;
  
  // ... rest of component
}
```

### Issue 3: API Route Auth Check

**Problem:** API returns 500 instead of 401/403 for unauthenticated requests.

**Solution:** Update error handling in `/api/orders/route.ts`:

The current code throws a generic error:
```typescript
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized') // This causes 500
  }
  return user
}
```

**Better approach:**
```typescript
// lib/auth.ts
export class UnauthorizedError extends Error {
  statusCode = 401
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new UnauthorizedError()
  }
  return user
}

// app/api/orders/route.ts
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    // ... rest of code
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { error: 'Please log in to view orders' },
        { status: 401 }
      )
    }
    // ... handle other errors
  }
}
```

### Issue 4: Session Cookies

**Problem:** Session cookies not being set/read correctly.

**Check:**
1. Browser DevTools → Application → Cookies
2. Look for Supabase session cookies (e.g., `sb-access-token`)

**Clear cookies if corrupted:**
```javascript
// In browser console
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});
```

Then refresh and log in again.

---

## 🚀 Recommended Fixes

### Fix 1: Add Better Error Handling to Orders API

<replace_file>
<path>app/api/orders/route.ts</path>
<change>
```typescript
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const db = getServiceClient()
    // ... rest of code
  } catch (error) {
    console.error('Orders GET error:', error)
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}
```
</change>
<to>
```typescript
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHENTICATED',
          message: 'Please log in to view your orders'
        },
        { status: 401 }
      )
    }
    
    const db = getServiceClient()
    // ... rest of code
  } catch (error) {
    console.error('Orders GET error:', error)
    
    // Check if it's an auth error
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHENTICATED',
          message: 'Please log in to view your orders'
        },
        { status: 401 }
      )
    }
    
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}
```
</to>
</replace_file>

### Fix 2: Add Redirect to Login on Orders Page

The orders page should redirect to login if not authenticated:

```typescript
// app/orders/page.tsx
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user) {
      // Redirect to login with return URL
      router.push('/login?redirect=/orders');
    }
  }, [user, loading, router]);
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null;
  }
  
  // ... rest of orders page
}
```

### Fix 3: Update Error Handler

```typescript
// lib/errors.ts
export class UnauthorizedError extends Error {
  statusCode = 401;
  code = 'UNAUTHENTICATED';
  
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// Update requireAuth to use custom error
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError('Please log in to continue');
  }
  return user;
}
```

---

## 📋 Checklist

Run through these steps:

- [ ] **Check if logged in** - Navigate to `/login` and sign in
- [ ] **Verify env variables** - Check `.env.local` has Supabase credentials
- [ ] **Restart dev server** - Stop and restart with `npm run dev`
- [ ] **Clear cookies** - Clear browser cookies if session corrupted
- [ ] **Check auth context** - Verify `AuthProvider` wraps the app
- [ ] **Test login flow** - Try logging in and navigating to `/orders`
- [ ] **Check browser console** - Look for additional error details
- [ ] **Verify RLS policies** - Check Supabase dashboard for RLS settings

---

## 🎯 Expected Behavior

### When Not Logged In:
1. Navigate to `/orders`
2. Should redirect to `/login?redirect=/orders`
3. After login, should return to `/orders`
4. Orders should load successfully

### When Logged In:
1. Navigate to `/orders`
2. Should see loading state
3. Orders fetch successfully
4. Orders list displays

---

## 💡 Prevention

To prevent these errors in the future:

1. **Add route protection** - Use middleware or route guards
2. **Better error messages** - Return 401 instead of 500 for auth errors
3. **Loading states** - Show loading UI while checking auth
4. **Error boundaries** - Catch and display errors gracefully
5. **Session management** - Auto-refresh tokens before expiry

---

## 📞 Need Help?

If errors persist after trying these fixes:

1. **Check Supabase Dashboard**
   - Go to https://app.supabase.com
   - Verify your project is active
   - Check RLS policies on `orders` table

2. **Check Browser Console**
   - Look for detailed error messages
   - Check Network tab for failed requests
   - Verify cookies are being set

3. **Test Auth Endpoints**
   ```bash
   # Test if Supabase is responding
   curl https://gbymheksmnenuranuvjr.supabase.co/rest/v1/
   ```

---

## ✅ Quick Test

After applying fixes, test with:

```bash
# 1. Make sure you're logged in
# 2. Open browser console
# 3. Navigate to /orders
# 4. Should see orders (or empty state if no orders)
# 5. No 403 or 500 errors
```

---

**Status:** Identified - Auth errors due to missing session  
**Solution:** Log in or fix auth context  
**Priority:** HIGH - Blocks entire orders feature
