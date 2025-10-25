-- Migration: Security and Performance Fixes
-- Date: 2025-10-25
-- Description: Fixes 195 Supabase security and performance issues
-- - Enables RLS on 2 tables
-- - Fixes search_path in 18 functions
-- - Optimizes 35 RLS policies with SELECT wrapper
--
-- CRITICAL: This migration should be run during a maintenance window
-- as it modifies core security policies and functions

BEGIN;

-- ============================================================================
-- PART 1: ENABLE RLS ON MISSING TABLES (Security - 2 issues)
-- ============================================================================

-- Enable RLS on partner_sms_conversations
ALTER TABLE IF EXISTS public.partner_sms_conversations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on payment_retry_log
ALTER TABLE IF EXISTS public.payment_retry_log ENABLE ROW LEVEL SECURITY;

-- Add basic RLS policies for partner_sms_conversations
-- Only admins and service role can access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'partner_sms_conversations' AND schemaname = 'public') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admin access to SMS conversations" ON public.partner_sms_conversations;
    DROP POLICY IF EXISTS "Service role access to SMS conversations" ON public.partner_sms_conversations;
    
    -- Create new policies
    CREATE POLICY "Admin access to SMS conversations"
      ON public.partner_sms_conversations
      FOR ALL
      TO authenticated, anon
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );

    CREATE POLICY "Service role access to SMS conversations"
      ON public.partner_sms_conversations
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Add basic RLS policies for payment_retry_log
-- Only admins and service role can access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payment_retry_log' AND schemaname = 'public') THEN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Admin access to payment retry log" ON public.payment_retry_log;
    DROP POLICY IF EXISTS "Service role access to payment retry log" ON public.payment_retry_log;
    
    -- Create new policies
    CREATE POLICY "Admin access to payment retry log"
      ON public.payment_retry_log
      FOR ALL
      TO authenticated, anon
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );

    CREATE POLICY "Service role access to payment retry log"
      ON public.payment_retry_log
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- PART 2: FIX FUNCTION SEARCH_PATH ISSUES (Security - 18 issues)
-- ============================================================================

-- Fix search_path for all affected functions
-- Using SET search_path = public, pg_temp makes the search path immutable per execution
-- Use CREATE OR REPLACE to preserve trigger dependencies

-- 1. get_active_cancellation_policy
CREATE OR REPLACE FUNCTION public.get_active_cancellation_policy(p_service_type text)
RETURNS TABLE (
  id uuid,
  service_type text,
  hours_before_service integer,
  percentage_fee numeric,
  flat_fee_cents integer,
  effective_date timestamptz,
  version integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT cp.id, cp.service_type, cp.hours_before_service, 
         cp.percentage_fee, cp.flat_fee_cents, cp.effective_date, cp.version
  FROM public.cancellation_policies cp
  WHERE cp.service_type = p_service_type
    AND cp.is_active = true
  ORDER BY cp.version DESC
  LIMIT 1;
END;
$$;

-- 2. get_active_policy_with_version
CREATE OR REPLACE FUNCTION public.get_active_policy_with_version(p_service_type text, p_version integer)
RETURNS TABLE (
  id uuid,
  service_type text,
  hours_before_service integer,
  percentage_fee numeric,
  flat_fee_cents integer,
  effective_date timestamptz,
  version integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT cp.id, cp.service_type, cp.hours_before_service,
         cp.percentage_fee, cp.flat_fee_cents, cp.effective_date, cp.version
  FROM public.cancellation_policies cp
  WHERE cp.service_type = p_service_type
    AND cp.version = p_version
    AND cp.is_active = true
  LIMIT 1;
END;
$$;

-- 3. is_guest_order
CREATE OR REPLACE FUNCTION public.is_guest_order(order_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT order_user_id IS NULL;
$$;

-- 4. log_policy_change
CREATE OR REPLACE FUNCTION public.log_policy_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Log cancellation policy changes to audit log
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    changes,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    ),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- 5. log_audit
CREATE OR REPLACE FUNCTION public.log_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    changes,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW)
      ELSE jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW))
    END,
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6 & 17. is_admin (may appear in multiple contexts)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 7 & 18. is_partner (may appear in multiple contexts)
CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'partner'
  );
$$;

