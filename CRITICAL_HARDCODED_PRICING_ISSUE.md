# CRITICAL: Hardcoded Pricing on Marketing Pages

**Date:** October 18, 2025
**Severity:** HIGH
**Status:** Requires Fix

## Problem

Admin settings shows $2.15/lb but homepage and marketing pages show $1.75/lb because they have **hardcoded prices** instead of pulling from the database.

## Root Cause

While the booking flow uses `lib/pricing.ts` (which queries the database), marketing pages have hardcoded values:

### Files with Hardcoded Prices

1. **app/page.tsx** (Homepage)
   - Line: `$1.75/lb`
   - Line: `(minimum order $26.25)`

2. **app/services/page.tsx**
   - Line: `$1.75/lb`
   - Line: `(minimum order $26.25)`

3. **app/laundry/page.tsx**
   - Line: `$1.75/lb`  
   - Line: `15 lb minimum ($26.25)`
   - Multiple mentions in FAQ section

4. **app/layout.tsx** (SEO metadata)
   - Line: `from $1.75/lb`

## Impact

- **User Confusion:** Users see different prices on homepage vs admin settings
- **Revenue Loss:** If admin wants to raise prices, marketing pages won't reflect it
- **Brand Trust:** Inconsistent pricing damages credibility
- **Admin Workflow:** Admin settings changes don't propagate to public pages

## Current Architecture

```
✅ CORRECT (Booking Flow):
User books → lib/pricing.ts → queries pricing_rules table → uses latest prices

❌ BROKEN (Marketing Pages):
User visits homepage → hardcoded $1.75 → outdated price
```

## Solutions

### Option 1: Server Components with Database Queries (RECOMMENDED)
Convert marketing pages to RSC that fetch pricing on each request:

```typescript
// app/page.tsx
import { getServiceClient } from '@/lib/db'

export default async function HomePage() {
  const db = getServiceClient()
  const { data: perLbRule } = await db
    .from('pricing_rules')
    .select('unit_price_cents')
    .eq('unit_key', 'LND_WF_PERLB')
    .eq('active', true)
    .single()
  
  const perLbPrice = (perLbRule?.unit_price_cents || 175) / 100
  const minOrderPrice = (perLbPrice * 15).toFixed(2)
  
  return (
    <div>
      ${perLbPrice.toFixed(2)}/lb
      (minimum order ${minOrderPrice})
    </div>
  )
}
```

**Pros:**
- Always shows latest prices
- No caching issues
- Simple implementation

**Cons:**
- Database query on every page load
- Slower initial load (but cacheable)

### Option 2: ISR (Incremental Static Regeneration)
Generate static pages with revalidation:

```typescript
export const revalidate = 300 // 5 minutes

export default async function HomePage() {
  // Fetch pricing...
}
```

**Pros:**
- Fast page loads (static)
- Automatic updates every 5 minutes

**Cons:**
- Up to 5 minute delay for price changes
- More complex caching

### Option 3: Client-Side Fetch (NOT RECOMMENDED)
Use client components to fetch pricing:

**Pros:**
- None (don't use this)

**Cons:**
- SEO problems (Google sees old prices)
- Flash of incorrect content
- Extra client-side requests

## Recommended Fix

**Phase 1: Create Pricing Context/Utility**
```typescript
// lib/display-pricing.ts
export async function getLaundryDisplayPricing() {
  const db = getServiceClient()
  
  const { data: perLbRule } = await db
    .from('pricing_rules')
    .select('unit_price_cents')
    .eq('unit_key', 'LND_WF_PERLB')
    .eq('active', true)
    .single()
    
  const { data: minRule } = await db
    .from('pricing_rules')
    .select('unit_price_cents')
    .eq('unit_key', 'LND_WF_MIN_LBS')
    .eq('active', true)
    .single()
  
  return {
    perLb: (perLbRule?.unit_price_cents || 175) / 100,
    minOrder: (minRule?.unit_price_cents || 1500) / 100,
  }
}
```

**Phase 2: Update Marketing Pages**
- app/page.tsx
- app/services/page.tsx
- app/laundry/page.tsx
- app/layout.tsx (generate metadata dynamically)

**Phase 3: Add Revalidation**
Use ISR with 5-minute revalidation to balance freshness and performance.

## Temporary Workaround

Until fixed, admin should be aware that changing prices in `/admin/settings` will:
- ✅ Affect new bookings immediately
- ❌ NOT update homepage/marketing pages
- Manual code updates needed for marketing copy

## Estimated Effort

- **2-3 hours** to implement Phase 1 & 2
- **1 hour** for testing and verification
- **Total: 3-4 hours**

## Priority

**HIGH** - This undermines the entire admin settings feature and creates user confusion.

## Related Files

- Admin Settings: `/app/admin/settings/page.tsx` ✅ (working)
- Booking Flow: `/lib/pricing.ts` ✅ (working)
- Homepage: `/app/page.tsx` ❌ (hardcoded)
- Services: `/app/services/page.tsx` ❌ (hardcoded)
- Laundry: `/app/laundry/page.tsx` ❌ (hardcoded)
- Metadata: `/app/layout.tsx` ❌ (hardcoded)
