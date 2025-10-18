# Admin Settings - Immediate Next Steps

**Current Status:** Phase 1 is 50% complete (Database ✓, 3/6 APIs ✓)

## Step 1: Run the Migration (5 minutes)

```bash
# Ensure you have environment variables set
node scripts/run-migration-033.js
```

Expected output:
- ✅ cancellation_policies table created (2 rows)
- ✅ settings_audit_log table created (0 rows)
- ✅ pricing_rules enhanced with audit columns

## Step 2: Complete Remaining API Endpoints (30 minutes)

### A. Policy Update Endpoint
Create `app/api/admin/settings/policies/[service_type]/route.ts`:
- PUT method to update policy for LAUNDRY or CLEANING
- Archive old policy (set active=false)
- Create new policy (active=true)
- Log to audit table
- Return count of affected future orders

### B. Audit History Endpoint  
Create `app/api/admin/settings/history/route.ts`:
- GET method with filters (table_name, date_range, user)
- Order by changed_at DESC
- Support CSV export option
- Include user full_name via JOIN

### C. Update lib/cancellationFees.ts
Modify to fetch from database instead of hardcoded:
```typescript
// Add function:
export async function getCancellationPolicy(serviceType: 'LAUNDRY' | 'CLEANING') {
  const { data } = await db
    .from('cancellation_policies')
    .select('*')
    .eq('service_type', serviceType)
    .eq('active', true)
    .single()
  return data
}
```

## Step 3: Build Quick Admin UI (2 hours)

### Option A: Simple Form (Fast)
Update existing `app/admin/settings/page.tsx`:
```typescript
'use client'
- Fetch pricing rules on load
- Display in simple form with inputs
- PUT on save
- Toast notification on success
```

### Option B: Full Featured (Better UX)
Create components:
- `components/admin/settings/PricingTable.tsx` - Editable table
- `components/admin/settings/PolicyCard.tsx` - Policy editor
- `components/admin/settings/AuditLog.tsx` - Change history

## Step 4: Test End-to-End (30 minutes)

1. Login as admin
2. Navigate to /admin/settings
3. Change laundry price from $1.75 to $2.00/lb
4. Verify:
   - Database updated
   - Audit log created
   - New bookings use new price
   - Existing orders unaffected

## Step 5: Deploy to Production

```bash
# Push to Git
git add .
git commit -m "feat: admin settings management"
git push

# Vercel will auto-deploy
# Then run migration on production Supabase
```

## Quick Win: Minimal Implementation

If you need this ASAP, do this:

1. Run migration ✓
2. Skip remaining APIs for now
3. Create simple admin form that calls existing pricing endpoint
4. Use SQL to manually update for now via Supabase dashboard
5. Complete full implementation later

## Files Already Created

✅ Database:
- `supabase/migrations/033_admin_settings_infrastructure.sql`
- `scripts/run-migration-033.js`

✅ APIs:
- `app/api/admin/settings/pricing/route.ts` (GET)
- `app/api/admin/settings/pricing/[id]/route.ts` (PUT)
- `app/api/admin/settings/policies/route.ts` (GET)

✅ Docs:
- `ADMIN_SETTINGS_IMPLEMENTATION_PROGRESS.md` (detailed)
- `ADMIN_SETTINGS_NEXT_STEPS.md` (this file)

## Current Pricing Values

To manually update wash & fold price via Supabase SQL:
```sql
UPDATE pricing_rules 
SET unit_price_cents = 200, -- $2.00/lb
    updated_at = NOW(),
    change_reason = 'Manual price adjustment'
WHERE rule_name = 'LAUNDRY_PER_LB_BASE';
```

---

**Ready to continue?** Start with Step 1 (run migration), then tackle remaining endpoints or jump to simple UI.
