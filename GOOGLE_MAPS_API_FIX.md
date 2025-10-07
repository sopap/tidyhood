# Google Maps API Key Fix - October 6, 2025

## Problem
Google Maps was failing with `InvalidKeyMapError` due to multiple API key issues:
1. Hardcoded API key in `lib/googleMaps.ts` bypassing environment variables
2. Inconsistent API keys across environment files
3. Incorrect API key being used (typos in the key string)

## Root Cause Analysis

### Incorrect API Keys Found
- `.env.local`: Had typo `AIzaSyA3fgqY1v5a-a6T-cPDFsat6Li0Nkmkxgo` ✓ (already correct)
- `.env.production`: Had typo `AIzaSyA3fgqYiv5a-a6T-cPDFeatGLi0Nkmkxgo` (fixed)
- `lib/googleMaps.ts`: Hardcoded wrong key (fixed)

### Correct API Key
```
AIzaSyA3fgqY1v5a-a6T-cPDFsat6Li0Nkmkxgo
```

## Changes Made

### 1. Fixed lib/googleMaps.ts
**Before:**
```typescript
// TEMPORARY FIX: Hardcoding API key due to Vercel env var issues
const apiKey = 'AIzaSyA3fgqYiv5a-a6T-cPDFeatGLi0Nkmkxgo';
```

**After:**
```typescript
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
```

### 2. Updated .env.production
Changed from incorrect key to:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyA3fgqY1v5a-a6T-cPDFsat6Li0Nkmkxgo
```

### 3. Verified .env.local
Already has correct key - no changes needed.

## Next Steps Required

### 1. Restart Development Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```
**Why:** Next.js embeds `NEXT_PUBLIC_*` variables at build time. Must restart to pick up changes.

### 2. Verify Google Cloud Console Settings
Check your Google Cloud Console for this API key:
- [ ] Maps JavaScript API is **enabled**
- [ ] Places API is **enabled**
- [ ] HTTP referrer restrictions include:
  - `localhost:3000/*`
  - `www.tidyhood.nyc/*`
  - `tidyhood.nyc/*`
- [ ] Billing is **enabled**
- [ ] No usage quotas exceeded

### 3. Test Google Maps Functionality
After restart, test:
- [ ] Address autocomplete on booking pages
- [ ] No console errors about InvalidKeyMapError
- [ ] Places API suggestions appear

### 4. Fix /api/services/available Error
The 500 error on this endpoint is likely a **separate Supabase issue**:
```
GET /api/services/available?zip=10027&service_type=LAUNDRY 500 (Internal Server Error)
```

Check:
- [ ] Supabase connection is working
- [ ] `partners` table exists
- [ ] Supabase environment variables are correct in both env files

### 5. Production Deployment
When deploying to production (Vercel):
- [ ] Ensure `.env.production` values are set in Vercel environment variables
- [ ] Rebuild the application (Vercel does this automatically)
- [ ] Verify Maps works in production

## Secondary Issues (Non-Critical)

### Deprecation Warnings
Google is deprecating `google.maps.places.Autocomplete` in favor of `PlaceAutocompleteElement`. This can be addressed later but is not urgent (12+ months notice).

## Files Modified
1. `lib/googleMaps.ts` - Removed hardcoded API key
2. `.env.production` - Fixed API key typo

## Testing Checklist
- [ ] Development server restarted
- [ ] Google Maps loads without errors
- [ ] Address autocomplete works
- [ ] No InvalidKeyMapError in console
- [ ] /api/services/available endpoint investigated
