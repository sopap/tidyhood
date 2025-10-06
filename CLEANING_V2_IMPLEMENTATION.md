# Cleaning Service V2 - Implementation Summary

**Status**: Week 1 Complete - Database & API Infrastructure ✅  
**Feature Flag**: `NEXT_PUBLIC_FLAG_CLEANING_V2=1` (currently OFF)  
**Timeline**: 3-week implementation, 1-week gradual rollout

---

## 🎯 Overview

Refactoring the cleaning service order flow to support granular status tracking, disputes, partner location tracking, and no-shows. Uses a **unified status system** that extends the existing `order_status` enum rather than creating parallel systems.

### Key Design Decisions

1. **Single enum approach**: Extended existing `order_status` enum with cleaning-specific statuses
2. **Service-aware RPC**: One `transition_order_status()` function handles both LAUNDRY and CLEANING
3. **Backward compatible**: Zero impact on existing laundry orders
4. **Feature flagged**: Safe rollout behind `CLEANING_V2` flag

---

## ✅ Completed (Week 1)

### Database Layer

**File**: `supabase/migrations/020_cleaning_status_system.sql`

- Extended `order_status` enum with 7 new statuses:
  - `assigned`, `en_route`, `on_site` (location tracking)
  - `disputed`, `refunded` (dispute resolution)
  - `cleaner_no_show`, `customer_no_show` (no-show tracking)

- Added columns to `orders` table:
  ```sql
  assigned_at, en_route_at, on_site_at       -- Location timestamps
  started_at, completed_at                    -- Work timestamps
  disputed_at, dispute_reason, resolved_at    -- Dispute management
  resolution_type, proof, no_show_type        -- Additional metadata
  ```

- Created `order_events` audit table:
  - Tracks every status transition
  - Records actor_id, actor_role, old/new status, metadata
  - RLS policies for customer/partner visibility

- Created unified RPC function:
  ```sql
  transition_order_status(
    p_order_id uuid,
    p_action text,
    p_actor_id uuid,
    p_actor_role text,
    p_meta jsonb
  )
  ```
  - Service-aware validation (CLEANING vs LAUNDRY)
  - Role-based authorization (customer/partner/admin)
  - Automatic audit trail creation
  - Returns success/error as JSONB

- Helper function:
  ```sql
  get_valid_actions(p_order_id uuid, p_actor_role text) RETURNS text[]
  ```

**Rollback**: `supabase/migrations/020_cleaning_status_system_rollback.sql`

### Type System

**File**: `types/cleaningOrders.ts`

- Discriminated union types:
  ```typescript
  CleaningOrder | LaundryOrder (based on service_type)
  ```

- Status enums:
  ```typescript
  CleaningStatus: 11 statuses
  LaundryStatus: 10 statuses (existing)
  ```

- Action types:
  ```typescript
  CleaningAction: assign, en_route, arrive, start, complete, etc.
  LaundryAction: existing actions preserved
  ```

- UI configuration:
  ```typescript
  CLEANING_STAGES: 3 primary stages with sub-states
  CLEANING_STATUS_CONFIG: labels, colors, icons, descriptions
  ```

- Helper functions:
  - `isCleaningOrder()`, `isLaundryOrder()` - Type guards
  - `canOpenDispute()` - Business logic
  - `isTerminalStatus()`, `isActiveStatus()` - Status checks

### API Layer

**File**: `app/api/orders/[id]/transition/route.ts`

- **POST /api/orders/[id]/transition**
  - Validates session with `requireAuth()`
  - Determines actor role (customer/partner/admin)
  - Calls `transition_order_status()` RPC
  - Triggers side effects (notifications, analytics)
  - Returns updated order state

- **GET /api/orders/[id]/transition**
  - Returns available actions for current user/status
  - Calls `get_valid_actions()` RPC
  - Used by UI to show/hide action buttons

- Side effects framework (stub):
  - Partner assignment notifications
  - Customer en route notifications
  - Rating requests on completion
  - Admin alerts for disputes
  - Analytics event logging

### Feature Flag

**File**: `lib/features.ts`

```typescript
CLEANING_V2: process.env.NEXT_PUBLIC_FLAG_CLEANING_V2 === '1'
```

Currently set to OFF for safe development.

---

## 🚧 In Progress / To Do

### Week 1 Remaining

- [ ] Refactor `lib/orderStateMachine.ts` to support cleaning statuses
- [ ] Create service-aware validators
- [ ] Write unit tests for state transitions
- [ ] Write API integration tests

### Week 2: UI Components

- [ ] **CleaningOrderView** component
  - Replaces legacy order detail view for cleaning orders
  - Feature flag check: renders if `CLEANING_V2` && `service_type === 'CLEANING'`

- [ ] **CleaningTimeline** component
  - 3 primary stages: Scheduled → In Progress → Completed
  - Sub-states displayed as hints (assigned, en route, on site)
  - Mobile: horizontal scroll, desktop: vertical
  - Timestamp display for each completed stage

