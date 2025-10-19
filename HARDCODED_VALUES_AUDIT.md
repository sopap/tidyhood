# Hardcoded Values Audit Report

## Issue Summary
The marketing pages at `/laundry` and `/cleaning` contain hardcoded prices and ZIP codes that don't match the dynamic pricing system already implemented in the codebase.

## Findings

### 1. Hardcoded Prices

#### app/laundry/page.tsx
- **Per-pound rate**: $1.75 (should be dynamic from database)
- **Minimum order**: 15 lbs / $26.25 (should be dynamic)
- **Metadata title**: "Wash & Fold Laundry Delivery in Harlem | $1.75/lb"
- **Structured data**: Fixed price of $1.75

#### app/cleaning/page.tsx
- **Studio**: $89 (should be dynamic from database)
- **1 Bedroom**: $119 (should be dynamic)
- **2 Bedroom**: $149 (should be dynamic)
- **3 Bedroom**: $179 (should be dynamic)
- **4 Bedroom**: $219 (should be dynamic)
- **Metadata title**: "House Cleaning Service in Harlem | Deep Cleaning from $89"
- **Structured data**: Fixed price range $89-$219

### 2. Hardcoded ZIP Codes
Both pages have hardcoded ZIP codes: 10026, 10027, 10030 in:
- Structured data (Schema.org markup)
- Service area sections
- While other pages use `process.env.NEXT_PUBLIC_ALLOWED_ZIPS`

### 3. Existing Dynamic Pricing System
The codebase already has `lib/display-pricing.ts` with:
- `getLaundryDisplayPricing()` - Fetches laundry pricing from database
- `getCleaningDisplayPricing()` - Fetches cleaning pricing from database
- Database queries to `pricing_rules` table
- Fallback defaults if database fails

### 4. Pages Already Using Dynamic Pricing
- `app/page.tsx` - ✅ Uses dynamic pricing correctly
- `app/services/page.tsx` - ❌ Has some hardcoded values
- `app/laundry/page.tsx` - ❌ All hardcoded
- `app/cleaning/page.tsx` - ❌ All hardcoded

## Root Cause
These marketing pages were likely created before the dynamic pricing system was implemented, or were missed during the migration to dynamic pricing.

## Solution
Convert both pages to:
1. Use Server Components to fetch pricing from database
2. Use environment variable for ZIP codes
3. Update metadata and structured data dynamically
4. Maintain SEO-friendly static generation where possible

## Impact
- **SEO**: Prices in titles/meta tags may be out of sync with actual prices
- **User Experience**: Displayed prices don't match booking flow prices
- **Maintenance**: Manual updates required when prices change
- **Data Consistency**: Multiple sources of truth for pricing
