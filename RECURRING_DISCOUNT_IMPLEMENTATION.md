# Recurring Discount Feature - Implementation Guide

## Overview
This document describes the complete implementation of the recurring discount feature for Tidyhood cleaning services.

## Feature Specification

### Discount Structure
- **Weekly:** 20% off (visits 2+)
- **Bi-weekly:** 15% off (visits 2+)
- **Monthly:** 10% off (visits 2+)
- **First Visit:** Regular price (no discount)

### Optional Features
- First visit can be deep clean at regular rate
- Users can pause/resume subscriptions
- Users can change frequency
- Full visit history tracking

## Database Schema

### Migration: `008_recurring_plans.sql`

**New Columns in `subscriptions` table:**
- `visits_completed` INTEGER DEFAULT 0
- `day_of_week` INTEGER (0=Sunday, 6=Saturday)
- `time_window` TEXT (e.g., '8–10am')
- `default_addons` JSONB
- `first_visit_deep` BOOLEAN DEFAULT false

**Column Rename:**
- `cadence` → `frequency`

**New Relationship:**
- `orders.subscription_id` → `subscriptions.id`

## API Endpoints

### Subscription Management

#### `POST /api/recurring/plan`
Create a new subscription.

**Request:**
```json
{
  "user_id": "uuid",
  "service_type": "CLEANING",
  "frequency": "weekly",
  "day_of_week": 1,
  "time_window": "8–10am",
  "default_addons": {},
  "first_visit_deep": false
}
```

**Response:**
```json
{
  "plan": {
    "id": "uuid",
    "visits_completed": 0,
    "active": true,
    ...
  }
}
```

#### `GET /api/recurring/plan?userId={uuid}`
List user's active subscriptions.

#### `GET /api/recurring/plan/{id}`
Get single subscription details.

#### `PATCH /api/recurring/plan/{id}`
Update subscription.

**Request:**
```json
{
  "frequency": "biweekly",
  "active": false
}
```

#### `DELETE /api/recurring/plan/{id}`
Cancel subscription (soft delete).

### Visit Tracking

#### `POST /api/recurring/visit-complete`
Increment visit counter after order completion.

**Request:**
```json
{
  "subscription_id": "uuid",
  "order_id": "uuid"
}
```

**Response:**
```json
{
  "visits_completed": 1,
  "next_date": "2025-01-12"
}
```

### Pricing

#### `POST /api/price/quote`
Enhanced with recurring parameters.

**Request:**
```json
{
  "service": "CLEANING",
  "zip": "10026",
  "bedrooms": 2,
  "bathrooms": 1,
  "frequency": "weekly",
  "visitsCompleted": 0,
  "firstVisitDeep": true
}
```

## Frontend Components

### `FrequencySelector`
**Location:** `components/cleaning/FrequencySelector.tsx`

**Props:**
- `value`: Current frequency
- `onChange`: Callback for frequency change
- `firstVisitDeep`: Boolean flag
- `onFirstVisitDeepChange`: Callback for deep clean toggle

**Features:**
- Card-based UI with discount badges
- Info banner explaining first visit pricing
- Optional deep clean checkbox
- Mobile responsive

### Booking Flow
**Location:** `app/book/cleaning/page.tsx`

**Enhanced with:**
- Frequency selection
- First visit deep clean option
- Two-step booking (subscription + order)
- Real-time pricing updates

### Orders Page
**Location:** `app/orders/page.tsx`

**Enhanced with:**
- "Active Recurring Plans" section at top
- Plan cards showing frequency, visits, next date
- Pause/Resume buttons
- Links to management page

### Subscription Management
**Location:** `app/orders/recurring/[id]/page.tsx`

**Features:**
- View plan details
- Edit frequency
- Pause/Resume
- View visit history
- Cancel with confirmation

## Pricing Logic

### File: `lib/pricing.ts`

```typescript
// Visit #1
if (frequency !== 'oneTime' && visitsCompleted === 0) {
  // Regular price
  // Optional deep clean multiplier if firstVisitDeep=true
  // Show info message
}

// Visit #2+
if (frequency !== 'oneTime' && visitsCompleted >= 1) {
  const discountRate = RECURRING_DISCOUNTS[frequency]
  const discountAmount = subtotal * discountRate
  final_price = subtotal - discountAmount
}
```

## Automation

### Visit Tracking
**Location:** `app/api/partner/orders/[id]/status/route.ts`

When order status changes to 'completed':
1. Check if order has `subscription_id`
2. If yes, call `/api/recurring/visit-complete`
3. Increment `visits_completed`
4. Calculate and set `next_date`

## Testing Checklist

### Unit Tests
- [ ] Pricing calculation for visit #1
- [ ] Pricing calculation for visit #2+
- [ ] Discount application logic
- [ ] Next date calculation

### Integration Tests
- [ ] Subscription creation on booking
- [ ] Visit increment on order completion
- [ ] Pause/Resume functionality
- [ ] Frequency change updates discount

### E2E Tests
- [ ] Book recurring cleaning
- [ ] Complete first visit
- [ ] Verify discount on second booking
- [ ] Pause and resume plan
- [ ] Change frequency
- [ ] Cancel plan

## Deployment

### 1. Apply Database Migration
```bash
psql $DATABASE_URL -f supabase/migrations/008_recurring_plans.sql
```

### 2. Verify Environment Variables
```bash
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

### 3. Deploy Application
```bash
npm run build
npm run start
# or deploy to Vercel
```

### 4. Smoke Tests
- Visit `/book/cleaning`
- Select recurring frequency
- Book a cleaning
- Check database for subscription record
- Complete order as partner
- Verify visit increment

## Monitoring

### Key Metrics
- Recurring bookings vs one-time
- Average visits per subscription
- Pause/cancellation rate
- Discount application accuracy

### Logs to Monitor
- Subscription creation
- Visit completion
- Discount calculations
- API errors

## Known Limitations

1. **No automatic rebooking** - Users must manually book each visit
2. **No skip functionality** - Users can pause but not skip individual visits
3. **No prorated pricing** - Frequency changes don't adjust mid-cycle

## Future Enhancements

1. **Auto-scheduling** - Automatically create orders for recurring visits
2. **Skip visits** - Allow users to skip specific visits
3. **Addon management** - Allow changing default addons
4. **Schedule customization** - Different day/time per visit
5. **Referral discounts** - Additional discounts for referrals
6. **Loyalty tiers** - Increased discounts after X visits

## Support

For issues or questions:
- Check logs in `/api/recurring/*` endpoints
- Verify subscription record in database
- Check `visits_completed` counter
- Ensure `subscription_id` is set on orders

## Files Modified/Created

### Created (9 files)
1. `supabase/migrations/008_recurring_plans.sql`
2. `components/cleaning/FrequencySelector.tsx`
3. `app/api/recurring/plan/route.ts`
4. `app/api/recurring/plan/[id]/route.ts`
5. `app/api/recurring/visit-complete/route.ts`
6. `app/orders/recurring/[id]/page.tsx`
7. `RECURRING_DISCOUNT_IMPLEMENTATION.md` (this file)

### Modified (6 files)
1. `lib/types.ts`
2. `lib/pricing.ts`
3. `app/api/price/quote/route.ts`
4. `app/book/cleaning/page.tsx`
5. `app/api/partner/orders/[id]/status/route.ts`
6. `app/orders/page.tsx`

## Version History

- **v1.0** - Initial implementation (2025-01-05)
  - Core recurring discount logic
  - Subscription CRUD API
  - Visit tracking automation
  - UI components
  - Management interface
