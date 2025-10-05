# Order State Machine - Implementation Plan

**Status:** Ready for Implementation  
**Score:** 9.2/10  
**Timeline:** 6 weeks (1 engineer) | 3 weeks (2 engineers)  
**Last Updated:** October 5, 2025

---

## Executive Summary

This plan implements a unified order state machine for both laundry (quote-first) and cleaning (pay-to-book) services. The spec received a 9.2/10 score with minor gaps in security and API documentation that will be addressed during implementation.

### Key Improvements
- ✅ Unified state machine for both services
- ✅ Clear API contracts with validation
- ✅ Mobile-first UI with comprehensive UX
- ✅ Partner webhook integration
- ✅ Comprehensive analytics tracking

---

## 📦 Phase 1: MVP Foundation (Weeks 1-3)

### Week 1: Data Layer & State Machine

#### Day 1-2: Database Migration
**File:** `supabase/migrations/010_unified_order_status.sql`

```sql
-- Add new status enum values
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'out_for_delivery';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cleaned';

-- Add phone column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add quote JSONB column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quote JSONB;

-- Create status mapping function for backward compatibility
CREATE OR REPLACE FUNCTION map_legacy_status(old_status TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE old_status
    WHEN 'pending_pickup' THEN 'scheduled'
    WHEN 'paid_processing' THEN 'processing'
    ELSE old_status
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
```

**Testing:**
- Run migration on dev database
- Verify backward compatibility
- Test rollback script
- Load test with 10k existing orders

**Deliverable:** ✅ Migration script with rollback plan

---

#### Day 3-4: State Machine Implementation
**File:** `lib/orderStateMachine.ts`

```typescript
export type OrderStatus =
  | 'scheduled'
  | 'picked_up'
  | 'at_facility'
  | 'quote_sent'
  | 'awaiting_payment'
  | 'processing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cleaned'
  | 'canceled';

export type ServiceType = 'LAUNDRY' | 'CLEANING';

interface TransitionRule {
  from: OrderStatus;
  to: OrderStatus;
  service?: ServiceType;
  condition?: (order: Order) => boolean;
}

const TRANSITIONS: TransitionRule[] = [
  // Laundry transitions
  { from: 'scheduled', to: 'picked_up', service: 'LAUNDRY' },
  { from: 'picked_up', to: 'at_facility', service: 'LAUNDRY' },
  { from: 'at_facility', to: 'quote_sent', service: 'LAUNDRY' },
  { from: 'quote_sent', to: 'awaiting_payment', service: 'LAUNDRY' },
  { from: 'awaiting_payment', to: 'processing', service: 'LAUNDRY',
    condition: (o) => !!o.paid_at },
  { from: 'processing', to: 'out_for_delivery', service: 'LAUNDRY' },
  { from: 'out_for_delivery', to: 'delivered', service: 'LAUNDRY' },
  
  // Cleaning transitions
  { from: 'scheduled', to: 'processing', service: 'CLEANING' },
  { from: 'processing', to: 'cleaned', service: 'CLEANING' },
  
  // Cancellation (any service, pre-terminal)
  { from: 'scheduled', to: 'canceled' },
  { from: 'picked_up', to: 'canceled' },
  { from: 'at_facility', to: 'canceled' },
  { from: 'quote_sent', to: 'canceled' },
  { from: 'awaiting_payment', to: 'canceled' },
];

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  service: ServiceType,
  order?: Order
): boolean {
  const rule = TRANSITIONS.find(
    r => r.from === from && 
         r.to === to && 
         (!r.service || r.service === service)
  );
  
  if (!rule) return false;
  if (rule.condition && order) return rule.condition(order);
  return true;
}

export function getAvailableActions(
  status: OrderStatus,
  service: ServiceType
): Action[] {
  const actions: Action[] = [];
  
  if (status === 'scheduled') {
    actions.push('edit', 'cancel', 'view');
  }
  
  if (status === 'awaiting_payment') {
    actions.push('pay_quote', 'view');
  }
  
  if (['picked_up', 'at_facility', 'processing', 'out_for_delivery'].includes(status)) {
    actions.push('track', 'view');
  }
  
  if (['delivered', 'cleaned'].includes(status)) {
    actions.push('rate', 'rebook', 'view');
  }
  
  return actions;
}
```

