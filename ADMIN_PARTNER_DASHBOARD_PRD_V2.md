# TidyHood Admin & Partner Dashboard PRD v2.0
## Improved & Aligned with Current Implementation

**Version:** 2.0  
**Date:** January 5, 2025  
**Status:** Ready for Implementation  
**Implementation Score vs v1.0:** 37/100 → Target: 80/100

---

## Document Change Log

**v2.0 Changes from v1.0:**
- ✅ Aligned with existing customer MVP architecture
- ✅ Removed redundant/conflicting requirements  
- ✅ Prioritized based on operational necessity (P0/P1/P2)
- ✅ Added clear acceptance criteria for each feature
- ✅ Defined realistic 12-week implementation phases
- ✅ Specified technical stack compatibility
- ✅ Included database migration strategy
- ✅ Simplified role system (3 roles vs 6)
- ✅ Focused on operational MVP vs feature-complete platform

---

## 1. Executive Summary

TidyHood connects customers with vetted laundry and home cleaning partners in Harlem, NYC. The **customer booking MVP is complete** (booking, payment, order tracking). This PRD defines the **operational layer** needed to manage partners, orders, and business operations at scale.

### Current State Assessment

**✅ Implemented (Customer MVP):**
- Customer booking flow (laundry + cleaning)
- Payment integration (Stripe)
- Order state machine with 10 statuses
- Database foundation (16 tables, 10 migrations)
- RLS security policies
- Basic partner APIs (list orders, update status, submit quote)

**❌ Missing (Operational Layer):**
- Admin dashboard (0%)
- Partner portal UI (0%)
- Support console (0%)
- Metrics/KPIs dashboard (5%)
- Notification system (20%)
- Audit logging (30%)

### Scope

**This PRD Covers:**
1. Admin Dashboard - Platform operations and management
2. Partner Portal - Partner self-service interface
3. Supporting Infrastructure - APIs, notifications, metrics, audit logs

**Out of Scope (Future Releases):**
- AI-powered routing/optimization
- Mobile native apps (iOS/Android)
- Multi-region expansion
- Advanced analytics/BI tools
- Customer chat support
- Loyalty/referral programs

---

## 2. Objectives & Success Metrics

### Primary Objectives

**P0 (Launch Blockers - Week 1-4):**
1. Admins can manually manage all orders end-to-end
2. Partners can view assigned orders and update status
3. Basic notification system alerts customers of order changes
4. Platform is operationally manageable at 50 orders/day

**P1 (High Priority - Week 5-8):**
1. Dashboard shows key metrics (GMV, order count, SLA adherence)
2. Partners can submit laundry quotes via UI
3. Automated quote expiration and reminders
4. Admin can view audit logs for compliance

**P2 (Nice to Have - Week 9-12):**
1. Advanced partner scorecards with penalties
2. Automated capacity rebalancing suggestions
3. Template-based communications editor
4. Detailed partner payout reports

### Success Metrics

**Operational Efficiency:**
- Admin time per order < 5 minutes
- Partner quote turnaround < 2 hours
- Order assignment time < 1 minute
- Support ticket resolution < 24 hours

**Business Health:**
- Daily Active Partners (DAP) > 5
- Partner SLA adherence > 95%
- Order completion rate > 98%
- Customer satisfaction (CSAT) > 4.5/5
- Platform uptime > 99.5%

**Financial:**
- GMV growth > 20% MoM
- Partner payout accuracy > 99.9%
- Refund rate < 2%

---

## 3. User Roles & Permissions

### Role Hierarchy (Simplified)

| Role | Access Level | Permissions | Count |
|------|-------------|-------------|-------|
| **admin** | Full platform | Orders, partners, config, metrics, refunds | 2-5 |
| **partner** | Assigned orders | View orders, update status, submit quotes, earnings | 10-20 |
| **user** | Own orders | Book, pay, track, cancel *(already implemented)* | Unlimited |

**Changes from v1.0:**
- ❌ **Removed:** `superadmin`, `ops`, `partner_owner`, `partner_staff` (over-engineered for MVP)
- ✅ **Simplified:** 3 core roles sufficient for 100 orders/day
- ✅ **Future:** Add role granularity when team > 5 admins or partners > 50

### Admin Bootstrap

**Environment Variable:**
```env
SEED_ADMIN_EMAIL=admin@tidyhood.com
```

**Logic:**
- On signup, if email matches `SEED_ADMIN_EMAIL` → auto-set `role = 'admin'`
- Subsequent admins created by existing admin via UI
- No hardcoded credentials in database

**Implementation:**
```typescript
// app/api/auth/signup/route.ts
if (email === process.env.SEED_ADMIN_EMAIL) {
  await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);
}
```

---

## 4. Core Modules (Prioritized)

---

## 4.1 Admin Dashboard [P0] 🔴

**Priority:** CRITICAL - Launch Blocker  
**Timeline:** Week 1-4  
**Effort:** 4 weeks (1 engineer)

### Overview

Central operations hub for managing the platform. Admins need visibility into all orders, ability to intervene when needed, and tools to manage partners.

---

### 4.1.1 Dashboard Home `/admin`

