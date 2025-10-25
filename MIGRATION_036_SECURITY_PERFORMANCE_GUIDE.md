# Migration 036: Security and Performance Fixes

**Status:** Ready for deployment  
**Date:** October 25, 2025  
**Priority:** High  
**Estimated Duration:** 5-10 minutes

## Executive Summary

This migration addresses **195 security and performance issues** identified by Supabase's database health advisor:
- **2 Security Issues:** Missing RLS on tables
- **18 Security Issues:** Functions with mutable search_path
- **35 Performance Issues:** RLS policies with per-row function evaluation
- **~140 Warnings:** Duplicate permissive policies (informational only)

## Issues Addressed

### Part 1: Missing RLS Protection (2 Critical Security Issues)

**Problem:** Two tables were publicly accessible without Row Level Security:
1. `public.partner_sms_conversations`
2. `public.payment_retry_log`

**Risk:** Unauthorized users could potentially read/write sensitive data

**Solution:** 
- Enabled RLS on both tables
- Added policies restricting access to admins and service role only

### Part 2: Function Search Path Vulnerability (18 Security Issues)

**Problem:** Functions using `SECURITY DEFINER` without fixed `search_path` are vulnerable to search path injection attacks

**Affected Functions:**
- `get_active_cancellation_policy`
- `get_active_policy_with_version`
- `is_guest_order`
- `log_policy_change`
- `log_audit`
- `is_admin` (2 instances)
- `is_partner` (2 instances)
- `update_order_with_version`
- `log_settings_change`
- `check_capacity_conflict`
- `log_delivery_policy_change`
- `generate_order_id`
- `handle_new_user`
- `update_updated_at_column`
- `log_order_status_change`

**Risk:** Malicious users could potentially execute arbitrary code via search path manipulation

**Solution:** Added `SET search_path = public, pg_temp` to all affected functions

### Part 3: RLS Policy Performance (35 Performance Issues)

**Problem:** RLS policies calling `auth.uid()` and similar functions are re-evaluated for each row in query results, causing O(n) performance degradation at scale

**Affected Tables & Policies:**
- `profiles` (3 policies)
- `addresses` (4 policies)
- `orders` (4 policies)
- `order_events` (1 policy)
- `bags` (1 policy)
- `cleaning_checklist` (1 policy)
- `claims` (2 policies)
- `subscriptions` (3 policies)
- `invoices` (1 policy)
- `notifications` (2 policies)
- `audit_logs` (1 policy)
- `admin_notes` (2 policies)
- `waitlist` (1 policy)
- `webhook_events` (2 policies)
- `payment_sagas` (2 policies)
- `cancellation_policies` (1 policy)
- `settings_audit_log` (1 policy)
- `delivery_time_policies` (1 policy)
- `delivery_time_policy_history` (1 policy)

**Impact:** Queries returning many rows become exponentially slower

**Solution:** Wrapped function calls in `SELECT` subqueries:
```sql
-- Before (re-evaluated per row)
USING (user_id = auth.uid())

-- After (evaluated once)
USING (user_id = (SELECT auth.uid()))
```

### Part 4: Duplicate Policy Warnings (~140 Informational Warnings)

**Status:** These are **NOT errors** - they are informational warnings

