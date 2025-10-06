# 🚀 Production Migration 022 - Cleaning Status System

**Date:** October 6, 2025  
**Migration:** 022_cleaning_status_system.sql  
**Status:** ⚠️ NEEDS TO BE RUN IN PRODUCTION

---

## ⚠️ Important

The cleaning status system code has been deployed to production via GitHub/Vercel, but the **database migration has NOT been run in production yet**.

You need to run migration 022 in your production Supabase database to enable the cleaning_status features.

---

## 🔧 How to Run Migration in Production

### Method 1: Supabase Dashboard (Easiest)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `gbymheksmnenuranuvjr`

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy Migration SQL**
   - Open: `supabase/migrations/022_cleaning_status_system.sql`
   - Copy ALL the SQL content

4. **Run Migration**
   - Paste SQL into the query editor
   - Click "Run" button
   - Wait for "Success" message

5. **Verify Column Exists**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'orders' 
     AND column_name = 'cleaning_status';
   ```
   Should return: `cleaning_status | text`

---

### Method 2: Using our Migration Script

1. **Set production database URL**
   ```bash
   # Temporarily export production URL
   export DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres"
   ```

2. **Run migration**
   ```bash
   node scripts/run-migration.js supabase/migrations/022_cleaning_status_system.sql
   ```

3. **Verify**
   ```bash
   # Check column exists
   psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'cleaning_status';"
   ```

---

### Method 3: Supabase CLI

1. **Link to production project**
   ```bash
   supabase link --project-ref gbymheksmnenuranuvjr
   ```

2. **Push migration**
   ```bash
   supabase db push
   ```

3. **Verify**
   ```bash
   supabase db diff --schema public
   # Should show no differences if migration succeeded
   ```

---

## ✅ What the Migration Does

### Adds to `orders` Table:
1. `cleaning_status` - TEXT column with 5 states:
   - scheduled
   - in_service  
   - completed
   - canceled
   - rescheduled

2. `rescheduled_from` - UUID column (links to original order if rescheduled)

3. `partner_notes` - TEXT column (completion notes)

4. `cancellation_reason` - TEXT column

5. `cancellation_fee_cents` - INTEGER column

6. `refund_amount_cents` - INTEGER column

7. `refund_id` - TEXT column (Stripe refund ID)

8. `canceled_at` - TIMESTAMP

### Creates Indexes:
1. `idx_orders_cleaning_status` - For status queries
2. `idx_orders_slot_start_cleaning` - For scheduled order lookups
3. `idx_orders_rescheduled_from` - For reschedule chain queries

### Updates Existing Data:
- Sets `cleaning_status` on existing cleaning orders based on current `status`
- Maintains backward compatibility

---

## 🧪 After Running Migration

Test that it worked:

### In Supabase Dashboard:
```sql
-- 1. Check column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'cleaning_status';

-- 2. Check existing data was migrated
SELECT id, service_type, status, cleaning_status 
FROM orders 
WHERE service_type = 'CLEANING' 
LIMIT 5;

-- 3. Verify indexes were created
SELECT indexname FROM pg_indexes 
WHERE tablename = 'orders' 
  AND indexname LIKE '%cleaning%';
```

Expected results:
1. Column exists ✅
2. cleaning_status populated on existing orders ✅
3. Three indexes created ✅

---

## 🎯 What Happens After Migration

Once migration 022 is run in production:

### Features That Will Work:
✅ Cleaning status badges on order cards  
✅ Cancel cleaning workflow with fee preview  
✅ Reschedule cleaning workflow  
✅ Partner mark complete functionality  
✅ Auto-transition cron jobs  
✅ Stripe refund integration  

### Features That Won't Change:
✅ Laundry orders (no impact)  
✅ Existing orders (safely migrated)  
✅ User authentication  
✅ Payment processing  

---

## ⚠️ Rollback Plan

If you need to rollback the migration:

```bash
# Run the rollback migration
# File: supabase/migrations/022_cleaning_status_system_rollback.sql
```

This will:
- Drop the new columns
- Drop the new indexes
- Restore database to previous state

**Note:** Only rollback if there's a critical issue. The migration is designed to be safe and backward-compatible.

---

## 📋 Checklist

Before running migration in production:

- [ ] Code deployed to Vercel (already done ✅)
- [ ] Local migration tested (already done ✅)
- [ ] Backup production database (recommended)
- [ ] Ready to run migration in production
- [ ] Have rollback script handy (just in case)

After running migration:

- [ ] Verify column exists
- [ ] Check existing data migrated correctly
- [ ] Test one cleaning order (cancel/reschedule)
- [ ] Monitor for errors in production logs
- [ ] Celebrate! 🎉

---

## 🚀 Quick Start

**If you're ready to run it now:**

1. Go to https://supabase.com/dashboard
2. Select project `gbymheksmnenuranuvjr`
3. Click "SQL Editor"
4. Click "New Query"
5. Copy/paste content from `supabase/migrations/022_cleaning_status_system.sql`
6. Click "Run"
7. Wait for "Success ✓"
8. Test a cleaning order in your app

**Done!** Cleaning workflows will now be active in production! 🎊

---

## 💡 Why This is Safe

The migration is designed with safety in mind:

✅ **Non-breaking** - Uses `IF NOT EXISTS` checks  
✅ **Backward compatible** - Doesn't modify existing columns  
✅ **Gradual** - Only affects CLEANING orders  
✅ **Reversible** - Rollback script provided  
✅ **Tested** - Ran successfully in local/dev environment  

---

**Status:** ⏳ **WAITING FOR PRODUCTION MIGRATION**

Once you run migration 022 in production Supabase, all cleaning workflow features will be active!