**Purpose:** At-a-glance platform health and urgent actions

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ TidyHood Admin                        [Profile ▼]   │
├─────────────────────────────────────────────────────┤
│ Today's Overview                     Jan 5, 2025    │
│                                                      │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌──────┐│
│ │  Orders   │ │    GMV    │ │  SLA      │ │Active││
│ │    12     │ │   $450    │ │   98%     │ │  3   ││
│ │  +2 vs yd │ │ +$50 vs yd│ │  -1% vs yd│ │ ptrs ││
│ └───────────┘ └───────────┘ └───────────┘ └──────┘│
│                                                      │
│ 🔴 Urgent Actions (5)                               │
│ • 2 orders awaiting quote (>2h)                     │
│ • 1 SLA breach imminent (#1234)                     │
│ • 2 new partners pending approval                   │
│ • 1 refund request pending                          │
│                                                      │
│ 🔍 Quick Order Search                               │
│ [Search by ID, customer, phone...]                  │
│                                                      │
│ 📊 Recent Orders (10)                               │
│ [Order List Component - see 4.1.2]                 │
└─────────────────────────────────────────────────────┘
```

**Components:**

1. **Metric Cards** (4 KPIs)
   - Current value
   - Comparison to yesterday
   - Color coding (green/yellow/red)
   - Click → detailed view

2. **Urgent Actions Alert**
   - Auto-refreshes every 30s
   - Click → jump to order/partner
   - Dismissible (but re-appears if still urgent)

3. **Quick Search**
   - Search: order ID, customer name, phone
   - Autocomplete with recent results
   - Enter → jump to order detail

4. **Recent Orders Table**
   - Last 10 orders (any status)
   - Columns: ID, status, customer, partner, time, amount
   - Quick actions: view, assign, cancel

**API Endpoints:**
```typescript
GET /api/admin/metrics/today
Response: {
  orders: { today: 12, yesterday: 10 },
  gmv: { today: 450, yesterday: 400 },
  sla: { today: 0.98, yesterday: 0.99 },
  active_partners: 3
}

GET /api/admin/alerts
Response: {
  alerts: [
    {
      type: 'quote_pending',
      order_id: '1234',
      elapsed_hours: 2.5,
      severity: 'high'
    },
    // ...
  ]
}

GET /api/admin/orders/recent?limit=10
Response: { orders: [...] }

GET /api/admin/search?q=john
Response: {
  orders: [...],
  customers: [...],
  partners: [...]
}
```

**Acceptance Criteria:**
- [ ] Admin sees 4 key metrics on page load
- [ ] Alerts update automatically every 30s
- [ ] Search returns results in < 500ms
- [ ] Page loads in < 2 seconds
- [ ] Mobile responsive (tablet+)

---

### 4.1.2 Order Management `/admin/orders`

**Purpose:** View, filter, and manage all orders

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Orders                                    [+ Create] │
├─────────────────────────────────────────────────────┤
│ Filters:                                             │
│ [Status ▼] [Service ▼] [Partner ▼] [Date Range ▼]  │
│ [Search: ID, customer, phone...]                     │
│                                                      │
│ Bulk Actions: [☐ Select All] [Assign] [Cancel]     │
│                                                      │
│ 🔴 #1234 - Quote pending (2h 15m)                  │
│    Laundry • John Doe • +1(555)123-4567            │
│    Harlem Fresh • Pickup: 10:00 AM                 │
│    25 lbs estimated • $42.50 pending approval      │
│    [View] [Assign] [Cancel] [☐]                    │
│                                                      │
│ 🟡 #1233 - In progress                             │
│    Cleaning • Jane Smith • +1(555)234-5678         │
│    Uptown Sparkle • Started: 2:00 PM               │
│    2BR standard clean • $149.00 paid               │
│    [View] [Track] [☐]                              │
│                                                      │
│ 🟢 #1232 - Delivered                               │
│    Laundry • Bob Johnson • +1(555)345-6789         │
│    Lenox Wash • Completed: 4:00 PM                 │
│    18 lbs • $31.50 paid                            │
│    [View] [Refund] [☐]                             │
│                                                      │
│ Showing 1-25 of 234 orders                          │
│ [< Previous] [1] [2] [3] ... [10] [Next >]         │
│ [Export CSV]                                         │
└─────────────────────────────────────────────────────┘
```

**Features:**

1. **Advanced Filters**
   - Status: Any, scheduled, picked_up, quote_sent, etc.
   - Service: Any, LAUNDRY, CLEANING
   - Partner: Any, or select from list
   - Date Range: Today, Yesterday, Last 7 days, Last 30 days, Custom
   - Combines with AND logic

2. **Search**
   - Order ID (exact or partial)
   - Customer name (fuzzy match)
   - Phone number (exact)
   - Results highlight matching terms

3. **Bulk Actions**
   - Select multiple orders (checkbox)
   - Assign to partner (if unassigned)
   - Cancel with reason
   - Export selected to CSV

4. **Status Color Coding**
   - 🔴 Red: Urgent (quote_pending >2h, SLA breach)
   - 🟡 Yellow: Active (picked_up, processing, out_for_delivery)
   - 🟢 Green: Complete (delivered, cleaned)
   - ⚫ Gray: Canceled

5. **Quick Actions Per Row**
   - View: Go to detail page
   - Assign: Assign to partner (modal)
   - Cancel: Cancel with reason (modal)
   - Track: View live status
   - Refund: Process refund (modal)

6. **Pagination**
   - 25 orders per page (configurable)
   - Fast navigation (1, 2, 3, ..., last)
   - Keyboard shortcuts (arrow keys)

7. **CSV Export**
   - Filtered results or all
   - Columns: ID, status, service, customer, phone, partner, slot, amount, created

**API Endpoints:**
```typescript
GET /api/admin/orders
Query params:
  - status: string
  - service: 'LAUNDRY' | 'CLEANING'
  - partner_id: uuid
  - date_from: ISO date
  - date_to: ISO date
  - search: string
  - page: number
  - limit: number (default 25)

Response: {
  orders: Order[],
  total: number,
  page: number,
  pages: number
}

POST /api/admin/orders/bulk-assign
Body: {
  order_ids: string[],
  partner_id: string
}

POST /api/admin/orders/bulk-cancel
Body: {
  order_ids: string[],
  reason: string
}

GET /api/admin/orders/export
Returns: CSV file download
```

**Acceptance Criteria:**
- [ ] Can filter 1000+ orders in < 1 second
- [ ] Search returns results as you type (debounced 300ms)
- [ ] Bulk actions work on 50+ orders without timeout
- [ ] CSV export completes in < 10 seconds
- [ ] Real-time updates (orders appear without refresh)
- [ ] Mobile responsive (shows condensed view on phone)

---

### 4.1.3 Order Detail `/admin/orders/:id`

**Purpose:** Complete order information and admin actions

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ ← Back to Orders          Order #1234               │
├─────────────────────────────────────────────────────┤
│ Status: 🔴 Quote Pending (2h 15m)                   │
│                                                      │
│ Admin Actions:                                       │
│ [Force Status ▼] [Reassign Partner] [Cancel]       │
│ [Process Refund] [Add Credit] [Send SMS]           │
│                                                      │
│ ──────────────────────────────────────────────────  │
│ 📅 Timeline                                         │
│ • Jan 5, 10:00 AM - Order created (John Doe)       │
│ • Jan 5, 10:01 AM - Assigned to Harlem Fresh       │
│ • Jan 5, 10:15 AM - Picked up (Partner)            │
│ • Jan 5, 11:30 AM - At facility (Partner)          │
│ • Jan 5, 12:00 PM - Weighed: 25 lbs (Partner)      │
│ • Jan 5, 12:45 PM - Quote sent: $42.50 (Partner)   │
│   ↳ Expires: Jan 6, 12:45 AM (11h 45m remaining)   │
│                                                      │
│ ──────────────────────────────────────────────────  │
│ 👤 Customer Information                             │
│ Name: John Doe                                      │
│ Phone: +1 (555) 123-4567 [Call] [SMS]             │
│ Email: john@example.com [Email]                     │
│ Address: 123 Malcolm X Blvd, Apt 4B                │
│          New York, NY 10027                         │
│ Buzzer: 4B                                          │
│ Notes: Please call when arrived                     │
│                                                      │
│ ──────────────────────────────────────────────────  │
│ 🏢 Partner Information                              │
│ Name: Harlem Fresh Laundromat                       │
│ Phone: +1 (555) 234-5678 [Call] [SMS]             │
│ Address: 2280 Frederick Douglass Blvd              │
│ [View Partner Profile]                              │
│                                                      │
│ ──────────────────────────────────────────────────  │
│ 📦 Order Details                                    │
│ Service: Laundry - Wash & Fold                      │
│ Pickup: Jan 5, 2025 @ 10:00 AM - 12:00 PM         │
│ Delivery: Jan 7, 2025 @ 10:00 AM - 12:00 PM       │
│                                                      │
│ Weight: 25 lbs (actual)                             │
│ Estimated: 25 lbs                                   │
│                                                      │
│ Add-ons:                                            │
│ • Rush 24hr: +$10.00                                │
│ • Extra softener: +$3.00                            │
│                                                      │
│ ──────────────────────────────────────────────────  │
│ 💰 Pricing Breakdown                                │
│ Base (25 lbs × $1.75):        $43.75               │
│ Rush 24hr:                    $10.00               │
│ Extra softener:               $ 3.00               │
│ Delivery:                     $ 5.99               │
│ ──────────────────────────────────────             │
│ Subtotal:                     $62.74               │
│ Tax (exempt):                 $ 0.00               │
│ ──────────────────────────────────────             │
│ Total:                        $62.74               │
│                                                      │
│ Payment: PENDING (awaiting customer approval)       │
│ Partner Quote: $42.50                               │
│ Quoted at: Jan 5, 12:45 PM                         │
│                                                      │
│ ──────────────────────────────────────────────────  │
│ 📸 Photos (3)                                       │
│ [Intake photo] [Weight scale] [After cleaning]     │
│ [View Gallery]                                      │
│                                                      │
│ ──────────────────────────────────────────────────  │
│ 📝 Admin Notes (Internal)                          │
│ • Jan 5, 1:00 PM - Customer called, price OK       │
│ • Jan 5, 1:15 PM - Reminded partner to follow up   │
│                                                      │
│ [Add Note...]                                       │
│ ┌─────────────────────────────────────────────┐    │
│ │ Customer called to confirm quote is fine... │    │
│ └─────────────────────────────────────────────┘    │
│ [Save Note]                                         │
└─────────────────────────────────────────────────────┘
```

**Admin Actions Explained:**

1. **Force Status**
   - Override state machine validation
   - Select any status from dropdown
   - Requires reason (text input)
   - Logs to audit_logs with admin ID
   - Optional: Send notification to customer/partner

2. **Reassign Partner**
   - Select new partner from dropdown (filtered by service type)
   - Validates capacity before assigning
   - Notifies old and new partner
   - Updates capacity_calendar

3. **Cancel Order**
   - Select cancellation reason (dropdown + custom)
   - Reason options: Customer request, Partner unavailable, Weather, Other
   - Auto-refund if paid
   - Sends cancellation notification

4. **Process Refund**
   - Full or partial refund
   - Enter amount (validates against order total)
   - Enter reason (required)
   - Processes via Stripe
   - Updates order status to 'refunded' (if full)

5. **Add Credit**
   - Add credit to customer account
   - Enter amount and reason
   - Can be used on next order
   - Logs to customer profile

6. **Send SMS**
   - Quick message to customer or partner
   - Template options or custom text
   - Character limit: 160
   - Logs to notifications table

**API Endpoints:**
```typescript
GET /api/admin/orders/:id
Response: {
  order: Order,
  events: OrderEvent[],
  customer: Profile,
  partner: Partner,
  photos: string[],
  notes: AdminNote[]
}

POST /api/admin/orders/:id/force-status
Body: {
  status: OrderStatus,
  reason: string,
  notify: boolean
}

POST /api/admin/orders/:id/reassign
Body: {
  partner_id: string,
  reason?: string
}

POST /api/admin/orders/:id/cancel
Body: {
  reason: string,
  refund: boolean
}

POST /api/admin/orders/:id/refund
Body: {
  amount_cents: number,
  reason: string
}

POST /api/admin/orders/:id/credit
Body: {
  amount_cents: number,
  reason: string
}

POST /api/admin/orders/:id/sms
Body: {
  recipient: 'customer' | 'partner',
  message: string
}

POST /api/admin/orders/:id/notes
Body: {
  note: string
}
```

**Acceptance Criteria:**
- [ ] All order data visible without scrolling excessively
- [ ] Timeline shows actor for each event
- [ ] Force status prompts for confirmation
- [ ] Refund calculates Stripe fee automatically
- [ ] Photos open in lightbox/modal
- [ ] Notes save with auto-save (5s debounce)
- [ ] Actions complete in < 2 seconds
- [ ] Error messages are clear and actionable

---

### 4.1.4 Partner Management `/admin/partners`

**Purpose:** Manage partner profiles, verification, and performance

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Partners                               [+ Add Partner]│
├─────────────────────────────────────────────────────┤
│ [Active (3)] [Pending (2)] [Inactive (1)]           │
│                                                      │
│ ✅ Harlem Fresh Laundromat            [Edit] [View] │
│    Laundry • 2280 Frederick Douglass Blvd          │
│    Contact: +1 (555) 234-5678                       │
│    Rating: ⭐ 4.8/5 (45 orders)                     │
│    On-time: 96% • Payout: 65%                       │
│    Last order: 2 hours ago                          │
│    [Deactivate]                                     │
│                                                      │
│ ✅ Lenox Wash & Fold                  [Edit] [View] │
│    Laundry • 275 Lenox Ave                          │
│    Contact: +1 (555) 345-6789                       │
│    Rating: ⭐ 4.6/5 (28 orders)                     │
│    On-time: 94% • Payout: 60%                       │
│    Last order: 5 hours ago                          │
│    [Deactivate]                                     │
│                                                      │
│ ✅ Uptown Sparkle Cleaning            [Edit] [View] │
│    Cleaning • 2110 Adam Clayton Powell Jr Blvd     │
│    Contact: +1 (555) 456-7890                       │
│    Rating: ⭐ 4.9/5 (23 orders)                     │
│    On-time: 100% • Payout: 70%                      │
│    Last order: 1 day ago                            │
│    [Deactivate]                                     │
│                                                      │
│ 🟡 Pending Approval (2)                             │
│ ──────────────────────────────────────────────────  │
│ East Side Laundry                                   │
│ Submitted: 2 days ago                               │
│ COI: ✅ Verified • Bank: ⏳ Pending                │
│ [Review] [Approve] [Reject]                         │
│                                                      │
│ Quick Clean Services                                │
│ Submitted: 5 days ago                               │
│ COI: ❌ Missing • Bank: ❌ Missing                 │
│ [Review] [Request Documents] [Reject]               │
└─────────────────────────────────────────────────────┘
```

**Add/Edit Partner Form:**
```
┌─────────────────────────────────────────────────────┐
│ Add Partner                              [Cancel] [Save]│
├─────────────────────────────────────────────────────┤
│ Basic Information                                    │
│ Business Name: [Harlem Fresh Laundromat______]     │
│ Service Type:  [Laundry ▼]                         │
│ Address:       [2280 Frederick Douglass Blvd_]     │
│ City:          [New York___]  State: [NY▼]         │
│ ZIP:           [10027__]                            │
│                                                      │
│ Contact Information                                  │
│ Email:         [contact@harlemfresh.com____]       │
│                (Used for partner portal login)      │
│ Phone:         [+1 (555) 234-5678_________]        │
│                                                      │
│ Service Configuration                                │
│ Payout %:      [__65___] % (Default: 65%)          │
│ Max Orders/Slot: [__8___] (Laundry only)           │
│ Max Minutes/Slot: [__480__] (Cleaning only)        │
│                                                      │
│ Service Areas                                        │
│ ZIP Codes:     [10026] [10027] [10030] [+ Add]     │
│                                                      │
│ Documents                                            │
│ COI (PDF):     [Upload Certificate of Insurance]    │
│                Valid until: [12/31/2025________]    │
│                                                      │
│ Bank Account (Stripe Connect)                        │
│ Status:        ⏳ Not connected                     │
│                [Connect Bank Account]               │
│                                                      │
│ [Cancel] [Save & Activate]                          │
└─────────────────────────────────────────────────────┘
```

**Partner Detail View `/admin/partners/:id`:**
```
┌─────────────────────────────────────────────────────┐
│ ← Back              Harlem Fresh Laundromat         │
├─────────────────────────────────────────────────────┤
│ Status: ✅ Active          [Edit] [Deactivate]     │
│                                                      │
│ 📊 Performance Scorecard                            │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│ │ Rating   │ │ On-Time  │ │ Avg Quote│ │ Orders  ││
│ │ 4.8/5    │ │   96%    │ │ 1.2 hrs  │ │   45    ││
│ └──────────┘ └──────────┘ └──────────┘ └─────────┘│
│                                                      │
│ 📈 Order History (Last 30 days)                     │
│ [Chart: Daily orders completed]                     │
│                                                      │
│ Recent Orders (10)                                   │
│ #1234 - Delivered - $42.50 - Jan 5                 │
│ #1233 - In progress - $31.50 - Jan 5               │
│ [View All Orders →]                                 │
│                                                      │
│ 💰 Earnings                                         │
│ This month: $1,250.50 (28 orders)                  │
│ Last month: $1,450.00 (32 orders)                  │
│ Pending payout: $285.00                             │
│ [View Payout History]                               │
│                                                      │
│ 🚩 Issues (2)                                       │
│ • Late delivery on #1230 (45 min)                  │
│ • Customer complaint on #1228 (resolved)            │
│                                                      │
│ 📄 Documents                                        │
│ COI: ✅ Valid until 12/31/2025 [Download]          │
│ Bank: ✅ Connected (Stripe) [View]                 │
│                                                      │
│ 📝 Admin Notes                                      │
│ • Jan 3 - Increased payout to 65% (from 60%)       │
│ • Dec 15 - COI renewed                              │
│ [Add Note...]                                       │
└─────────────────────────────────────────────────────┘
```

**API Endpoints:**
```typescript
GET /api/admin/partners
Response: {
  partners: Partner[],
  pending: Partner[]
}

POST /api/admin/partners
Body: {
  name: string,
  service_type: 'LAUNDRY' | 'CLEANING',
  contact_email: string,
  contact_phone: string,
  address: string,
  payout_percent: number,
  max_orders_per_slot?: number,
  max_minutes_per_slot?: number,
  service_areas: string[],
  coi_url?: string,
  coi_expires_at?: string
}

PUT /api/admin/partners/:id
Body: { /* same as POST */ }

DELETE /api/admin/partners/:id
(Soft delete - sets active = false)

GET /api/admin/partners/:id
Response: {
  partner: Partner,
  metrics: PartnerMetrics,
  recent_orders: Order[],
  issues: Issue[],
  notes: AdminNote[]
}

POST /api/admin/partners/:id/activate
POST /api/admin/partners/:id/deactivate

POST /api/admin/partners/:id/upload-coi
Body: FormData (file upload)
```

**Acceptance Criteria:**
- [ ] Can create partner in < 2 minutes
- [ ] Email validation prevents duplicates
- [ ] COI upload accepts PDF < 10MB
- [ ] Payout % validates 0-100
- [ ] Deactivated partners hidden from booking
- [ ] Partner profile updates notify partner via email
- [ ] Can search/filter partners by status, service, rating

---

### 4.1.5 Settings `/admin/settings`

**Purpose:** Configure platform-wide business rules and settings

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Platform Settings                      [Save Changes]│
├─────────────────────────────────────────────────────┤
│ 💼 Business Rules                                   │
│ First order cap:     [$__120.00__]                 │
│ Quote expiry:        [__12__] hours                 │
│ Cancellation window: [___2__] hours before pickup  │
│ Service areas:       [10026] [10027] [10030]       │
│                      [+ Add ZIP]                    │
│                                                      │
│ 💰 Pricing                                          │
│ Laundry base:        [$__1.75__] per lb           │
│ Laundry minimum:     [__15__] lbs                  │
│ NYC tax rate:        [__8.875__] %                 │
│ Tax applies to:      [☐ Laundry] [☑ Cleaning]     │
│                                                      │
│ 📱 Notifications                                    │
│ SMS enabled:         [☑ Yes] [☐ No]               │
│ Email enabled:       [☑ Yes] [☐ No]               │
│ Admin alerts email:  [admin@tidyhood.com____]      │
│ SLA breach alerts:   [☑ Enabled]                   │
│                                                      │
│ 🔧 System                                           │
│ Maintenance mode:    [☐ Enabled]                   │
│ New orders:          [☑ Accepting]                 │
│ Partner signups:     [☑ Open] [☐ Invite-only]     │
│                                                      │
│ [Cancel] [Save Changes]                             │
└─────────────────────────────────────────────────────┘
```

**API Endpoints:**
```typescript
GET /api/admin/settings
Response: {
  business_rules: {...},
  pricing: {...},
  notifications: {...},
  system: {...}
}

PUT /api/admin/settings
Body: { /* full settings object */ }
Logs to audit_logs
```

**Acceptance Criteria:**
- [ ] Changes save immediately
- [ ] Invalid values show inline error
- [ ] All changes logged to audit_logs
- [ ] Critical changes (tax rate, pricing) require confirmation modal
- [ ] Settings sync across all active admin sessions

---

## 4.2 Partner Portal [P0] 🔴

**Priority:** CRITICAL - Launch Blocker  
**Timeline:** Week 3-6  
**Effort:** 3 weeks (1 engineer)

### Overview

Self-service portal for partners to manage their orders, submit quotes, update availability, and track earnings.

---

### 4.2.1 Partner Dashboard `/partner`

**Purpose:** Partner-specific overview and quick actions

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ TidyHood Partner               Harlem Fresh Laundry │
│ [Dashboard] [Orders] [Schedule] [Profile] [Logout]  │
├─────────────────────────────────────────────────────┤
│ Welcome back, Harlem Fresh! 👋                      │
│                                                      │
│ Today's Stats                     Jan 5, 2025       │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ Orders   │ │ Earned   │ │ Rating   │            │
│ │    3     │ │  $82.50  │ │ ⭐ 4.8   │            │
│ │ +1 vs yd │ │ +$25 vs yd│ │ (45 ord) │            │
│ └──────────┘ └──────────┘ └──────────┘            │
│                                                      │
│ 🔴 Action Required (2)                              │
│ • #1234 - Awaiting quote (25 lbs, picked up 2h ago)│
│   [Submit Quote]                                    │
│ • #1235 - Ready for delivery (18 lbs)              │
│   [Mark Out for Delivery]                           │
│                                                      │
│ 🟡 In Progress (1)                                  │
│ #1233 - Processing (15 lbs, started 30m ago)       │
│ [Update Status] [Upload Photos]                     │
│                                                      │
│ 📅 Today's Schedule                                 │
│ • 10:00 AM - Pickup (#1234, #1235) - 2 orders      │
│ • 2:00 PM - Delivery (#1230, #1231) - 2 orders     │
│ • 6:00 PM - Pickup (#1236) - 1 order               │
│                                                      │
│ 📊 This Week Summary                                │
│ Orders completed: 15 • Earnings: $412.50           │
│ Avg quote time: 1.2 hrs • On-time rate: 96%        │
└─────────────────────────────────────────────────────┘
```

**API Endpoints:**
```typescript
GET /api/partner/metrics
Response: {
  today: { orders: 3, earnings: 82.50 },
  yesterday: { orders: 2, earnings: 57.50 },
  rating: 4.8,
  rating_count: 45
}

GET /api/partner/orders?status=action_required
Response: { orders: [...] }

GET /api/partner/schedule?date=today
Response: {
  slots: [
    {
      time: '10:00 AM',
      type: 'pickup',
      orders: ['#1234', '#1235']
    }
  ]
}
```

**Acceptance Criteria:**
- [ ] Dashboard loads in < 2 seconds
- [ ] Stats update on each page visit
- [ ] Action items prioritized by urgency
- [ ] Mobile-responsive (works on phone)
- [ ] Notifications badge shows count

---

### 4.2.2 Partner Orders `/partner/orders`

**Purpose:** View and manage assigned orders

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ My Orders                                            │
├─────────────────────────────────────────────────────┤
│ [Action Required] [Today] [Tomorrow] [This Week]    │
│ Filter: [Status ▼] [Date ▼]                        │
│                                                      │
│ 🔴 Action Required (2)                              │
│ ──────────────────────────────────────────────────  │
│ #1234 - Awaiting Quote                              │
│ Laundry • John Doe • +1 (555) 123-4567             │
│ Pickup: 10:00 AM (completed 2h ago)                │
│ Weight: 25 lbs (weighed)                            │
│ Estimated price: $43.75                             │
│ [Submit Quote]                                       │
│                                                      │
│ #1235 - Ready for Delivery                          │
│ Laundry • Jane Smith • +1 (555) 234-5678           │
│ Delivery: 2:00 PM (today)                           │
│ Weight: 18 lbs • Quote: $31.50 (paid)              │
│ [Mark Out for Delivery]                             │
│                                                      │
│ 🟡 Today's Orders (3)                               │
│ ──────────────────────────────────────────────────  │
│ #1233 - In Progress                                 │
│ Laundry • Bob Johnson • +1 (555) 345-6789          │
│ Pickup: 10:00 AM • Weight: 15 lbs                  │
│ Quote: $26.25 (paid) • Started: 12:00 PM           │
│ [Mark Ready] [Upload Photos]                        │
│                                                      │
│ 🟢 Tomorrow (2)                                     │
│ ──────────────────────────────────────────────────  │
│ #1236 - Scheduled                                   │
│ Cleaning • Sarah Lee • +1 (555) 456-7890           │
│ Start: 10:00 AM • 2BR Standard                     │
│ Price: $149.00 (paid)                               │
│ [View Details]                                      │
└─────────────────────────────────────────────────────┘
```

**Status-Specific Actions:**

**Laundry Flow:**
- `scheduled` → [View Details] (no action until pickup)
- `picked_up` → [Submit Quote] (after weighing)
- `awaiting_payment` → [Start Processing] (after payment confirmation)
- `processing` → [Mark Ready] + [Upload Photos]
- `out_for_delivery` → [Mark Delivered]

**Cleaning Flow:**
- `scheduled` → [Start Cleaning]
- `processing` → [Mark Complete] + [Upload Photos]

**API Endpoints:**
```typescript
GET /api/partner/orders
Query: status, date_from, date_to, limit
Response: { orders: Order[], grouped_by_date: {...} }

POST /api/partner/orders/:id/status
Body: {
  status: OrderStatus,
  photos?: string[], // For completion
  notes?: string
}
```

**Acceptance Criteria:**
- [ ] Shows only orders assigned to partner
- [ ] Groups orders by date (Today, Tomorrow, etc.)
- [ ] Action buttons disabled for invalid transitions
- [ ] Real-time updates (new orders appear automatically)
- [ ] Can call/SMS customer directly
- [ ] Photo upload works from mobile camera

---

### 4.2.3 Submit Quote `/partner/orders/:id/quote`

**Purpose:** Partner submits laundry quote after weighing

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ ← Back                Submit Quote - Order #1234    │
├─────────────────────────────────────────────────────┤
│ 👤 Customer                                         │
│ John Doe • +1 (555) 123-4567                        │
│ Address: 123 Malcolm X Blvd, Apt 4B                │
│                                                      │
│ 📦 Items                                            │
│ 1 bag • Estimated: 25 lbs                           │
│ Service: Wash & Fold                                │
│ Pickup: Jan 5, 10:00 AM (completed)                │
│ Delivery: Jan 7, 10:00 AM (scheduled)              │
│                                                      │
│ ⚖️ Actual Weight (Required)                         │
│ [___25.0___] lbs                                    │
│                                                      │
│ 💰 Pricing Calculator                               │
│ ┌─────────────────────────────────────────────┐    │
│ │ Base (25.0 lbs × $1.75)         $43.75     │    │
│ └─────────────────────────────────────────────┘    │
│                                                      │
│ Add-ons (Optional)                                   │
│ [☑] Rush 24hr (+$10.00)                            │
│ [☐] Delicate items (+$5.00)                        │
│ [☑] Extra softener (+$3.00)                        │
│ [☐] Bulky item (+$8.00)                            │
│                                                      │
│ ┌─────────────────────────────────────────────┐    │
│ │ Delivery                        $5.99       │    │
│ │ Tax (laundry exempt)            $0.00       │    │
│ │ ─────────────────────────────────────       │    │
│ │ Total Quote                     $62.74      │    │
│ └─────────────────────────────────────────────┘    │
│                                                      │
│ 📝 Notes to Customer (Optional)                    │
│ ┌─────────────────────────────────────────────┐    │
│ │ Heavy winter coats included. Used extra     │    │
│ │ detergent for deep cleaning.                │    │
│ └─────────────────────────────────────────────┘    │
│ Max 500 characters                                   │
│                                                      │
│ ⏰ Quote Expires                                    │
│ In 12 hours (Jan 6, 12:45 AM)                      │
│                                                      │
│ [Cancel] [Submit Quote →]                           │
│                                                      │
│ ℹ️ Customer will be notified via SMS and can       │
│    approve/reject within 12 hours.                  │
└─────────────────────────────────────────────────────┘
```

**Quote Validation:**
```typescript
interface QuoteValidation {
  weight_lbs: {
    min: 1,
    max: 100,
    required: true,
    precision: 1 // 1 decimal place
  },
  addons: {
    allowed: ['RUSH', 'DELICATE', 'SOFTENER', 'BULKY'],
    multiple: true
  },
  notes: {
    maxLength: 500,
    optional: true
  },
  total: {
    min: 15.00, // Minimum order
    max: 500.00 // Safety cap
  }
}
```

**API Endpoint:**
```typescript
POST /api/partner/orders/:id/quote
Body: {
  weight_lbs: 25.0,
  addons: ['RUSH', 'SOFTENER'],
  partner_notes: 'Heavy winter coats...',
  quoted_amount_cents: 6274
}

Response: {
  success: true,
  quote_id: 'uuid',
  expires_at: '2025-01-06T00:45:00Z'
}

// Side effects:
// 1. Order status → quote_sent
// 2. SMS sent to customer
// 3. Quote expiry timer started (12h)
// 4. Email notification to admin
```

**Acceptance Criteria:**
- [ ] Weight must be >= 15 lbs for laundry
- [ ] Quote calculates automatically on input
- [ ] Add-ons update price in real-time
- [ ] Cannot submit if weight invalid
- [ ] Customer receives SMS within 30 seconds
- [ ] Quote appears in customer's order view
- [ ] Partner cannot edit quote after submission

---

### 4.2.4 Partner Profile `/partner/profile`

**Purpose:** Manage business information and documents

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ Partner Profile                          [Edit Mode]│
├─────────────────────────────────────────────────────┤
│ 🏢 Business Information                             │
│ Name: Harlem Fresh Laundromat                       │
│ Address: 2280 Frederick Douglass Blvd              │
│          New York, NY 10027                         │
│ Phone: +1 (555) 234-5678                           │
│ Email: contact@harlemfresh.com                      │
│                                                      │
│ ⚙️ Service Configuration                            │
│ Service Type: Laundry                               │
│ Max Orders/Slot: 8                                  │
│ Payout Rate: 65%                                    │
│ Service Areas: 10026, 10027, 10030                 │
│                                                      │
│ 📄 Documents                                        │
│ Certificate of Insurance (COI)                      │
│ Status: ✅ Valid until 12/31/2025                   │
│ [Download] [Upload New]                             │
│                                                      │
│ Bank Account (Payouts)                              │
│ Status: ✅ Connected via Stripe                     │
│ Account: •••• 1234                                  │
│ [Update Payment Method]                             │
│                                                      │
│ 📊 Performance Metrics (Read-Only)                  │
│ Overall Rating: ⭐ 4.8/5 (45 reviews)               │
│ On-time Delivery: 96%                               │
│ Avg Quote Time: 1.2 hours                           │
│ Completed Orders: 45                                │
│ Member Since: June 2024                             │
│                                                      │
│ 🔔 Notification Preferences                         │
│ [☑] SMS for new orders                             │
│ [☑] Email for daily schedule                       │
│ [☑] Push notifications (mobile)                    │
│ [☐] Weekly performance summary                     │
│                                                      │
│ [Save Changes]                                       │
└─────────────────────────────────────────────────────┘
```

**Editable Fields (by partner):**
- Contact phone number
- Email address
- COI document (upload new)
- Notification preferences

**Read-Only Fields (admin-controlled):**
- Business name
- Service type
- Payout rate
- Service areas
- Performance metrics

**API Endpoints:**
```typescript
GET /api/partner/profile
Response: {
  partner: Partner,
  metrics: PartnerMetrics,
  notifications_prefs: {...}
}

PUT /api/partner/profile
Body: {
  contact_phone?: string,
  contact_email?: string,
  notification_prefs?: {...}
}

POST /api/partner/profile/upload-coi
Body: FormData
Response: { coi_url: string }
```

**Acceptance Criteria:**
- [ ] Partner can update contact info
- [ ] COI upload validates PDF < 10MB
- [ ] Bank account connects via Stripe Connect
- [ ] Performance metrics accurate and up-to-date
- [ ] Changes take effect immediately
- [ ] Partner receives confirmation email on profile update

---

## 4.3 Notifications System [P1] 🟡

**Priority:** HIGH  
**Timeline:** Week 5-6  
**Effort:** 2 weeks (1 engineer)

### Overview

Automated communication system for customers, partners, and admins.

### 4.3.1 Notification Events

**Customer Notifications:**

| Event | Type | Timing | Content |
|-------|------|--------|---------|
| Order confirmed | SMS + Email | Immediate | Order #, pickup time, partner name |
| Pickup reminder | SMS | 1h before | "Partner arriving in 1 hour" |
| Quote received | SMS + Email | Immediate | Quote amount, expiry time, approval link |
| Payment confirmed | Email | Immediate | Receipt, next steps |
| Ready for delivery | SMS | When ready | ETA, delivery window |
| Out for delivery | SMS | When dispatched | "On the way! ETA 30 mins" |
| Delivered | SMS + Email | On completion | Feedback request, receipt |

**Partner Notifications:**

| Event | Type | Timing | Content |
|-------|------|--------|---------|
| New order assigned | SMS + Email | Immediate | Order #, customer, pickup time |
| Pickup reminder | SMS | 30m before | Address, customer contact |
| Quote pending alert | SMS | After 2h | "Please submit quote for #1234" |
| Customer approved quote | SMS | Immediate | "Start processing #1234" |
| Daily schedule | Email | 6 AM daily | Today's pickups/deliveries |
| Late delivery warning | SMS | 15m before SLA | "Order #1234 due in 15 mins" |

**Admin Notifications:**

| Event | Type | Timing | Content |
|-------|------|--------|---------|
| Quote pending > 4h | Email | Every 4h | Order #, partner, customer |
| SLA breach | Email + Slack | Immediate | Order #, minutes late |
| Partner inactive > 24h | Email | Daily | Partner name, last activity |
| System error | Slack | Immediate | Error details, stack trace |
| Daily summary | Email | 8 PM daily | Orders, revenue, issues |

### 4.3.2 Database Schema

```sql
-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('SMS', 'EMAIL')),
  recipient_id UUID REFERENCES profiles(id),
  recipient_phone TEXT,
  recipient_email TEXT,
  template_key TEXT NOT NULL,
  variables JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error TEXT,
  provider_id TEXT, -- Twilio message SID or SendGrid ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_sent ON notifications(sent_at);
