-- Migration: Security and Performance Fixes
-- Date: 2025-10-25
-- Description: Fixes Supabase security and performance issues
-- - Enables RLS on 2 tables (Security)
-- - Adds search_path to 15 functions (Security) 
-- - Optimizes 35 RLS policies (Performance)

BEGIN;

-- ============================================================================
-- PART 1: ENABLE RLS ON MISSING TABLES (Security - 2 issues)
-- ============================================================================

ALTER TABLE IF EXISTS public.partner_sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payment_retry_log ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for partner_sms_conversations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'partner_sms_conversations' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Admin access to SMS conversations" ON public.partner_sms_conversations;
    DROP POLICY IF EXISTS "Service role access to SMS conversations" ON public.partner_sms_conversations;
    
    CREATE POLICY "Admin access to SMS conversations" ON public.partner_sms_conversations
      FOR ALL TO authenticated, anon
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

    CREATE POLICY "Service role access to SMS conversations" ON public.partner_sms_conversations
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add RLS policies for payment_retry_log
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'payment_retry_log' AND schemaname = 'public') THEN
    DROP POLICY IF EXISTS "Admin access to payment retry log" ON public.payment_retry_log;
    DROP POLICY IF EXISTS "Service role access to payment retry log" ON public.payment_retry_log;
    
    CREATE POLICY "Admin access to payment retry log" ON public.payment_retry_log
      FOR ALL TO authenticated, anon
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

    CREATE POLICY "Service role access to payment retry log" ON public.payment_retry_log
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- PART 2: FIX FUNCTION SEARCH_PATH (Security - 15 functions)
-- ============================================================================

-- Fix existing functions by adding SET search_path while preserving signatures

