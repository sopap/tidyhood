# TidyHood Operations Management - Phase 0 Complete

**Date:** January 5, 2025  
**Status:** ✅ Phase 0 Foundation Complete  
**Next Phase:** Phase 1 - Essential Operations MVP (Weeks 2-5)

---

## Phase 0 Summary: Pre-Launch Foundation

Phase 0 established the technical foundation for TidyHood's operations management system. All database schema, feature flags, and configuration are now in place to support partner management, capacity scheduling, and operational workflows.

---

## ✅ Completed Work

### 1. Database Migrations (3 New Tables)

#### **Migration 013: `capacity_templates`**
- **Purpose:** Recurring availability patterns for partners
- **Use Case:** Define weekly schedules (e.g., "Every Monday 10-12 AM, max 8 orders")
- **Features:**
  - Day of week patterns (0=Sunday through 6=Saturday)
  - Time ranges with capacity limits
  - Support for both laundry (order count) and cleaning (minutes)
  - Active/inactive toggling
  - Partner-specific templates

**Key Columns:**
```sql
- partner_id: Links to partners table
- day_of_week: 0-6 for recurring patterns
- slot_start/slot_end: TIME fields for schedule
- max_units: Capacity limit (orders or minutes)
- service_type: LAUNDRY or CLEANING
- active: Enable/disable without deleting
```

**RLS Policies:**
- Admins: Full access
- Partners: Read-only access to their own templates

---

#### **Migration 014: `partner_applications`**
- **Purpose:** Partner onboarding workflow
- **Use Case:** Track partner applications from submission to approval
- **Features:**
  - Application status tracking (pending, under_review, approved, rejected)
  - Document storage (COI, W9, etc. as JSON)
  - Admin review workflow
  - Notes and feedback

**Key Columns:**
```sql
- business_name, contact_name, contact_email, contact_phone
- service_type: LAUNDRY or CLEANING
- address, zip: Business location
- status: Application state
- documents: JSONB for uploaded doc URLs
- reviewed_by, reviewed_at: Admin tracking
- notes: Admin feedback
```

**RLS Policies:**
- Admins: Full access
- Applicants: Can view their own application

---

#### **Migration 015: `operational_alerts`**
- **Purpose:** System-generated alerts for operations team
- **Use Case:** Alert admins about quote delays, SLA breaches, capacity issues
- **Features:**
  - Severity levels (low, medium, high, critical)
  - Alert types (quote_pending, sla_breach, no_partner_available, etc.)
  - Dismissal tracking
  - Metadata for context

**Key Columns:**
```sql
- alert_type: Categorization (quote_pending, sla_breach, etc.)
- severity: low/medium/high/critical
- entity_type, entity_id: Links to orders, partners, etc.
- message: Human-readable alert text
- metadata: JSONB for additional context
- dismissed_at, dismissed_by: Admin acknowledgment
```

**Helper Function:**
```sql
create_operational_alert(
  p_alert_type TEXT,
  p_severity TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
```

**RLS Policies:**
- Admins: Full access (can create, view, dismiss)

---

### 2. Feature Flags System

**File:** `lib/features.ts`

Implemented a feature flag system for gradual rollout of new functionality:

```typescript
export const FEATURES = {
  PARTNER_PORTAL: process.env.NEXT_PUBLIC_ENABLE_PARTNER_PORTAL === 'true',
  CAPACITY_CALENDAR: process.env.NEXT_PUBLIC_ENABLE_CAPACITY_CALENDAR === 'true',
  AUTO_ASSIGN: process.env.NEXT_PUBLIC_ENABLE_AUTO_ASSIGN === 'true',
  AUTOMATED_NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_AUTO_NOTIFICATIONS === 'true',
} as const;
```

**Functions:**
- `isFeatureEnabled(feature)`: Check if a feature is enabled
- `getEnabledFeatures()`: Get all feature states (debugging/admin view)

**Usage Example:**
```typescript
if (isFeatureEnabled('PARTNER_PORTAL')) {
  // Show partner portal link
}
```

**Benefits:**
- Safe deployment (features disabled by default)
- Gradual rollout (enable one feature at a time)
- Easy rollback (disable via environment variable)
- No code changes needed to toggle features

---

### 3. Environment Variables

**File:** `.env.example` (updated)

**New Variables Added:**

#### Feature Flags
```bash
NEXT_PUBLIC_ENABLE_PARTNER_PORTAL=false
NEXT_PUBLIC_ENABLE_CAPACITY_CALENDAR=false
NEXT_PUBLIC_ENABLE_AUTO_ASSIGN=false
NEXT_PUBLIC_ENABLE_AUTO_NOTIFICATIONS=false
```

#### File Storage
```bash
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=tidyhood-documents
```

**Existing Variables** (already present):
- Supabase configuration
- Google Maps API key
- Stripe keys
- Twilio credentials
- Admin configuration
- Business rules (tax rate, order caps, etc.)

---

## 📋 Deployment Checklist

### Before Deploying Phase 0:

- [x] ✅ Create database migrations (013, 014, 015)
- [x] ✅ Create feature flags system
- [x] ✅ Update .env.example with new variables
- [ ] ⏳ Run migrations on development database
- [ ] ⏳ Verify migrations applied successfully
- [ ] ⏳ Copy .env.example to .env.local (if not already done)
- [ ] ⏳ Set feature flags to false in .env.local
- [ ] ⏳ Verify application starts without errors
- [ ] ⏳ Create Supabase Storage bucket (`tidyhood-documents`)
- [ ] ⏳ Configure storage bucket policies (public read for receipts)