CREATE INDEX idx_notifications_template ON notifications(template_key);

-- Optional: Templates table (P2)
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[],
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.3.3 Implementation

**Notification Service:**
```typescript
// lib/notifications.ts
export async function sendNotification({
  type,
  recipient_id,
  template_key,
  variables
}: {
  type: 'SMS' | 'EMAIL',
  recipient_id: string,
  template_key: string,
  variables: Record<string, any>
}) {
  // 1. Get recipient details
  const recipient = await getRecipient(recipient_id);
  
  // 2. Render template
  const message = await renderTemplate(template_key, variables);
  
  // 3. Send via provider
  let result;
  if (type === 'SMS') {
    result = await sendSMS(recipient.phone, message);
  } else {
    result = await sendEmail(recipient.email, message);
  }
  
  // 4. Log to database
  await logNotification({
    type,
    recipient_id,
    template_key,
    variables,
    sent_at: new Date(),
    provider_id: result.id
  });
  
  return result;
}
```

**Template Examples:**
```typescript
const TEMPLATES = {
  order_confirmed: {
    sms: 'Your TidyHood order #{order_id} is confirmed! Pickup at {pickup_time} by {partner_name}.',
    email: {
      subject: 'Order Confirmed - #{order_id}',
      body: 'Your order has been confirmed...'
    }
  },
  quote_received: {
    sms: 'Quote for order #{order_id}: ${quote_amount}. Approve here: {approval_link}. Expires in {hours}h.',
    email: {
      subject: 'Quote Ready - #{order_id}',
      body: 'Your quote is ready...'
    }
  }
};
```

