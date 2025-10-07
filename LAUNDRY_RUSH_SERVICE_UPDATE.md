# Laundry Service Update - Rush Service Implementation

**Date**: October 7, 2025, 1:49 PM  
**Status**: ✅ COMPLETE  

---

## Summary

Replaced incorrect "delivery fee" with proper "24-hour rush service" option for laundry bookings.

## Business Logic Clarification

### Before (Incorrect):
- Base service included pickup only
- "+$5 delivery fee" to return laundry
- This was wrong - delivery is part of the core service!

### After (Correct):
- **Base service includes**: Pickup AND delivery (FREE)
- **Standard turnaround**: 2-3 business days
- **Optional rush service**: +25% for 24-hour turnaround
  - Same-day return if pickup before 11 AM
  - Next-day return if pickup after 11 AM

---

## Changes Made

### 1. Frontend UI (`app/book/laundry/page.tsx`)

**Removed**:
```tsx
const [needsDelivery, setNeedsDelivery] = useState(false)

// Checkbox showing:
// "Add Return Delivery - We'll deliver your clean laundry back to you (+$5)"
```

**Added**:
```tsx
const [rushService, setRushService] = useState(false)

// Green info banner:
// "✓ Free Pickup & Delivery Included"
// "We pick up your laundry and deliver it back to you at no extra charge.
//  Standard turnaround: 2-3 business days."

// Checkbox showing:
// "⚡ 24-Hour Rush Service (+25%)"
// "Same-day return if picked up before 11 AM, otherwise next-day delivery"
```

### 2. Pricing Calculation (`lib/pricing.ts`)

**Updated `LaundryQuoteParams` interface**:
```typescript
export interface LaundryQuoteParams {
  zip: string
  lbs: number
  addons?: string[]
  rushService?: boolean  // NEW
}
```

**Updated `quoteLaundry()` function**:
```typescript
// Calculate subtotal from base + addons
let subtotal_cents = items.reduce((sum, item) => sum + item.total_cents, 0)

// Apply 25% rush service surcharge if selected
if (rushService) {
  const rushCharge = Math.round(subtotal_cents * 0.25)
  items.push({
    key: 'LND_RUSH_24HR',
    label: '24-Hour Rush Service (+25%)',
    unit_price_cents: rushCharge,
    total_cents: rushCharge,
    taxable: false,
  })
  subtotal_cents += rushCharge
}

// Note: Delivery is included in base price (no separate fee)
const deliveryCents = 0
```

### 3. API Route (`app/api/price/quote/route.ts`)

**Updated schema**:
```typescript
const laundrySchema = z.object({
  service: z.literal('LAUNDRY'),
  zip: z.string().length(5),
  lbs: z.number().min(1).max(200),
  addons: z.array(z.string()).optional(),
  rushService: z.boolean().optional(),  // NEW
})
```

**Updated quote call**:
```typescript
quote = await quoteLaundry({
  zip: params.zip,
  lbs: params.lbs,
  addons: params.addons,
  rushService: params.rushService,  // NEW
})
```

---

## Pricing Examples

### Standard Service (FREE delivery):
- 15 lbs @ $2.50/lb = $37.50
- Tax (0%) = $0.00
- **Total**: $37.50
- **Turnaround**: 2-3 business days

### Rush Service (+25%):
- 15 lbs @ $2.50/lb = $37.50
- Rush Service (+25%) = $9.38
- **Subtotal**: $46.88
- Tax (0%) = $0.00
- **Total**: $46.88
- **Turnaround**: 24 hours (same-day if before 11 AM)

---

## User Experience

### What Customers See:

**Service Details Section**:
1. Service type selector (Wash & Fold / Dry Clean / Mixed)
2. Load size selector (Small / Medium / Large)
3. **Green banner**: "✓ Free Pickup & Delivery Included"
4. **Rush checkbox**: "⚡ 24-Hour Rush Service (+25%)"

**Pricing Display**:
- Shows rush charge as separate line item when selected
- Clearly labeled as "+25%" surcharge
- Updates live as customer toggles option

**Submit Button**:
- Remains the same validation logic
- No changes to button enable/disable conditions

---

## Technical Notes

### Data Flow:
1. User toggles rush service checkbox
2. React state updates (`rushService: boolean`)
3. useEffect triggers price recalculation
4. API call includes `rushService` parameter
5. Backend calculates 25% surcharge on subtotal
6. Updated price returned and displayed

### Database Storage:
- `rushService` boolean saved in `order_details` JSONB field
- Partners can see this requirement when fulfilling order
- Used for operational planning and SLA tracking

### Tax Treatment:
- Rush service is **not taxable** (service fee, not tangible good)
- Consistent with NYC tax law for expedited service fees
- Base laundry service also not taxable

---

## Testing Checklist

- [ ] Test pricing with rush service enabled (verify +25%)
- [ ] Test pricing with rush service disabled (verify no change)
- [ ] Verify green banner shows delivery is included
- [ ] Test with different weight tiers
- [ ] Test with dry clean service type
- [ ] Verify rush service saves to order details
- [ ] Test that partner can see rush requirement
- [ ] Verify SLA tracking for rush orders

---

## Benefits

✅ **Customer Clarity**: Explicitly states delivery is included (no surprises)  
✅ **Premium Option**: Offers rush service for urgent needs  
✅ **Fair Pricing**: 25% premium is reasonable for 24h turnaround  
✅ **Operational Planning**: Partners know which orders need priority  
✅ **Revenue Opportunity**: Upsell option for time-sensitive customers  

---

## Related Files

- `app/book/laundry/page.tsx` - Frontend booking form
- `lib/pricing.ts` - Pricing calculation logic
- `app/api/price/quote/route.ts` - Quote API endpoint

---

**Status**: ✅ Complete and ready for testing  
**Impact**: Improves customer clarity and adds revenue opportunity
