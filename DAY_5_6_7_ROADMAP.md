# 📋 Days 5-7 Roadmap - Remaining Implementation

## Current Status

**✅ Completed:** Days 1-4 (11.75 hours)  
**⏱️ Remaining:** Days 5-7 (9.75 hours)  
**Progress:** 55% complete  
**Schedule:** 2.25 hours ahead!

---

## 📅 Day 5: Quote Submission & Capacity View (4.5 hours)

### **5.1 Quote Calculation Library** (0.5h) - START HERE
**File:** `lib/partner/quoteCalculation.ts`

**Purpose:** Pure functions for calculating quotes

```typescript
// Functions to create:
- calculateLaundryQuote(params) → QuoteResult
- calculateCleaningQuote(params) → QuoteResult
- validateQuote(quote, serviceType) → ValidationResult
- formatQuoteBreakdown(quote) → string

// Use existing constants from lib/partner/constants.ts
import { LAUNDRY_PRICING, CLEANING_PRICING, QUOTE_LIMITS } from './constants';
```

**Tests to write:**
- Base price calculation
- Addon price calculation
- Surcharge application
- Min/max validation
- Edge cases

---

### **5.2 Quote Form Component** (2.5h)
**File:** `components/partner/QuoteForm.tsx`

**For Laundry Orders:**
```typescript
Inputs:
- Weight (lbs): number input, required, 1-100
- Bag count: number input, optional
- Has bedding: checkbox
- Has delicates: checkbox
- Addons:
  - Fold package ($5)
  - Same day service ($10)
  - Eco detergent ($3)
- Notes: textarea, optional
- Quote expiry: date picker, default 24h

Real-time Price Preview:
Base: $XX.XX
+ Bags: $X.XX
+ Bedding: $X.XX
+ Delicates: $X.XX
+ Fold Package: $X.XX
─────────────
Total: $XX.XX
```

**For Cleaning Orders:**
```typescript
Inputs:
- Estimated minutes: number, required, 30-480
- Customer-selected addons: display-only list
- Additional addons:
  - Deep clean (+30 min, $25)
  - Inside fridge (+15 min, $15)
  - Inside oven (+15 min, $15)
  - Inside cabinets (+20 min, $20)
- Notes: textarea, optional
- Quote expiry: date picker

Real-time Price Preview:
Base (120 min): $120.00
+ Customer addons: $XX.XX
+ Deep clean: $25.00
─────────────
Total: $XXX.XX
```

**Component Features:**
- Service type detection
- Real-time validation
- Price preview updates
- Error display
- Submit button (disabled until valid)
- Loading state
- Success/error handling

---

### **5.3 Quote Submission Page** (included in 5.2)
**File:** `app/partner/orders/[id]/quote/page.tsx`

```typescript
// Load order details
// Display order summary
// Show QuoteForm component
// Handle quote submission
// Redirect to order detail on success
```

---

### **5.4 Capacity View Page** (1h)
**File:** `app/partner/capacity/page.tsx`

**Purpose:** Read-only view of partner's schedule

```typescript
// Display next 14 days
// Show slots by date
// Color-code by utilization:
// - Green: <50% full
// - Yellow: 50-80% full  
// - Red: >80% full

UI Layout:
<DateRangePicker /> // Next 7 days, 14 days, custom
<ServiceFilter />   // All, laundry, cleaning
<CapacityCalendar>
  {days.map(day => (
    <DayCard>
      <DayHeader>{date}</DayHeader>
      {day.slots.map(slot => (
        <SlotCard color={getUtilizationColor(slot.utilization)}>
          <TimeRange />
          <ServiceType />
          <Capacity>{reserved}/{max}</Capacity>
          <ProgressBar value={utilization} />
        </SlotCard>
      ))}
    </DayCard>
  ))}
</CapacityCalendar>
```

**Note:** Read-only for MVP. Editing capacity is Phase 2.

---

### **5.5 Form Validation Setup** (0.5h)
**Consideration:** Use Zod for schema validation

```typescript
// lib/partner/validation.ts
import { z } from 'zod';
import { QUOTE_LIMITS } from './constants';

export const laundryQuoteSchema = z.object({
  weight_lbs: z.number()
    .min(QUOTE_LIMITS.MIN_WEIGHT)
    .max(QUOTE_LIMITS.MAX_WEIGHT),
  bag_count: z.number().optional(),
  has_bedding: z.boolean(),
  has_delicates: z.boolean(),
  addons: z.object({
    fold_package: z.boolean(),
    same_day: z.boolean(),
    eco_detergent: z.boolean()
  }),
  notes: z.string().optional(),
  expires_at: z.date()
});

// Similar for cleaning...
```

---

## 📅 Day 6: Integration & Polish (2 hours)

### **6.1 Cross-Linking Implementation** (1h)

**Admin Order Detail → Customer Profile**
```typescript
// In admin order detail page
<Link href={`/admin/users/${order.user_id}`}>
  View Customer Profile →
</Link>
```

**Admin User Detail → Filtered Orders**
```typescript
// Already done! Links to:
// /admin/orders?user_id={userId}

// Just need to update admin orders API to support user_id filter
```

**Update Admin Orders API:**
```typescript
// app/api/admin/orders/route.ts
if (searchParams.get('user_id')) {
  query = query.eq('user_id', searchParams.get('user_id'));
}
```

---

### **6.2 Admin Dashboard Enhancement** (1h)