**API Endpoints:**
```typescript
// Internal only - called by order state machine
POST /api/notifications/send
Body: {
  type: 'SMS' | 'EMAIL',
  recipient_id: string,
  template_key: string,
  variables: {}
}

// Get notification history (admin/customer)
GET /api/notifications
Query: recipient_id, type, date_from, date_to
Response: { notifications: Notification[] }

// Retry failed notification (admin)
POST /api/notifications/:id/retry
```

**Acceptance Criteria:**
- [ ] All status changes trigger appropriate notifications
- [ ] SMS delivered within 30 seconds (p95)
- [ ] Email delivered within 2 minutes (p95)
- [ ] Failed notifications retry 3x with exponential backoff
- [ ] Rate limiting prevents spam (max 10/hr per user)
- [ ] Notification history visible to admin
- [ ] Unsubscribe link in all emails
- [ ] SMS cost tracking for billing

---

## 4.4 Metrics & Reporting [P1] 🟡

**Priority:** HIGH  
**Timeline:** Week 7-8  
**Effort:** 2 weeks (1 engineer)

### 4.4.1 Admin Metrics Dashboard

**Key Metrics:**
```typescript
interface AdminMetrics {
  // Revenue
  gmv: {
    today: number,
    yesterday: number,
    week: number,
    month: number
  },
  aov: number, // Average Order Value
  
  // Operations
  orders: {
    today: number,
    pending: number,
    late: number, // SLA violations
    completion_rate: number
  },
  
  // Partners
  active_partners: number,
  partner_fill_rate: number, // % capacity used
  partner_sla_adherence: number, // % on-time
  
  // Customer
  new_customers: number,
  repeat_rate: number,
  nps: number // If collected
}
```

