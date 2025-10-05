# Admin & Partner Dashboard Implementation Plan

**Date:** January 5, 2025  
**Scope:** MVP Implementation (P0 Features)  
**Timeline:** Immediate delivery

---

## Implementation Strategy

Given the 12-week scope in the PRD, this implementation will deliver a **working MVP** of the most critical features that unblocks operations immediately.

### What We'll Build Today

**Phase 1: Database Foundation (30 min)**
- Migration 011: notifications, audit_logs, admin_notes tables
- Update .env.example with SEED_ADMIN_EMAIL
- Seed admin user on signup

**Phase 2: Admin Dashboard Core (2-3 hours)**
- `/admin` - Dashboard home with metrics
- `/admin/orders` - Order list with filters
- `/admin/orders/[id]` - Order detail with admin actions
- `/admin/partners` - Partner list
- Admin API endpoints

**Phase 3: Partner Portal Core (2-3 hours)**
- `/partner` - Dashboard home
- `/partner/orders` - Order list
- `/partner/orders/[id]/quote` - Quote submission
- Partner API endpoints

**Phase 4: Infrastructure (1 hour)**
- Notifications service (basic)
- Audit logging middleware
- Metrics calculation helpers

**Phase 5: Testing & Validation (1 hour)**
- Test admin flows
- Test partner flows
- Verify database integrity
- Check API responses

**Phase 6: Documentation & Git Push (30 min)**
- Update README
- Create implementation summary
- Commit and push to GitHub

---

## What's Deferred to Future Iterations

**P1 Features (Week 2-3):**
- Advanced metrics dashboards with charts
- Template-based notifications
- Partner profile editing
- Settings page

**P2 Features (Week 4+):**
- Advanced analytics
- Bulk actions
- CSV exports
- Photo galleries
- Mobile optimizations

---

## Success Criteria

- [ ] Admin can log in and see dashboard
- [ ] Admin can view, filter, and manage all orders
- [ ] Admin can force status transitions with audit trail
- [ ] Admin can view and manage partners
- [ ] Partner can log in and see assigned orders
- [ ] Partner can submit laundry quotes
- [ ] All actions are logged to audit_logs
- [ ] Basic notifications work
- [ ] Code is committed and pushed to GitHub

---

## Technical Decisions

1. **UI Framework:** Use existing Tailwind + ShadCN patterns
2. **Auth:** Leverage existing Supabase auth + RLS
3. **State:** Client-side React state (no Redux needed for MVP)
4. **API:** Next.js API routes (already established pattern)
5. **Database:** Supabase PostgreSQL (existing setup)
6. **Deployment:** Vercel (existing setup)

---

## File Structure

```
app/
├── admin/
│   ├── layout.tsx          # Admin layout with nav
│   ├── page.tsx            # Dashboard home
│   ├── orders/
│   │   ├── page.tsx        # Order list
│   │   └── [id]/
│   │       └── page.tsx    # Order detail
│   └── partners/
│       └── page.tsx        # Partner list
├── partner/
│   ├── layout.tsx          # Partner layout
│   ├── page.tsx            # Partner dashboard
│   └── orders/
│       ├── page.tsx        # Order list
│       └── [id]/
│           └── quote/
│               └── page.tsx # Quote submission
└── api/
    ├── admin/
    │   ├── metrics/
    │   │   └── route.ts    # Dashboard metrics
    │   ├── orders/
    │   │   └── route.ts    # Order management
    │   └── partners/
    │       └── route.ts    # Partner management
    └── partner/
        ├── metrics/
        │   └── route.ts
        └── orders/
            └── [id]/
                └── quote/
                    └── route.ts

components/
├── admin/
│   ├── MetricCard.tsx
│   ├── OrderTable.tsx
│   ├── OrderActions.tsx
│   └── PartnerTable.tsx
└── partner/
    ├── DashboardStats.tsx
    ├── OrderList.tsx
    └── QuoteForm.tsx

lib/
├── notifications.ts        # Notification service
├── audit.ts               # Audit logging
└── metrics.ts             # Metrics calculation

supabase/
└── migrations/
    └── 011_admin_partner_infrastructure.sql
```

---

**Let's build! 🚀**