- [ ] **CleaningActions** component
  - Context-aware action buttons based on status + role
  - Calls GET /api/orders/[id]/transition for available actions
  - Large tap targets for mobile (min 44px)
  - Confirmation modals for destructive actions

- [ ] **DisputeModal** component
  - Text area for dispute reason
  - File upload for supporting evidence
  - Calls POST /api/orders/[id]/transition with `open_dispute` action
  - Shows estimated resolution time (24 hours)

- [ ] **NoShowModal** component (partner-facing)
  - Confirmation for marking customer no-show
  - Text area for additional notes
  - Warning about impact on customer relationship

- [ ] **Sticky Action Bar** (mobile)
  - Fixed bottom bar with primary action
  - Context changes based on status (Cancel → Track → Rate)

### Week 2: Partner Portal

- [ ] Update `components/partner/StatusUpdater.tsx`
  - Add cleaning-specific actions dropdown
  - Handle `en_route`, `arrive`, `start`, `complete`

- [ ] Update `components/partner/OrderCard.tsx`
  - Show cleaning timeline for cleaning orders
  - Display current location status (en route, on site, etc.)

- [ ] Test partner flow:
  - Assign order → En Route → Arrive → Start → Complete
  - Test no-show marking

### Week 3: Testing & Deployment

- [ ] **Unit Tests**
  - `lib/__tests__/cleaningStateMachine.test.ts`
  - Test all valid transitions
  - Test all invalid transitions
  - Test role-based authorization

- [ ] **API Integration Tests**
  - Test transition endpoint with various roles
  - Test error handling (invalid transitions, unauthorized)
  - Test idempotency

- [ ] **E2E Tests (Playwright)**
  - Customer books cleaning → Admin assigns → Partner completes
  - Customer opens dispute → Admin resolves with refund
  - Partner marks customer no-show

- [ ] **Analytics Instrumentation**
  - Track order_assigned, order_en_route, order_started, etc.
  - Calculate SLA metrics (time to assign, on-time arrival)
  - Dashboard for dispute rate, no-show rate

- [ ] **Staging Deployment**
  - Run migration 020 in staging
  - Enable feature flag for internal testing
  - QA full customer + partner + admin flows

- [ ] **Production Deploy (flag OFF)**
  - Run migration 020 in production
  - Monitor for any issues
  - Keep flag OFF until Week 4

### Week 4: Gradual Rollout

- [ ] Day 1: Enable for 1% of cleaning orders
- [ ] Day 2: Monitor metrics, increase to 10%
- [ ] Day 3: If no issues, increase to 50%
- [ ] Day 4: If stable, increase to 100%
- [ ] Day 5: Remove legacy code paths

---

## 📊 Status Transition Matrix

### Cleaning Orders

| From | To | Action | Roles | Notes |
|------|----|----|-------|-------|
| `pending` | `assigned` | `assign` | admin | Partner assignment |
| `pending` | `canceled` | `cancel` | customer, admin | Pre-work cancellation |
| `assigned` | `en_route` | `en_route` | partner | Partner en route |
| `assigned` | `canceled` | `cancel` | customer, admin | Cancel after assignment |
| `en_route` | `on_site` | `arrive` | partner | Partner arrived |
| `en_route` | `cleaner_no_show` | `mark_cleaner_no_show` | customer, admin | Partner didn't arrive |
| `en_route` | `customer_no_show` | `mark_customer_no_show` | partner, admin | Customer not available |
| `on_site` | `in_progress` | `start` | partner | Work started |
| `in_progress` | `completed` | `complete` | partner, admin | Work finished |
| `in_progress` | `disputed` | `open_dispute` | customer | Quality dispute |
| `completed` | `disputed` | `open_dispute` | customer | Dispute within 7 days |
| `disputed` | `completed` | `resolve_dispute_complete` | admin | Dispute resolved, no refund |
| `disputed` | `refunded` | `resolve_dispute_refund` | admin | Dispute resolved, refunded |

### Laundry Orders (Unchanged)

| From | To | Action | Notes |
|------|----|----|-------|
| `pending` | `pending_pickup` | `mark_pending_pickup` | Scheduled for pickup |
| `pending_pickup` | `at_facility` | `mark_at_facility` | Items received |
| `at_facility` | `awaiting_payment` | `send_quote` | Quote sent |
| `awaiting_payment` | `paid_processing` | `mark_paid` | Payment received |
| `paid_processing` | `in_progress` | `start_processing` | Processing started |
| `in_progress` | `out_for_delivery` | `mark_out_for_delivery` | Out for delivery |
| `out_for_delivery` | `delivered` | `mark_delivered` | Delivered to customer |

---

## 🔍 Testing Guide

### Manual Testing (Staging)

**Customer Flow**:
1. Book cleaning order (triggers pending status)
2. Wait for admin to assign partner
3. Receive notification when partner en route
4. Partner arrives and starts work
5. Receive notification when completed
6. Open dispute if needed

**Partner Flow**:
1. Receive assignment notification
2. Mark en route when leaving
3. Mark arrival at location
4. Start cleaning work
5. Complete and upload proof photos
6. Handle customer no-show if needed