**Charts (using Recharts):**
1. **Daily Orders (7 days)** - Line chart
2. **Revenue Trend (30 days)** - Area chart
3. **SLA Adherence (7 days)** - Bar chart
4. **Partner Performance** - Horizontal bar chart

**API:**
```typescript
GET /api/admin/metrics
Query: period=today|week|month, breakdown=daily|weekly
Response: {
  gmv: 1250.50,
  orders: { today: 28, pending: 3, late: 1 },
  sla_adherence: 0.96,
  trends: {
    daily_orders: [4, 5, 6, 7, 3, 4, 5],
    daily_revenue: [150, 180, 220, 250, 120, 140, 190]
  }
}
```

### 4.4.2 Partner Metrics Dashboard

**Key Metrics:**
```typescript
interface PartnerMetrics {
  // Earnings
  earnings: {
    today: number,
    week: number,
    month: number
  },
  pending_payout: number,
  
  // Performance
  orders_completed: number,
  avg_quote_time_hours: number,
  on_time_rate: number,
  rating: number, // 0-5
  rating_count: number,
  
  // Schedule
  orders_today: number,
  orders_tomorrow: number,
  capacity_utilization: number // %
}
```

**API:**
```typescript
GET /api/partner/metrics
Response: {
  earnings: { today: 82.50, week: 412.50, month: 1250.50 },
  orders_completed: 45,
  on_time_rate: 0.96,
  rating: 4.8
}
```