**Add User Statistics:**
```typescript
// Fetch user stats
const userStats = {
  total: allUsers.length,
  customers: customers.length,
  partners: partners.length,
  admins: admins.length,
  newThisMonth: newUsers.length
};

// Display in dashboard
<StatsGrid>
  <StatCard title="Total Users" value={userStats.total} />
  <StatCard title="Customers" value={userStats.customers} />
  <StatCard title="Partners" value={userStats.partners} />
  <StatCard title="New This Month" value={userStats.newThisMonth} />
</StatsGrid>
```

**Navigation Polish:**
- Active state highlighting
- Breadcrumb improvements
- Mobile menu enhancements

---

## 📅 Day 7: Testing, Polish & Documentation (4 hours)

### **7.1 Unit Tests** (1h)

**Quote Calculation Tests:**
```typescript
// lib/partner/__tests__/quoteCalculation.test.ts
describe('calculateLaundryQuote', () => {
  it('calculates base price correctly', () => {
    const result = calculateLaundryQuote({
      weight_lbs: 10,
      bag_count: 0,
      has_bedding: false,
      has_delicates: false,
      addons: {}
    });
    expect(result.total).toBe(25.00);
  });
  
  it('applies bedding surcharge', () => {
    // ...
  });
  
  it('validates minimum total', () => {
    // ...
  });
});
```

**Status Updater Tests:**
```typescript
// Test valid transitions
// Test invalid transitions
// Test note addition
// Test error handling
```

---

### **7.2 Integration Tests** (1.5h)

**Partner Flow:**
```typescript
test('Partner can view and update order', async () => {
  // 1. Login as partner
  // 2. Navigate to orders
  // 3. Click on pending order
  // 4. Submit quote
  // 5. Verify quote submitted
  // 6. Update status
  // 7. Verify status updated
});

test('Partner can view capacity', async () => {
  // 1. Navigate to capacity
  // 2. Verify slots displayed
  // 3. Filter by service type
  // 4. Verify filtering works
});
```

**Admin Flow:**
```typescript
test('Admin can view user and their orders', async () => {
  // 1. Navigate to users
  // 2. Click on user
  // 3. View user details
  // 4. Click "View All Orders"
  // 5. Verify filtered orders
});
```

---

### **7.3 Performance Testing** (0.5h)

**Load Scenarios:**
```typescript
// Test with realistic data:
- 100 orders in partner's list
- 10 concurrent status updates
- Dashboard with real metrics
- Quote calculations (1000 iterations)

// Performance Targets:
✅ Orders list: <800ms
✅ Order detail: <600ms
✅ Quote submission: <2s
✅ Status update: <1.5s
✅ Dashboard load: <1s
```

**Tools:**
- Lighthouse
- Chrome DevTools Performance
- React Profiler
- Bundle analyzer

---

### **7.4 Documentation** (1h)

**Create:**

**A. PARTNER_PORTAL_COMPLETE.md**
```markdown
# Partner Portal - Complete Implementation

## Overview
[Description of all features]

## User Guide
[How to use each feature]

## API Reference
[All endpoints with examples]

## Components
[Reusable components and usage]
```

**B. OPERATIONS_MANAGEMENT_COMPLETE.md**
```markdown
# Operations Management - Complete Summary

## Implementation Timeline
- Day 1-4: [Summary]
- Day 5-7: [Summary]

## Features Delivered
[Comprehensive list]

## Testing Results
[All test results]

## Deployment Checklist
[Step-by-step deployment guide]
```

**C. Partner User Guide** (PDF/Markdown)
- How to log in
- Viewing orders
- Submitting quotes
- Updating status
- Viewing capacity
- Common issues

**D. Admin User Guide**
- Managing partners
- Managing users
- Managing capacity
- Viewing reports
- System settings

---

## 📊 Time Allocation

```
Day 5: Quote & Capacity    ████████░░  4.5h
  - Quote calc library     ███░░░░░░░  0.5h
  - Quote form             ███████░░░  2.5h
  - Capacity view          ██░░░░░░░░  1h
  - Validation setup       █░░░░░░░░░  0.5h

Day 6: Integration         ████░░░░░░  2h
  - Cross-linking          ██░░░░░░░░  1h
  - Dashboard enhance      ██░░░░░░░░  1h

Day 7: Testing & Docs      ████████░░  4h
  - Unit tests             ██░░░░░░░░  1h
  - Integration tests      ███░░░░░░░  1.5h
  - Performance testing    █░░░░░░░░░  0.5h
  - Documentation          ██░░░░░░░░  1h

Total Remaining:           ██████████  9.75h
```

---

## 🎯 Success Criteria

### Day 5 Complete When:
- ✅ Partners can submit quotes for both laundry and cleaning
- ✅ Quote prices calculate correctly
- ✅ Real-time price preview works
- ✅ Partners can view their capacity schedule
- ✅ All validation working

### Day 6 Complete When:
- ✅ Admin can click from user → orders
- ✅ Admin can click from order → user
- ✅ Dashboard shows user statistics
- ✅ Navigation is polished
- ✅ All cross-links working

### Day 7 Complete When:
- ✅ Unit tests passing (>80% coverage on new code)
- ✅ Integration tests passing
- ✅ Performance meets targets
- ✅ Documentation complete
- ✅ Deployment checklist ready

---

## 🚀 Ready to Proceed?

**To start Day 5:**
1. Create quote calculation library (pure functions)
2. Write unit tests for calculations
3. Build quote form component
4. Create quote submission page
5. Build capacity view page
6. Set up form validation

**Estimated completion:** 2-3 more working sessions

**Current pace:** Ahead of schedule, excellent progress!

---

**Last Updated:** October 5, 2025  
**Status:** Ready for Day 5  
**Progress:** 55% complete
