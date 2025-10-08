# Laundry Service Update - Same Day Service Implementation

**Date**: October 8, 2025, 5:32 PM  
**Status**: ✅ COMPLETE - Updated to Same Day Service with 11 AM cutoff

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
- **Optional Same Day Service**: +25% for expedited turnaround
  - **Pickup before 11 AM**: Same-day delivery (6-8 PM or 8-10 PM evening slots)
  - **Pickup after 11 AM**: Next-day delivery (24-hour turnaround)

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
// "⚡ Same Day Service (+25%)"
// "Pickup before 11 AM: delivery same day (6-8 PM or 8-10 PM). After 11 AM: next-day delivery"
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

### 3. Delivery Date Logic (`lib/timezone.ts`)

**Updated `getMinimumDeliveryDate()` function**:
```typescript
export function getMinimumDeliveryDate(pickupSlotEnd: string, isRush: boolean): string {
  const pickupEnd = new Date(pickupSlotEnd);
  
  // Check if pickup ends before 11 AM in NY timezone
  const pickupEndHourNY = parseInt(pickupEnd.toLocaleTimeString('en-US', {
    timeZone: NY_TIMEZONE,
    hour: '2-digit',
    hour12: false
  }));
  
  // Determine minimum hours based on service type and pickup time
  let minimumHours: number;
  if (isRush && pickupEndHourNY < 11) {
    // Same day service: if pickup before 11 AM, can deliver same day
    minimumHours = 0;
  } else if (isRush) {
    // Same day service: if pickup after 11 AM, deliver next day (24h)
    minimumHours = 24;
  } else {
    // Standard service: 48 hours
    minimumHours = 48;
  }
  
  // ... rest of function
}
```

### 4. API Route (`app/api/price/quote/route.ts`)

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
- **Turnaround**: 2-3 business days (48 hours)

### Same Day Service (+25%) - Pickup Before 11 AM:
- 15 lbs @ $2.50/lb = $37.50
- Same Day Service (+25%) = $9.38
- **Subtotal**: $46.88
- Tax (0%) = $0.00
- **Total**: $46.88
- **Turnaround**: Same day delivery (6-8 PM or 8-10 PM slots)

### Same Day Service (+25%) - Pickup After 11 AM:
- 15 lbs @ $2.50/lb = $37.50
- Same Day Service (+25%) = $9.38
- **Subtotal**: $46.88
- Tax (0%) = $0.00
- **Total**: $46.88
- **Turnaround**: Next-day delivery (24 hours)

---

## User Experience

### What Customers See:

**Service Details Section**:
1. Service type selector (Wash & Fold / Dry Clean / Mixed)
2. Load size selector (Small / Medium / Large)
3. **Green banner**: "✓ Free Pickup & Delivery Included"
4. **Same Day checkbox**: "⚡ Same Day Service (+25%)"
   - Description: "Pickup before 11 AM: delivery same day (6-8 PM or 8-10 PM). After 11 AM: next-day delivery"

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
1. User toggles Same Day service checkbox
2. React state updates (`rushService: boolean` - internal name unchanged)
3. useEffect triggers price recalculation
4. API call includes `rushService` parameter
5. Backend calculates 25% surcharge on subtotal
6. When calculating delivery date:
   - `getMinimumDeliveryDate()` checks pickup slot end time
   - If before 11 AM + Same Day selected: returns same day (0 hours added)
   - If after 11 AM + Same Day selected: returns next day (24 hours added)
   - If Standard service: returns 48 hours later
7. Delivery slot picker filters to show only valid slots (evening slots for same-day)
8. Updated price and delivery options displayed

### Database Storage:
- `rushService` boolean saved in `order_details` JSONB field (field name unchanged for backward compatibility)
- Partners can see this requirement when fulfilling order
- Used for operational planning and SLA tracking
- Display as "Same Day Service" in UI, but stored internally as `rushService`

### Tax Treatment:
- Rush service is **not taxable** (service fee, not tangible good)
- Consistent with NYC tax law for expedited service fees
- Base laundry service also not taxable

---

## Testing Checklist

- [x] Test pricing with Same Day service enabled (verify +25%)
- [x] Test pricing with Same Day service disabled (verify no change)
- [x] Verify green banner shows delivery is included
- [x] Test pickup before 11 AM - verify same-day delivery date
- [x] Test pickup after 11 AM - verify next-day delivery (24h)
- [x] Test Standard service - verify 48h delivery
- [x] Verify delivery slot filtering shows evening slots for same-day
- [x] Test with different weight tiers
- [x] Test with dry clean service type
- [x] Verify rushService saves to order details
- [x] Test that partner can see rush requirement
- [x] Verify SLA tracking works correctly

---

## Benefits

✅ **Customer Clarity**: Explicitly states delivery is included (no surprises)  
✅ **True Same Day Service**: Customers picking up before 11 AM get same-day evening delivery  
✅ **Flexible Options**: After 11 AM still gets next-day service at same price  
✅ **Fair Pricing**: 25% premium is reasonable for expedited service  
✅ **Operational Planning**: Partners know which orders need priority and timing  
✅ **Revenue Opportunity**: Upsell option for time-sensitive customers  
✅ **Better Naming**: "Same Day" is clearer than "Rush" for customer understanding

---

## Related Files

- `app/book/laundry/page.tsx` - Frontend booking form (UI labels updated)
- `lib/timezone.ts` - Delivery date calculation with 11 AM cutoff logic
- `lib/slots.ts` - Slot filtering utilities (wrapper, no changes needed)
- `lib/pricing.ts` - Pricing calculation logic (25% surcharge, unchanged)
- `app/api/price/quote/route.ts` - Quote API endpoint (pass-through, unchanged)

---

**Status**: ✅ Complete with Same Day service implementation  
**Impact**: Provides true same-day service for early pickups while maintaining next-day option for later pickups. Improves customer clarity and operational efficiency.

## Implementation Summary (October 8, 2025)

### Changes Made:
1. **Updated UI Labels**: Changed "24-Hour Rush Service" to "Same Day Service"
2. **11 AM Cutoff Logic**: Added pickup time checking in `getMinimumDeliveryDate()`
3. **Smart Delivery Calculation**: 
   - Before 11 AM + Same Day = 0 hours (same day evening)
   - After 11 AM + Same Day = 24 hours (next day)
   - Standard service = 48 hours
4. **Backward Compatible**: Internal `rushService` field name unchanged

### Files Modified:
- `lib/timezone.ts` - Core delivery date logic
- `app/book/laundry/page.tsx` - UI text updates

### Zero Impact On:
- Cleaning service (doesn't use these functions)
- Database schema (no migrations needed)
- Pricing calculation (25% still applies)
- Partner/Admin dashboards (just display existing data)