**Admin Flow**:
1. Assign orders to partners
2. Monitor active orders
3. Handle disputes
4. Process refunds if needed

### Testing Checklist

- [ ] All valid transitions work
- [ ] Invalid transitions are blocked with clear error messages
- [ ] Role enforcement works (customer can't mark en_route, etc.)
- [ ] Audit trail is created for every transition
- [ ] Notifications are sent at key milestones
- [ ] Dispute window enforced (7 days after completion)
- [ ] No-show marking requires confirmation
- [ ] Mobile UI is fully functional (≤375px width)
- [ ] Feature flag toggle works (ON = new UI, OFF = legacy)

---

## 🚀 Deployment Steps

### Pre-Deployment

1. Code review of all PRs
2. Run full test suite (unit + integration + e2e)
3. Performance testing (RPC function execution time)
4. Security audit (RLS policies, role checks)

### Staging Deployment

```bash
# 1. Run migration
cd supabase
npx supabase db push

# 2. Verify migration
psql $DATABASE_URL -c "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'order_status'::regtype;"

# 3. Test RPC function
psql $DATABASE_URL -c "SELECT transition_order_status('test-order-id', 'assign', 'admin-user-id', 'admin', '{"partner_id": "partner-id"}'::jsonb);"

# 4. Enable feature flag
# Set NEXT_PUBLIC_FLAG_CLEANING_V2=1 in Vercel staging
```

### Production Deployment

```bash
# 1. Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. Run migration (during low traffic)
npx supabase db push

# 3. Verify zero impact on laundry orders
psql $DATABASE_URL -c "SELECT COUNT(*) FROM orders WHERE service_type = 'LAUNDRY' AND status IN ('pending', 'pending_pickup');"

# 4. Deploy code (flag OFF)
git push production main

# 5. Monitor logs and metrics
# Watch for RPC errors, slow queries, etc.
```

### Rollback Plan

If issues are detected:

```bash
# 1. Disable feature flag immediately
# Set NEXT_PUBLIC_FLAG_CLEANING_V2=0 in Vercel

# 2. If database issues, run rollback migration
psql $DATABASE_URL < supabase/migrations/020_cleaning_status_system_rollback.sql

# 3. Verify system stability
# Check error rates, latency, customer complaints
```

---

## 📈 Success Metrics

### Technical Metrics

- [ ] Zero laundry order regressions
- [ ] <100ms RPC execution time (p95)
- [ ] <1% transition API error rate
- [ ] 100% uptime during rollout

### Business Metrics

- [ ] <5% dispute rate on cleaning orders
- [ ] >95% on-time arrival (within 15 min window)
- [ ] >90% customer satisfaction on new UI
- [ ] <10% increase in support tickets

### SLA Targets

- Time to assign: <30 minutes
- On-time arrival: ±15 minutes
- Dispute resolution: <24 hours
- Refund processing: <48 hours

---

## 🔧 Configuration

### Environment Variables

```bash
# Production (OFF initially)
NEXT_PUBLIC_FLAG_CLEANING_V2=0

# Staging (ON for testing)
NEXT_PUBLIC_FLAG_CLEANING_V2=1
```

### Database

```sql
-- Check migration status
SELECT * FROM supabase_migrations.schema_migrations 
WHERE version = '020';

-- View order events
SELECT * FROM order_events 
WHERE order_id = 'xxx' 
ORDER BY created_at DESC;

-- Check active cleaning orders
SELECT id, status, assigned_at, en_route_at, on_site_at, started_at 
FROM orders 
WHERE service_type = 'CLEANING' AND status IN ('assigned', 'en_route', 'on_site', 'in_progress');
```

---

## 📚 Documentation

### For Developers

- This file: Implementation status and guide
- `types/cleaningOrders.ts`: Type definitions with JSDoc comments
- `supabase/migrations/020_*.sql`: Database schema with comments
- `app/api/orders/[id]/transition/route.ts`: API documentation in comments

### For Partners

- TODO: Partner training guide on new status updates
- TODO: FAQ on what each status means
- TODO: Best practices for on-time arrival

### For Admins

- TODO: Admin playbook for dispute resolution
- TODO: Dashboard guide for monitoring SLAs
- TODO: Escalation procedures for complex cases

---

## 🐛 Known Issues / Limitations

1. **Enum values can't be removed**: If rollback is needed, enum values remain in DB but are marked deprecated
2. **No auto-assignment yet**: Admins must manually assign orders (AUTO_ASSIGN feature flag not yet implemented)
3. **Proof upload not implemented**: UI placeholder exists but S3 integration pending
4. **No SMS notifications**: Side effects are logged but not executed
5. **Analytics not integrated**: PostHog/Amplitude integration pending

---

## 🎉 Next Steps

Once Week 1 is complete:

1. **Code review this implementation**
2. **Run database migration in staging**
3. **Begin Week 2 UI components**
4. **Schedule partner training session**
5. **Prepare customer communication**

---

**Last Updated**: 2025-01-05  
**Implementation Lead**: AI Assistant  
**Status**: Week 1 Complete ✅