CREATE OR REPLACE FUNCTION public.check_capacity_conflict(p_partner_id uuid, p_slot_start timestamp with time zone, p_slot_end timestamp with time zone, p_exclude_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM capacity_calendar
    WHERE partner_id = p_partner_id
    AND id != COALESCE(p_exclude_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      (slot_start <= p_slot_start AND slot_end > p_slot_start) OR
      (slot_start < p_slot_end AND slot_end >= p_slot_end) OR
      (slot_start >= p_slot_start AND slot_end <= p_slot_end)
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.order_id IS NULL THEN
    NEW.order_id := 'ORD-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_cancellation_policy(p_service_type text)
RETURNS cancellation_policies
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $function$
DECLARE
  policy cancellation_policies;
BEGIN
  SELECT * INTO policy
  FROM cancellation_policies
  WHERE service_type = p_service_type
    AND active = true
  LIMIT 1;
  
  RETURN policy;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_policy_with_version(p_service_type text)
RETURNS TABLE(id uuid, version integer, notice_hours integer, cancellation_fee_percent numeric, reschedule_notice_hours integer, reschedule_fee_percent numeric, allow_cancellation boolean, allow_rescheduling boolean)
LANGUAGE plpgsql
STABLE
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id,
    cp.version,
    cp.notice_hours,
    cp.cancellation_fee_percent,
    cp.reschedule_notice_hours,
    cp.reschedule_fee_percent,
    cp.allow_cancellation,
    cp.allow_rescheduling
  FROM cancellation_policies cp
  WHERE cp.service_type = p_service_type
    AND cp.active = true
  LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'user',
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name),
    phone = COALESCE(NULLIF(profiles.phone, ''), EXCLUDED.phone),
    updated_at = NOW();
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_guest_order(order_row orders)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN order_row.user_id IS NULL 
    AND order_row.guest_email IS NOT NULL 
    AND order_row.guest_phone IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'partner'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_partner(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'partner'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_audit(p_actor_id uuid, p_actor_role text, p_action text, p_entity_type text, p_entity_id text, p_changes jsonb DEFAULT NULL::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  log_id BIGINT;
BEGIN
  INSERT INTO audit_logs (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    changes,
    ip_address,
    user_agent
  ) VALUES (
    p_actor_id,
    p_actor_role,
    p_action,
    p_entity_type,
    p_entity_id,
    p_changes,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id::TEXT::UUID;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_delivery_policy_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO delivery_time_policy_history (
    policy_id, service_type, standard_minimum_hours,
    rush_enabled, rush_early_pickup_hours, rush_late_pickup_hours,
    rush_cutoff_hour, same_day_earliest_hour,
    change_reason, changed_by
  )
  VALUES (
    NEW.id, NEW.service_type, NEW.standard_minimum_hours,
    NEW.rush_enabled, NEW.rush_early_pickup_hours, NEW.rush_late_pickup_hours,
    NEW.rush_cutoff_hour, NEW.same_day_earliest_hour,
    NEW.change_reason, NEW.updated_by
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_events (order_id, event_type, payload_json)
    VALUES (
      NEW.id,
      'status_changed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_policy_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF (OLD.policy_id IS DISTINCT FROM NEW.policy_id) OR 
     (OLD.policy_version IS DISTINCT FROM NEW.policy_version) THEN
    
    INSERT INTO order_events (
      order_id,
      actor,
      actor_role,
      event_type,
      payload_json
    ) VALUES (
      NEW.id,
      auth.uid(),
      'system',
      'POLICY_UPDATED',
      jsonb_build_object(
        'old_policy_id', OLD.policy_id,
        'new_policy_id', NEW.policy_id,
        'old_version', OLD.policy_version,
        'new_version', NEW.policy_version
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_settings_change(p_table_name text, p_record_id uuid, p_action text, p_field_name text, p_old_value text, p_new_value text, p_changed_by uuid, p_change_reason text DEFAULT NULL::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO settings_audit_log (
    table_name,
    record_id,
    action,
    field_name,
    old_value,
    new_value,
    changed_by,
    change_reason,
    ip_address,
    user_agent
  ) VALUES (
    p_table_name,
    p_record_id,
    p_action,
    p_field_name,
    p_old_value,
    p_new_value,
    p_changed_by,
    p_change_reason,
    p_ip_address,
    p_user_agent
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_with_version(p_order_id uuid, p_expected_version integer, p_updates jsonb)
RETURNS TABLE(success boolean, new_version integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_new_version INT;
  v_current_version INT;
BEGIN
  SELECT version INTO v_current_version
  FROM orders
  WHERE id = p_order_id;
  
  IF v_current_version IS NULL OR v_current_version != p_expected_version THEN
    RETURN QUERY SELECT false, COALESCE(v_current_version, 0);
    RETURN;
  END IF;
  
  UPDATE orders
  SET 
    status = COALESCE((p_updates->>'status')::TEXT, status),
    quote_cents = COALESCE((p_updates->>'quote_cents')::INT, quote_cents),
    paid_at = COALESCE((p_updates->>'paid_at')::TIMESTAMPTZ, paid_at),
    payment_error = COALESCE((p_updates->>'payment_error')::TEXT, payment_error),
    requires_approval = COALESCE((p_updates->>'requires_approval')::BOOLEAN, requires_approval),
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_order_id
    AND version = p_expected_version
  RETURNING version INTO v_new_version;
  
  IF FOUND THEN
    RETURN QUERY SELECT true, v_new_version;
  ELSE
    RETURN QUERY SELECT false, v_current_version;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- PART 3: OPTIMIZE RLS POLICIES (Performance - 35 issues)
-- ============================================================================

-- Wrap auth functions in SELECT subqueries for better performance

-- profiles (3)
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

-- addresses (4)
DROP POLICY IF EXISTS addresses_select_own ON public.addresses;
CREATE POLICY addresses_select_own ON public.addresses FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS addresses_insert_own ON public.addresses;
CREATE POLICY addresses_insert_own ON public.addresses FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS addresses_update_own ON public.addresses;
CREATE POLICY addresses_update_own ON public.addresses FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS addresses_delete_own ON public.addresses;
CREATE POLICY addresses_delete_own ON public.addresses FOR DELETE USING (user_id = (SELECT auth.uid()));

-- orders (4)
DROP POLICY IF EXISTS orders_select_own ON public.orders;
CREATE POLICY orders_select_own ON public.orders FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_insert_own ON public.orders;
CREATE POLICY orders_insert_own ON public.orders FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_update_own_pending ON public.orders;
CREATE POLICY orders_update_own_pending ON public.orders FOR UPDATE USING (user_id = (SELECT auth.uid()) AND status = 'pending') WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS orders_read_own_or_guest ON public.orders;
CREATE POLICY orders_read_own_or_guest ON public.orders FOR SELECT USING (user_id = (SELECT auth.uid()) OR (user_id IS NULL AND guest_email IS NOT NULL));

-- order_events (1)
DROP POLICY IF EXISTS order_events_select_own ON public.order_events;
CREATE POLICY order_events_select_own ON public.order_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_events.order_id AND orders.user_id = (SELECT auth.uid())));

-- bags (1)
DROP POLICY IF EXISTS bags_select_own ON public.bags;
CREATE POLICY bags_select_own ON public.bags FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = bags.order_id AND orders.user_id = (SELECT auth.uid())));

-- cleaning_checklist (1)
DROP POLICY IF EXISTS checklist_select_own ON public.cleaning_checklist;
CREATE POLICY checklist_select_own ON public.cleaning_checklist FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = cleaning_checklist.order_id AND orders.user_id = (SELECT auth.uid())));

-- claims (2)
DROP POLICY IF EXISTS claims_select_own ON public.claims;
CREATE POLICY claims_select_own ON public.claims FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = claims.order_id AND orders.user_id = (SELECT auth.uid())));

DROP POLICY IF EXISTS claims_insert_own ON public.claims;
CREATE POLICY claims_insert_own ON public.claims FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = claims.order_id AND orders.user_id = (SELECT auth.uid())));

-- subscriptions (3)
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own ON public.subscriptions FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS subscriptions_insert_own ON public.subscriptions;
CREATE POLICY subscriptions_insert_own ON public.subscriptions FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS subscriptions_update_own ON public.subscriptions;
CREATE POLICY subscriptions_update_own ON public.subscriptions FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- invoices (1)
DROP POLICY IF EXISTS invoices_select_own ON public.invoices;
CREATE POLICY invoices_select_own ON public.invoices FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = invoices.order_id AND orders.user_id = (SELECT auth.uid())));