**Tests:** `lib/__tests__/orderStateMachine.test.ts`
- 20+ transition validation tests
- Edge case coverage (expired quotes, etc.)
- Service-specific rule validation

**Deliverable:** ✅ State machine with 95%+ test coverage

---

#### Day 5: Enhanced Type Definitions
**File:** `lib/types/order.ts`

```typescript
export interface Quote {
  items: Array<{
    label: string;
    qty?: number;
    amountCents: number;
    notes?: string;
  }>;
  totalCents: number;
  expiresAtISO: string;
  acceptedAtISO?: string;
}

export interface Order {
  id: string;
  service: ServiceType;
  status: OrderStatus;
  customerId: string;
  partnerId?: string;
  phone: string;
  address: Address;
  pickupWindow: TimeWindow;
  deliveryWindow?: TimeWindow;
  createdAt: string;
  updatedAt: string;
  
  // Money
  subtotalCents: number;
  taxCents: number;
  feesCents: number;
  totalCents: number;
  
  // Quote (laundry only)
  quote?: Quote;
  
  // Cleaning specifics
  cleaning?: {
    bedrooms: number;
    bathrooms: number;
    addOns: string[];
    frequency?: 'oneTime' | 'weekly' | 'biweekly' | 'monthly';
    visitsCompleted?: number;
  };
  
  rating?: {
    stars: 1 | 2 | 3 | 4 | 5;
    comment?: string;
    ratedAt: string;
  };
}
```

**Deliverable:** ✅ Complete type system with Zod validation

---

### Week 2: Core API Endpoints

#### Day 1-2: GET /api/orders (Pagination & Filtering)
**File:** `app/api/orders/route.ts`

```typescript
import { z } from 'zod';

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  section: z.enum(['upcoming', 'in_progress', 'completed', 'canceled', 'all']).default('all'),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { cursor, limit, section } = querySchema.parse({
    cursor: searchParams.get('cursor'),
    limit: searchParams.get('limit'),
    section: searchParams.get('section'),
  });
  
  // Status filtering by section
  const statusFilters = {
    upcoming: ['scheduled'],
    in_progress: ['picked_up', 'at_facility', 'quote_sent', 'awaiting_payment', 'processing', 'out_for_delivery'],
    completed: ['delivered', 'cleaned'],
    canceled: ['canceled'],
    all: undefined,
  };
  
  const statuses = statusFilters[section];
  
  // Fetch with cursor pagination
  const query = supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId);
    
  if (statuses) {
    query.in('status', statuses);
  }
  
  if (cursor) {
    query.lt('created_at', cursor);
  }
  
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit + 1);
    
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, -1) : data;
  const nextCursor = hasMore ? items[items.length - 1].created_at : undefined;
  
  return Response.json({ items, nextCursor });
}
```

**Tests:** 8 scenarios
- Pagination works correctly
- Section filtering accurate
- Cursor-based navigation
- Rate limiting enforced

**Deliverable:** ✅ Paginated orders API with filtering

---

#### Day 3: POST /api/orders/:id/cancel
**File:** `app/api/orders/[id]/cancel/route.ts`

```typescript
const cancelSchema = z.object({
  reason: z.enum(['reschedule', 'price', 'moved', 'other']),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { reason } = cancelSchema.parse(body);
  
  const order = await fetchOrder(params.id);
  
  // Validation: only scheduled orders can be canceled
  if (order.status !== 'scheduled') {
    return Response.json(
      { error: { code: 'INVALID_STATE', message: 'Only scheduled orders can be canceled' } },
      { status: 409 }
    );
  }
  
  // Policy enforcement: 24h window check
  const hoursTilPickup = differenceInHours(new Date(order.pickupWindow.startISO), new Date());
  const feeCents = hoursTilPickup < 24 ? 1500 : 0; // $15 fee inside 24h
  
  if (feeCents > 0 && !body.confirmFee) {
    return Response.json(
      { error: { code: 'WINDOW_VIOLATION', feeCents } },
      { status: 409 }
    );
  }
  
  // Update status
  const updated = await updateOrderStatus(params.id, 'canceled', { cancelReason: reason });
  
  // Trigger notifications
  await sendCancellationNotification(order, reason);
  
  return Response.json({ ok: true, order: updated });
}
```