### 4.4.3 Metrics Caching (Optional P2)

```sql
CREATE TABLE metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL,
  metric_value JSONB NOT NULL,
  period TEXT NOT NULL,
  partner_id UUID REFERENCES partners(id),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(metric_key, period, partner_id, calculated_at::date)
);

CREATE INDEX idx_metrics_key_period ON metrics_cache(metric_key, period);
```

**Cron Job (daily at 1 AM):**
```typescript
// Calculate and cache yesterday's metrics
async function cacheMetrics() {
  const yesterday = getYesterday();
  
  // Admin metrics
  await cacheMetric('gmv', calculateGMV(yesterday), 'daily');
  await cacheMetric('orders', calculateOrders(yesterday), 'daily');
  
  // Partner metrics
  const partners = await getActivePartners();
  for (const partner of partners) {
    await cacheMetric('earnings', calculateEarnings(partner, yesterday), 'daily', partner.id);
  }
}
```

**Acceptance Criteria:**
- [ ] Metrics update hourly for "today" data
- [ ] Historical metrics cached daily
- [ ] Charts render in < 1 second
- [ ] Export to CSV functional
- [ ] Mobile-responsive layout
- [ ] Filters work without page reload

---

## 4.5 Audit Logging [P1] 🟡

**Priority:** HIGH  
**Timeline:** Week 5-6  
**Effort:** 1 week (integrated with other work)

### Database Schema

```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

### Logged Actions

**Order Actions:**
- `order.create`, `order.update_status`, `order.cancel`, `order.refund`, `order.assign_partner`

**Partner Actions:**
- `partner.create`, `partner.update`, `partner.activate`, `partner.deactivate`, `partner.submit_quote`

**Admin Actions:**
- `admin.force_status`, `admin.override_price`, `admin.manual_refund`, `admin.edit_settings`

**Example Log:**
```json
{
  "actor_id": "admin-uuid",
  "actor_role": "admin",
  "action": "order.force_status",
  "entity_type": "order",
  "entity_id": "1234",
  "changes": {
    "from": "processing",
    "to": "delivered",
    "reason": "Customer confirmed in person"
  },
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2025-01-05T10:30:00Z"
}
```

### Implementation

**Middleware:**
```typescript
// lib/