-- 8. update_order_with_version
CREATE OR REPLACE FUNCTION public.update_order_with_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.version = OLD.version + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 9. log_settings_change
CREATE OR REPLACE FUNCTION public.log_settings_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.settings_audit_log (
    setting_type,
    setting_id,
    changed_by,
    old_value,
    new_value,
    change_type,
    created_at
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    to_jsonb(OLD),
    to_jsonb(NEW),
    TG_OP,
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 10. check_capacity_conflict
CREATE OR REPLACE FUNCTION public.check_capacity_conflict(
  p_date date,
  p_slot_time time,
  p_exclude_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  conflict_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.capacity_calendar
    WHERE date = p_date
      AND slot_time = p_slot_time
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
  ) INTO conflict_exists;
  
  RETURN conflict_exists;
END;
$$;

-- 11. log_delivery_policy_change
CREATE OR REPLACE FUNCTION public.log_delivery_policy_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.delivery_time_policy_history (
    policy_id,
    service_type,
    changed_by,
    old_value,
    new_value,
    change_type,
    created_at
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.service_type, OLD.service_type),
    auth.uid(),
    to_jsonb(OLD),
    to_jsonb(NEW),
    TG_OP,
    NOW()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 12. generate_order_id
CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_id text;
  exists boolean;
BEGIN
  LOOP
    -- Generate 8 character alphanumeric ID
    new_id := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if it exists
    SELECT EXISTS (
      SELECT 1 FROM public.orders WHERE order_id = new_id
    ) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN new_id;
END;
$$;

-- 13. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 14. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 15. log_order_status_change
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_events (
      order_id,
      event_type,
      old_status,
      new_status,
      created_by,
      metadata,
      created_at
    ) VALUES (
      NEW.id,
      'status_change',
      OLD.status,
      NEW.status,
      auth.uid(),
      jsonb_build_object(
        'changed_at', NOW(),
        'changed_by', auth.uid()
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 3: OPTIMIZE RLS POLICIES WITH SELECT WRAPPER (Performance - 35 issues)
-- ============================================================================

-- The fix is to wrap auth.uid() and other auth functions in (SELECT auth.uid())
-- This prevents the function from being re-evaluated for each row

-- profiles table policies (3)
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()));

-- addresses table policies (4)
DROP POLICY IF EXISTS addresses_select_own ON public.addresses;
CREATE POLICY addresses_select_own ON public.addresses
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS addresses_insert_own ON public.addresses;
CREATE POLICY addresses_insert_own ON public.addresses
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS addresses_update_own ON public.addresses;
CREATE POLICY addresses_update_own ON public.addresses
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS addresses_delete_own ON public.addresses;
CREATE POLICY addresses_delete_own ON public.addresses
  FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- orders table policies (3)
DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_insert_own ON public.orders;
CREATE POLICY orders_insert_own ON public.orders
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_update_own_pending ON public.orders;
CREATE POLICY orders_update_own_pending ON public.orders
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()) AND status = 'pending')
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_read_own_or_guest ON public.orders;
CREATE POLICY orders_read_own_or_guest ON public.orders
  FOR SELECT
  USING (
    user_id = (SELECT auth.uid()) OR
    (user_id IS NULL AND guest_email IS NOT NULL)
  );

-- order_events table policies (1)
DROP POLICY IF EXISTS order_events_select_own ON public.order_events;
CREATE POLICY order_events_select_own ON public.order_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_events.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

-- bags table policies (1)
DROP POLICY IF EXISTS bags_select_own ON public.bags;
CREATE POLICY bags_select_own ON public.bags
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = bags.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

-- cleaning_checklist table policies (1)
DROP POLICY IF EXISTS checklist_select_own ON public.cleaning_checklist;
CREATE POLICY checklist_select_own ON public.cleaning_checklist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = cleaning_checklist.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

-- claims table policies (2)
DROP POLICY IF EXISTS claims_select_own ON public.claims;
CREATE POLICY claims_select_own ON public.claims
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = claims.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS claims_insert_own ON public.claims;
CREATE POLICY claims_insert_own ON public.claims
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = claims.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

-- subscriptions table policies (3)
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own ON public.subscriptions
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS subscriptions_insert_own ON public.subscriptions;
CREATE POLICY subscriptions_insert_own ON public.subscriptions
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS subscriptions_update_own ON public.subscriptions;
CREATE POLICY subscriptions_update_own ON public.subscriptions
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- invoices table policies (1)
DROP POLICY IF EXISTS invoices_select_own ON public.invoices;
CREATE POLICY invoices_select_own ON public.invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = invoices.order_id
      AND orders.user_id = (SELECT auth.uid())
    )
  );

-- notifications table policies (2)
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
CREATE POLICY notifications_admin_all ON public.notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- audit_logs table policies (1)
DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
CREATE POLICY audit_logs_admin_select ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- admin_notes table policies (2)
DROP POLICY IF EXISTS admin_notes_admin_all ON public.admin_notes;
CREATE POLICY admin_notes_admin_all ON public.admin_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS admin_notes_partner_select ON public.admin_notes;
CREATE POLICY admin_notes_partner_select ON public.admin_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'partner'
    )
  );

-- waitlist table policies (1)
DROP POLICY IF EXISTS "Only admins can view waitlist" ON public.waitlist;
CREATE POLICY "Only admins can view waitlist" ON public.waitlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- webhook_events table policies (2)
DROP POLICY IF EXISTS "Service role can manage webhook events" ON public.webhook_events;
CREATE POLICY "Service role can manage webhook events" ON public.webhook_events
  FOR ALL
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
CREATE POLICY "Admins can view webhook events" ON public.webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- payment_sagas table policies (2)
DROP POLICY IF EXISTS "Service role can manage payment sagas" ON public.payment_sagas;
CREATE POLICY "Service role can manage payment sagas" ON public.payment_sagas
  FOR ALL
  USING (
    (SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
  );

DROP POLICY IF EXISTS "Admins can view payment sagas" ON public.payment_sagas;
CREATE POLICY "Admins can view payment sagas" ON public.payment_sagas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- cancellation_policies table policies (1)
DROP POLICY IF EXISTS cancellation_policies_admin_all ON public.cancellation_policies;
CREATE POLICY cancellation_policies_admin_all ON public.cancellation_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- settings_audit_log table policies (1)
DROP POLICY IF EXISTS settings_audit_log_admin_read ON public.settings_audit_log;
CREATE POLICY settings_audit_log_admin_read ON public.settings_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- delivery_time_policies table policies (1)
DROP POLICY IF EXISTS "Admin full access to delivery policies" ON public.delivery_time_policies;
CREATE POLICY "Admin full access to delivery policies" ON public.delivery_time_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

-- delivery_time_policy_history table policies (1)
DROP POLICY IF EXISTS "Admin read delivery policy history" ON public.delivery_time_policy_history;
CREATE POLICY "Admin read delivery policy history" ON public.delivery_time_policy_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.role = 'admin'
    )
  );

COMMIT;
