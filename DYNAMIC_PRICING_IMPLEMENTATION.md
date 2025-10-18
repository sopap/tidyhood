# Dynamic Pricing Implementation - Phase 1 Complete

**Date:** October 18, 2025
**Status:** In Progress (Phase 1 of 2 Complete)

## Problem Solved

Admin settings showed **$2.15/lb** but marketing pages showed **$1.75/lb** because prices were hardcoded instead of pulling from database.

## Solution Implemented

Created dynamic pricing system that fetches current prices from the database in real-time.

### Phase 1 Complete ✅

1. **Created lib/display-pricing.ts** - Utility functions for fetching pricing
   - `getLaundryDisplayPricing()` - Fetches laundry per-lb and minimum order
   - `getCleaningDisplayPricing()` - Fetches cleaning rates by room type
   - Includes fallback defaults if database fails
   
2. **Updated app/page.tsx** - Homepage now dynamic
   - Fetches pricing via `/api/admin/settings/pricing` endpoint
   - Updates on every page load
   - Shows database-driven prices: $2.15/lb, $15.00 minimum

### Phase 2 Remaining

Need to update these files with dynamic pricing:

1. **app/services/page.tsx**
   - Replace: `$1.75/lb` → `{pricing.laundryPerLb}`
   - Replace: `$26.25` → `{pricing.laundryMinOrder}`

2. **app/laundry/page.tsx**
   - Multiple hardcoded price references
   - FAQ section mentions
   - Metadata/SEO strings

3. **app/layout.tsx**
   - Metadata description: `"from $1.75/lb"` needs to be dynamic
   - Consider generating metadata at request time

## Implementation Approach

Using **client-side fetch** for now because:
- Marketing pages are already client components (use framer-motion)
- Quick implementation (1 API call per page load)
- SEO not impacted (Google executes JS)
- Can optimize to Server Components later if needed

## Architecture

```
User loads page
  ↓
useEffect runs
  ↓
fetch('/api/admin/settings/pricing')
  ↓
Parse pricing rules from database
  ↓
Update state → Display latest prices
```

## Testing Checklist

- [x] Homepage shows dynamic pricing
- [ ] Services page shows dynamic pricing  
- [ ] Laundry page shows dynamic pricing
- [ ] Layout metadata updates
- [ ] Verify admin settings changes propagate immediately
- [ ] Test with different pricing values in admin

## Files Changed

### New Files
- `lib/display-pricing.ts` - Pricing utility functions (currently unused, kept for future SSR approach)
- `CRITICAL_HARDCODED_PRICING_ISSUE.md` - Problem documentation

### Modified Files
- `app/page.tsx` - Now fetches dynamic pricing

### Remaining Files
- `app/services/page.tsx` - TODO
- `app/laundry/page.tsx` - TODO
- `app/layout.tsx` - TODO

## Production Impact

**Before Fix:**
- Admin changes pricing → Only booking flow affected
- Marketing pages show stale $1.75/lb
- User confusion

**After Fix (Phase 1):**
- Admin changes pricing → Homepage updates immediately
- Booking flow continues to work correctly
- Still need to fix services/laundry pages + metadata

**After Fix (Phase 2 - Complete):**
- Admin changes pricing → All pages update
- Complete pricing consistency across site
- Single source of truth (database)

## Deployment Notes

1. This change is backwards compatible
2. No database migration needed (uses existing tables)
3. Falls back to defaults if API fails
4. Can deploy incrementally (page by page)

## Future Optimizations

1. **Server Components** - Move to Next.js 13+ RSC for SSR pricing
2. **ISR with Revalidation** - Cache pages, revalidate every 5 minutes
3. **Build-time Generation** - Generate metadata at build with database snapshot
4. **Edge Caching** - Use Vercel's edge cache with on-demand revalidation

For now, client-side fetch is acceptable given existing architecture.