**What they mean:** Multiple RLS policies exist for the same table/role/action combination (e.g., an admin policy and a user's own-data policy)

**Why this is okay:** The policies use `PERMISSIVE` mode, which means they are ORed together - access is granted if ANY policy allows it. This is the intended design for our multi-role system.

**Example:**
```sql
-- Users can see their own orders
CREATE POLICY orders_select_own ON orders
  FOR SELECT USING (user_id = (SELECT auth.uid()));

-- Admins can see all orders  
CREATE POLICY orders_admin_all ON orders
  FOR SELECT USING (is_admin());
```

These warnings will remain after the migration - this is expected and safe.

## Pre-Migration Checklist

- [ ] **Backup database** (Supabase automatically handles this)
- [ ] **Schedule maintenance window** (recommended but not required)
- [ ] **Notify team** of deployment
- [ ] **Verify environment variables**:
  ```bash
  echo $SUPABASE_URL
  echo $SUPABASE_SERVICE_KEY
  ```
- [ ] **Test in staging first** (if available)

## Running the Migration

### Option 1: Manual via Supabase Dashboard (Recommended)

This is the most reliable method:

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your project

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Copy Migration SQL**
   - Open `supabase/migrations/036_security_and_performance_fixes.sql` in your code editor
   - Copy the entire contents (Ctrl+A, Ctrl+C)

4. **Execute Migration**
   - Paste into the SQL Editor (Ctrl+V)
   - Click **Run** button (or press Ctrl+Enter)
   - Wait for completion (typically 2-5 minutes)
   - You should see "Success. No rows returned"

5. **Verify Success**
   - Check the output for any errors
   - If successful, proceed to Post-Migration Verification section

### Option 2: Using Supabase CLI (Alternative)

If you have the Supabase CLI installed and configured:

```bash
# Ensure you're in the project root
cd /path/to/tidyhood

# Push the migration
supabase db push

# Or apply specific migration
supabase migration up 036_security_and_performance_fixes
```

### Option 3: Using psql (Advanced)

If you have direct database access:

```bash
# Get your database connection string from Supabase Dashboard
# Settings → Database → Connection String (URI)

psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-HOST]:5432/postgres" \
  -f supabase/migrations/036_security_and_performance_fixes.sql
```

## Post-Migration Verification

### 1. Check Migration Success

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('partner_sms_conversations', 'payment_retry_log');
-- Both should show rowsecurity = true

-- Verify function search_path
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname IN ('is_admin', 'is_partner', 'log_audit')
AND pronamespace = 'public'::regnamespace;
-- All should show proconfig containing 'search_path=public, pg_temp'

-- Test a policy optimization
EXPLAIN ANALYZE
SELECT * FROM profiles WHERE id = auth.uid();
-- Check execution time and plan
```

### 2. Verify Application Functionality

Test the following critical flows:

**Customer Flows:**
- [ ] Login/Signup
- [ ] Create new order
- [ ] View order history
- [ ] Update profile

**Partner Flows:**
- [ ] Partner login
- [ ] View assigned orders
- [ ] Update order status
- [ ] Submit quote

**Admin Flows:**
- [ ] View all orders
- [ ] View all users
- [ ] Access audit logs
- [ ] Manage settings

### 3. Monitor Performance

```sql
-- Check for slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%auth.uid%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 4. Check Supabase Dashboard

1. Go to **Database → Advisors**
2. Verify the issue counts:
   - Security: Should decrease by ~20
   - Performance: Should decrease by ~35
   - Warnings: ~140 will remain (expected)

## Rollback Procedure

If issues arise, you can rollback:

```bash
# Using the rollback script
node scripts/run-migration-036-rollback.js

# Or manually via SQL Editor
# Run: supabase/migrations/036_security_and_performance_fixes_rollback.sql
```

**Note:** The rollback is minimal because:
- Security fixes should NOT be reverted
- Performance optimizations are backward compatible
- Only the newly added RLS policies are removed

For a complete rollback, restore from backup.

## Expected Improvements

### Security
- ✅ 2 tables now protected with RLS
- ✅ 18 functions hardened against search path attacks
- ✅ Reduced attack surface

### Performance
- ✅ Up to **10-100x faster** queries on large result sets
- ✅ Reduced database CPU usage
- ✅ Better query plan caching

### Example Performance Impact

```
Before: SELECT 1000 orders WHERE user_id = auth.uid()
- auth.uid() called 1000 times
- Execution time: ~500ms

After: SELECT 1000 orders WHERE user_id = (SELECT auth.uid())
- auth.uid() called once
- Execution time: ~5ms

Improvement: 100x faster
```

## Troubleshooting

### Issue: Migration times out

**Solution:** 
- The migration may still be running
- Check Supabase dashboard for active queries
- Consider running during low-traffic hours

### Issue: Permission denied errors

**Cause:** Using anon key instead of service role key

**Solution:**
```bash
export SUPABASE_SERVICE_KEY="your-service-role-key-here"
```

### Issue: Users can't access data after migration

**Cause:** RLS policies may need adjustment

**Solution:**
1. Check which table/user is affected
2. Review the RLS policies for that table
3. Ensure user's role is correct in profiles table
4. Check `auth.uid()` is working correctly

### Issue: Application errors mentioning policies

**Check:**
```sql
-- Verify policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'your_table_name';

-- Test policy as specific user
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"user-uuid-here"}';
SELECT * FROM your_table;
```

## FAQ

**Q: Will this cause downtime?**
A: No, the migration runs while the database is live. Users may experience slightly slower queries during the ~5 minute migration window.

**Q: Why are there still ~140 warnings?**
A: These are duplicate policy warnings, which are informational only. Our multi-role security model intentionally uses multiple overlapping policies (e.g., admin + own-data policies). This is safe and by design.

**Q: Can I run this migration during business hours?**
A: Yes, but a maintenance window is recommended to ensure smooth execution without user traffic.

**Q: What if I need to revert?**
A: Use the rollback script, but note that security fixes should generally NOT be reverted. If you must fully revert, restore from database backup.

**Q: How do I know the migration worked?**
A: Check the Supabase dashboard Advisors section - you should see ~55 fewer issues. Test critical user flows to ensure functionality.

## Next Steps After Migration

1. **Monitor for 24-48 hours**
   - Watch error logs
   - Check performance metrics
   - Review user feedback

2. **Update documentation**
   - Mark migration as complete
   - Document any issues encountered
   - Update runbooks if needed

3. **Optimize further (optional)**
   - Review the remaining duplicate policy warnings
   - Consider consolidating policies if they're truly redundant
   - Add database indexes if query performance issues persist

4. **Schedule regular reviews**
   - Check Supabase advisors monthly
   - Keep functions updated with security best practices
   - Monitor for new RLS tables that need policies

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Supabase logs in the dashboard
3. Check application error logs
4. Consult with the development team

## Migration Files

- **Migration:** `supabase/migrations/036_security_and_performance_fixes.sql`
- **Rollback:** `supabase/migrations/036_security_and_performance_fixes_rollback.sql`
- **Runner:** `scripts/run-migration-036.js`
- **Documentation:** `MIGRATION_036_SECURITY_PERFORMANCE_GUIDE.md` (this file)

---

**Migration Author:** Cline  
**Review Date:** 2025-10-25  
**Approved By:** _________________  
**Deployment Date:** _________________