**Tests:** 6 scenarios
- Happy path cancellation
- Window violation returns 409
- Fee confirmation required
- Invalid status rejection
- Idempotency handling

**Deliverable:** ✅ Cancel endpoint with policy enforcement

---

#### Day 4-5: POST /api/orders/:id/quote/pay
**File:** `app/api/orders/[id]/quote/pay/route.ts`

```typescript
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const idempotencyKey = request.headers.get('Idempotency-Key');
  
  // Check for duplicate request
  const existing = await checkIdempotency(idempotencyKey);
  if (existing) return Response.json(existing);
  
  const order = await fetchOrder(params.id);
  
  // Validation
  if (order.status !== 'awaiting_payment') {
    return Response.json(
      { error: { code: 'INVALID_STATE', message: 'Order not awaiting payment' } },
      { status: 409 }
    );
  }
  
  if (!order.quote) {
    return Response.json(
      { error: { code: 'INVALID_STATE', message: 'No quote found' } },
      { status: 400 }
    );
  }
  
  // Check expiry
  if (new Date(order.quote.expiresAtISO) < new Date()) {
    await updateOrderStatus(params.id, 'canceled');
    return Response.json(
      { error: { code: 'QUOTE_EXPIRED', message: 'Quote has expired' } },
      { status: 409 }
    );
  }
  
  // Payment processing (atomic transaction)
  const result = await supabase.rpc('process_quote_payment', {
    order_id: params.id,
    amount_cents: order.quote.totalCents,
    payment_method_id: body.paymentMethodId,
  });
  
  if (!result.success) {
    return Response.json(
      { error: { code: 'PAYMENT_FAILED', message: result.error } },
      { status: 402 }
    );
  }
  
  // Store idempotency result
  await storeIdempotency(idempotencyKey, result);
  
  return Response.json({ ok: true, order: result.order });
}
```

**Tests:** 10 scenarios
- Successful payment
- Quote expiry handling
- Invalid status rejection
- Payment failure recovery
- Idempotency enforcement
- Race condition prevention

**Deliverable:** ✅ Secure payment endpoint with idempotency

---

### Week 3: UI Implementation

#### Day 1-2: Orders List Refactor
**File:** `app/orders/page.tsx`

Key Changes:
- Section-based layout (Upcoming, In Progress, Completed, Canceled)
- Collapsible sections when 10+ total items
- "Show more" loads 3 more items per section
- Sticky CTA on mobile
- Full-width tappable OrderCard components

**Components to Update:**
- `components/orders/OrderCard.tsx` - Add action menu
- `components/orders/Section.tsx` - Collapsible logic
- `components/orders/StickyActions.tsx` - Mobile CTA

**Deliverable:** ✅ Redesigned orders list page

---

#### Day 3-4: Order Detail Enhancement
**File:** `app/orders/[id]/page.tsx`

Key Additions:
- "Pay Quote" CTA for `awaiting_payment` status
- Quote items breakdown display
- Countdown timer for quote expiry
- Feedback banner for completed unrated orders

**Deliverable:** ✅ Enhanced order detail page

---

#### Day 5: Action Modals
**Files:**
- `components/orders/CancelModal.tsx`
- `components/orders/FeedbackModal.tsx`
- `components/orders/PayQuoteModal.tsx`

**Deliverable:** ✅ All action flows functional

---

## 📦 Phase 2: Full Feature Set (Weeks 4-5)

### Week 4: Advanced Features

#### Day 1: Edit Endpoint
`POST /api/orders/:id/edit`
- Window change validation
- Address updates (if not picked up)
- Capacity check

#### Day 2: Feedback Endpoint
`POST /api/orders/:id/feedback`
- Rating submission
- Partner quality tracking

#### Day 3: Analytics Integration
`lib/analytics.ts`
- Event tracking per spec
- Segment/Mixpanel integration

#### Day 4-5: Partner Webhooks
`app/api/webhooks/partner/order-status/route.ts`
`app/api/webhooks/partner/quote/route.ts`
- HMAC signature verification
- Retry logic with exponential backoff