### To Run Migrations:

**Option 1: Using Supabase CLI**
```bash
supabase db push
```

**Option 2: Using npm script**
```bash
npm run migrate
```

**Option 3: Manual (Supabase Dashboard)**
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of each migration file
3. Run in order: 013, 014, 015

### To Verify Migrations:

```sql
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('capacity_templates', 'partner_applications', 'operational_alerts');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('capacity_templates', 'partner_applications', 'operational_alerts');

-- Check helper function exists
SELECT proname FROM pg_proc WHERE proname = 'create_operational_alert';
```

---

## 🗂️ Database Schema Overview

After Phase 0, TidyHood's database now includes:

### **Existing Tables** (from previous work):
1. `profiles` - User accounts
2. `addresses` - Customer addresses
3. `partners` - Laundry/cleaning partners
4. `capacity_calendar` - Available time slots
5. `orders` - Customer orders
6. `order_events` - Order audit trail
7. `notifications` - SMS/email log
8. `audit_logs` - Admin actions
9. `admin_notes` - Order annotations
10. `pricing_rules` - Dynamic pricing
11. `subscriptions` - Recurring plans
12. Plus: buildings, payouts, claims, bags, invoices, etc.

### **New Tables** (Phase 0):
13. `capacity_templates` - Recurring availability patterns
14. `partner_applications` - Onboarding workflow
15. `operational_alerts` - System alerts

**Total Tables:** 19+ tables  
**Total Migrations:** 15 migrations

---

## 🚀 What's Next: Phase 1

### Phase 1: Essential Operations MVP (Weeks 2-5)

**Goal:** Enable manual operations with 10 partners and 50 orders/day

### Week 2: Partner Management
- [ ] Partner list page (`/admin/partners`)
- [ ] Add partner form
- [ ] Partner detail view
- [ ] Partner API endpoints (CRUD)

### Week 3: Capacity Management
- [ ] Capacity entry form (`/admin/capacity/add`)
- [ ] Capacity list view
- [ ] Slot creation API (single & recurring)

### Week 4-5: Partner Portal MVP
- [ ] Partner authentication
- [ ] Partner dashboard (`/partner`)
- [ ] View assigned orders
- [ ] Submit laundry quotes
- [ ] Update order status

### Success Metrics (End of Phase 1):
- ✅ Can onboard 1 partner in 30 minutes
- ✅ Can create 1 week of capacity in 15 minutes
- ✅ Partners can submit quote in <3 minutes
- ✅ 90% of notifications delivered within 30s

---

## 📊 Implementation Progress

**Overall Progress:** 6% complete

```
Phase 0: Foundation          ████████████████████ 100% ✅
Phase 1: Essential Ops MVP   ░░░░░░░░░░░░░░░░░░░░   0%
Phase 2: Automation          ░░░░░░░░░░░░░░░░░░░░   0%
Phase 3: Scale & Financial   ░░░░░░░░░░░░░░░░░░░░   0%
```

**Timeline:**
- Week 1 (Phase 0): ✅ Complete
- Weeks 2-5 (Phase 1): Starting now
- Weeks 6-10 (Phase 2): Not started
- Weeks 11-16 (Phase 3): Not started

---

## 🔒 Security Considerations

### RLS Policies Implemented:
- ✅ `capacity_templates`: Admins full access, partners read-only
- ✅ `partner_applications`: Admins full access, applicants can view own
- ✅ `operational_alerts`: Admins only

### Service Role Required:
Some operations will require service role access:
- Creating alerts from background jobs
- Auto-assignment logic
- Quote expiration processing

**Note:** Service role operations should always validate inputs and log to `audit_logs`.

---

## 📝 Notes & Considerations

### Feature Flag Strategy:
1. **Week 1-5:** All features disabled while building
2. **Week 6:** Enable PARTNER_PORTAL for beta testing
3. **Week 7:** Enable CAPACITY_CALENDAR once tested
4. **Week 8:** Enable AUTO_ASSIGN gradually (monitor closely)
5. **Week 9:** Enable AUTOMATED_NOTIFICATIONS

### Rollback Plan:
If any feature causes issues:
1. Set feature flag to `false` in environment
2. Redeploy (no code changes needed)
3. Investigate issue in staging
4. Re-enable when fixed

### Migration Rollback:
If migrations need to be rolled back:
```sql
-- Drop tables (in reverse order)
DROP TABLE IF EXISTS operational_alerts CASCADE;
DROP TABLE IF EXISTS partner_applications CASCADE;
DROP TABLE IF EXISTS capacity_templates CASCADE;

-- Drop helper function
DROP FUNCTION IF EXISTS create_operational_alert;
```

---

## 🎯 Ready for Phase 1

Phase 0 foundation is complete. The system is now ready to build:
1. **Partner Management UI** - CRUD operations for partners
2. **Capacity Management** - Time slot creation and management
3. **Partner Portal** - Self-service interface for partners

All infrastructure is in place. Next steps: Build the UI and API endpoints.

---

**Questions or Issues?**
- Check migration logs in Supabase Dashboard → Database → Migrations
- Verify RLS policies: Database → Policies
- Test feature flags: `getEnabledFeatures()` in browser console
- Review implementation plan: See revised 16-week roadmap

**Last Updated:** January 5, 2025  
**Next Review:** After Phase 1 Week 2 completion