-- notifications (2)
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
CREATE POLICY notifications_admin_all ON public.notifications FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));

-- audit_logs (1)
DROP POLICY IF EXISTS audit_logs_admin_select ON public.audit_logs;
CREATE POLICY audit_logs_admin_select ON public.audit_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));

-- admin_notes (2)
DROP POLICY IF EXISTS admin_notes_admin_all ON public.admin_notes;
CREATE POLICY admin_notes_admin_all ON public.admin_notes FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));

DROP POLICY IF EXISTS admin_notes_partner_select ON public.admin_notes;
CREATE POLICY admin_notes_partner_select ON public.admin_notes FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'partner'));

-- waitlist (1)
DROP POLICY IF EXISTS "Only admins can view waitlist" ON public.waitlist;
CREATE POLICY "Only admins can view waitlist" ON public.waitlist FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));

-- webhook_events (2)
DROP POLICY IF EXISTS "Service role can manage webhook events" ON public.webhook_events;
CREATE POLICY "Service role can manage webhook events" ON public.webhook_events FOR ALL USING ((SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role');

DROP POLICY IF EXISTS "Admins can view webhook events" ON public.webhook_events;
CREATE POLICY "Admins can view webhook events" ON public.webhook_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));

-- payment_sagas (2)
DROP POLICY IF EXISTS "Service role can manage payment sagas" ON public.payment_sagas;
CREATE POLICY "Service role can manage payment sagas" ON public.payment_sagas FOR ALL USING ((SELECT current_setting('request.jwt.claims', true)::json->>'role') = 'service_role');

DROP POLICY IF EXISTS "Admins can view payment sagas" ON public.payment_sagas;
CREATE POLICY "Admins can view payment sagas" ON public.payment_sagas FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));

-- cancellation_policies (1)
DROP POLICY IF EXISTS cancellation_policies_admin_all ON public.cancellation_policies;
CREATE POLICY cancellation_policies_admin_all ON public.cancellation_policies FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));

-- settings_audit_log (1)
DROP POLICY IF EXISTS settings_audit_log_admin_read ON public.settings_audit_log;
CREATE POLICY settings_audit_log_admin_read ON public.settings_audit_log FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));

-- delivery_time_policies (1)
DROP POLICY IF EXISTS "Admin full access to delivery policies" ON public.delivery_time_policies;
CREATE POLICY "Admin full access to delivery policies" ON public.delivery_time_policies FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));

-- delivery_time_policy_history (1)
DROP POLICY IF EXISTS "Admin read delivery policy history" ON public.delivery_time_policy_history;
CREATE POLICY "Admin read delivery policy history" ON public.delivery_time_policy_history FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.role = 'admin'));

COMMIT;