**Deliverable:** ✅ Complete feature set

---

### Week 5: Notifications & Polish

#### Day 1-2: Notification System
- Email templates (React Email)
- SMS via Twilio
- Cron jobs for reminders
- Quote expiry warnings

#### Day 3: Error Handling
- Comprehensive error codes
- User-friendly messages
- Error boundaries

#### Day 4: UI Polish
- Loading states
- Optimistic updates
- Accessibility audit

#### Day 5: E2E Testing
- Playwright tests
- Cross-browser
- Mobile devices

**Deliverable:** ✅ Production-ready features

---

## 📦 Phase 3: Production Hardening (Week 6)

### Day 1: Security
- CORS configuration
- CSRF protection
- Rate limiting
- SQL injection audit
- XSS prevention

### Day 2: Documentation
- OpenAPI spec
- Partner guide
- API reference

### Day 3: Performance
- Database indexes
- Response caching
- Bundle optimization
- Lighthouse audit (90+ target)

### Day 4: Monitoring
- Sentry error tracking
- APM setup
- Alert rules

### Day 5: QA & Deploy
- Full QA checklist
- Load testing
- Staging deployment
- Production rollout plan

**Deliverable:** ✅ Production deployment

---

## 🧪 Testing Strategy

### Unit Tests (Jest)
- `lib/orderStateMachine.test.ts` - 20 tests
- `lib/types/order.test.ts` - 15 tests
- `lib/validation.test.ts` - 12 tests
- Component tests - 40 tests
**Target:** 90%+ coverage

### Integration Tests (Vitest)
- API route tests - 40 scenarios
- Webhook tests - 12 scenarios
**Target:** 85%+ coverage

### E2E Tests (Playwright)
- Laundry lifecycle
- Cleaning lifecycle
- Cancel flow
- Rate flow
- Mobile navigation
**Target:** 100% happy path

---

## 🚀 Git Strategy

### Branches
```
main (production)
├── develop
    ├── feature/order-state-machine
    ├── feature/order-apis
    ├── feature/orders-ui
    ├── feature/webhooks
    ├── feature/notifications
    └── feature/security
```

### Release Plan

**v2.0.0-beta.1** (Week 3)
- Core state machine
- Basic APIs
- Updated UI
- Deploy to staging only

**v2.0.0-beta.2** (Week 5)
- All features
- Analytics
- Notifications
- Production with 10% rollout

**v2.0.0** (Week 6)
- Security hardened
- Monitoring
- 100% rollout

---

## 📊 Success Metrics

### Technical (Week 6)
- ✅ 90%+ test coverage
- ✅ <500ms p95 latency
- ✅ <1% error rate
- ✅ Lighthouse 90+
- ✅ 0 critical vulnerabilities

### Business (4 weeks post-launch)
- 📈 Order completion +10%
- 📈 Quote acceptance +15%
- 📉 Cancellation -20%
- 📈 User satisfaction +0.5 stars
- 📉 Support tickets -30%

---

## 🚨 Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Payment webhook failures | High | Retry logic + DLQ |
| DB migration issues | High | Extensive testing + rollback |
| Partner API downtime | Medium | Circuit breaker |
| Quote expiry edge cases | Medium | Thorough testing |
| Mobile performance | Low | Code splitting |

---

## 📋 Pre-Production Checklist

### Code Quality
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Bundle size < 500kB
- [ ] Lighthouse 90+

### Security
- [ ] Security audit done
- [ ] OWASP Top 10 reviewed
- [ ] Rate limiting configured
- [ ] Webhooks secured

### Documentation
- [ ] API docs complete
- [ ] Migration guide written
- [ ] Partner guide done

### Deployment
- [ ] Staging tested
- [ ] Rollback plan ready
- [ ] Feature flags set
- [ ] Monitoring configured

---

## Next Steps

1. **Review & Approve** this plan
2. **Create GitHub project** board
3. **Kickoff meeting** with team
4. **Start Week 1 Day 1** - Database migration

**Estimated Timeline:** 6 weeks (1 engineer) | 3 weeks (2 engineers)

---

*Last updated: October 5, 2025*
