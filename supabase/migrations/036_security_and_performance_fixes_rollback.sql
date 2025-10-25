-- Rollback Migration: Security and Performance Fixes
-- Date: 2025-10-25
-- Description: Rollback script for migration 036
--
-- WARNING: This will revert security improvements and performance optimizations
-- Only run this if absolutely necessary

BEGIN;

-- ============================================================================
-- PART 1: DISABLE RLS ON TABLES (reverses security improvements)
-- ============================================================================

-- Note: We do NOT disable RLS as that would be a security regression
-- Instead, we just remove the policies we added

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'partner_sms_conversations' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Admin access to SMS conversations" ON public.partner_sms_conversations;
    DROP POLICY IF EXISTS "Service role access to SMS conversations" ON public.partner_sms_conversations;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payment_retry_log' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Admin access to payment retry log" ON public.payment_retry_log;
    DROP POLICY IF EXISTS "Service role access to payment retry log" ON public.payment_retry_log;
  END IF;
END $$;

-- ============================================================================
-- PART 2: REVERT FUNCTION SEARCH_PATH CHANGES
-- ============================================================================

-- Note: Reverting search_path changes would require having the original
-- function definitions. Since we're fixing a security issue, we should NOT
-- revert these changes. Instead, this section documents what was changed.

-- Functions that were modified with SET search_path = public, pg_temp:
-- 1. get_active_cancellation_policy
-- 2. get_active_policy_with_version  
-- 3. is_guest_order
-- 4. log_policy_change
-- 5. log_audit
-- 6. is_admin
-- 7. is_partner
-- 8. update_order_with_version
-- 9. log_settings_change
-- 10. check_capacity_conflict
-- 11. log_delivery_policy_change
-- 12. generate_order_id
-- 13. handle_new_user
-- 14. update_updated_at_column
-- 15. log_order_status_change

-- To fully rollback, you would need to restore the original function definitions
-- from your version control system or database backup.

-- ============================================================================
-- PART 3: REVERT RLS POLICY OPTIMIZATIONS
-- ============================================================================

-- Note: Reverting the SELECT wrapper optimizations would harm performance.
-- The changes are backward compatible and only improve performance.
-- If you must revert, you would need to restore the original policy definitions
-- which used auth.uid() directly instead of (SELECT auth.uid())

-- Policies that were optimized (35 total):
-- profiles: profiles_select_own, profiles_update_own, profiles_insert_own
-- addresses: addresses_select_own, addresses_insert_own, addresses_update_own, addresses_delete_own
-- orders: orders_select_own, orders_insert_own, orders_update_own_pending, orders_read_own_or_guest
-- order_events: order_events_select_own
-- bags: bags_select_own
-- cleaning_checklist: checklist_select_own
-- claims: claims_select_own, claims_insert_own
-- subscriptions: subscriptions_select_own, subscriptions_insert_own, subscriptions_update_own
-- invoices: invoices_select_own
-- notifications: notifications_select_own, notifications_admin_all
-- audit_logs: audit_logs_admin_select
-- admin_notes: admin_notes_admin_all, admin_notes_partner_select
-- waitlist: "Only admins can view waitlist"
-- webhook_events: "Service role can manage webhook events", "Admins can view webhook events"
-- payment_sagas: "Service role can manage payment sagas", "Admins can view payment sagas"
-- cancellation_policies: cancellation_policies_admin_all
-- settings_audit_log: settings_audit_log_admin_read
-- delivery_time_policies: "Admin full access to delivery policies"
-- delivery_time_policy_history: "Admin read delivery policy history"

COMMIT;

-- ============================================================================
-- ROLLBACK NOTES
-- ============================================================================

-- This rollback script is intentionally minimal because:
--
-- 1. SECURITY FIXES should not be reverted unless absolutely necessary
--    - RLS should remain enabled on tables
--    - search_path fixes should remain in place
--
-- 2. PERFORMANCE OPTIMIZATIONS are backward compatible
--    - The SELECT wrapper changes don't alter functionality
--    - They only improve query performance
--
-- If you need to fully revert this migration:
-- 1. Restore database from backup taken before migration
-- 2. OR manually restore original function/policy definitions from git history
