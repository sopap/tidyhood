# Environment Variable Issue - Deep Diagnosis

## Problem
`process.env.NEXT_PUBLIC_SUPABASE_URL` is `undefined` in browser on Vercel production, causing "supabaseUrl is required" error.

## What We Know
1. ✅ Environment variables ARE set in Vercel dashboard
2. ✅ Landing page loads (static content)
3. ❌ `/orders` page fails (needs Supabase client)
4. ✅ Local build works fine with `.env.local`
5. ❌ Multiple cache-cleared rebuilds on Vercel haven't fixed it

## Root Cause Analysis

### How Next.js Embeds NEXT_PUBLIC_* Variables

1. **At Build Time**: Next.js reads `NEXT_PUBLIC_*` vars from `process.env`
2. **String Replacement**: It does a find-and-replace in the code, replacing `process.env.NEXT_PUBLIC_X` with the actual string value
3. **In Browser**: The JavaScript bundle contains the literal string values

### Why This Fails on Vercel

**The environment variables must be available DURING the build, not just at runtime.**

If Vercel environment variables are:
- ❌ Set as "Runtime" only → Build gets `undefined`
- ✅ Set for "Build Time" → Build embeds actual values

## Critical Vercel Settings to Check

### 1. Environment Variable Scope
In Vercel Dashboard → Project Settings → Environment Variables:

Each variable should show:
```
✓ Production
✓ Preview  
✓ Development
```

AND most importantly:
```
Available during: [x] Build  [x] Runtime
```

### 2. Environment Type
Variables must be set for the **Production** environment specifically.

### 3. Sensitive Variables
If marked as "Sensitive", they might not be available at build time for security reasons.
- ❌ Don't mark `NEXT_PUBLIC_*` as sensitive
- ✅ These are public variables that MUST be in the browser anyway

## The Fix

### Option 1: Verify Vercel Settings (Most Likely)
1. Go to Vercel Dashboard
2. Project Settings → Environment Variables
3. For EACH of these variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
4. Click "Edit" 
5. Ensure:
   - ✅ "Production" is checked
   - ✅ Variable is NOT marked as "Encrypted" or "Sensitive"
   - ✅ Value is correct (no extra spaces, quotes, etc.)
6. After fixing, **Redeploy** (cache clear not needed if vars are fixed)

### Option 2: Use `.env.production` File (Alternative)
Create a `.env.production` file in the repo with the public vars.
**Note**: Only use this for `NEXT_PUBLIC_*` vars that are safe to commit.

```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Option 3: Hardcode in next.config.js (Last Resort)
```javascript
// next.config.js
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    // ... but only if Vercel vars are available at build
  }
}
```

## Testing the Fix

After fixing Vercel settings:
1. Trigger new deployment
2. Check build logs for env var warnings
3. Test in browser console:
   ```javascript
   console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
   ```
4. Should see the actual URL, not `undefined`

## Common Pitfalls

1. **Case Sensitivity**: Environment variable names are case-sensitive
2. **Typos**: `NEXT_PUBLIC_SUPABASE_URL` vs `NEXT_PUBLIC_SUPABASE_URI`
3. **Quotes**: Don't wrap values in quotes in Vercel dashboard
4. **Spaces**: Trim any leading/trailing spaces
5. **Wrong Environment**: Set for "Production", not just "Preview"
