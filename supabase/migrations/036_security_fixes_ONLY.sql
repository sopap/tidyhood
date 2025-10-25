-- Migration: Security Fixes Only (No Policy Changes)
-- Date: 2025-10-25
-- Description: Fixes critical security issues only
-- - Enables RLS on 2 tables
-- - Adds search_path to 15 functions
-- Note: Policy optimizations require manual verification of table schemas

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

CREATE OR REPLACE FUNCTION public.check_capacity_conflict(p_partner_id uuid, p_slot_start timestamp with time zone, p_slot_end timestamp with time zone, p_exclude_id uuid DEFAULT NULL::uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM capacity_calendar
    WHERE partner_id = p_partner_id AND id != COALESCE(p_exclude_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND ((slot_start <= p_slot_start AND slot_end > p_slot_start) OR (slot_start < p_slot_end AND slot_end >= p_slot_end) OR (slot_start >= p_slot_start AND slot_end <= p_slot_end))
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_order_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $function$
BEGIN
  IF NEW.order_id IS NULL THEN
    NEW.order_id := 'ORD-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_cancellation_policy(p_service_type text)
RETURNS cancellation_policies LANGUAGE plpgsql STABLE SET search_path = public, pg_temp
AS $function$
DECLARE
  policy cancellation_policies;
BEGIN
  SELECT * INTO policy FROM cancellation_policies WHERE service_type = p_service_type AND active = true LIMIT 1;
  RETURN policy;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_active_policy_with_version(p_service_type text)
RETURNS TABLE(id uuid, version integer, notice_hours integer, cancellation_fee_percent numeric, reschedule_notice_hours integer, reschedule_fee_percent numeric, allow_cancellation boolean, allow_rescheduling boolean)
LANGUAGE plpgsql STABLE SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN QUERY
  SELECT cp.id, cp.version, cp.notice_hours, cp.cancellation_fee_percent, cp.reschedule_notice_hours, cp.reschedule_fee_percent, cp.allow_cancellation, cp.allow_rescheduling
  FROM cancellation_policies cp WHERE cp.service_type = p_service_type AND cp.active = true LIMIT 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'phone', ''), 'user', NEW.created_at, NOW())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = COALESCE(NULLIF(profiles.full_name, ''), EXCLUDED.full_name), phone = COALESCE(NULLIF(profiles.phone, ''), EXCLUDED.phone), updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin');
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_guest_order(order_row orders)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN order_row.user_id IS NULL AND order_row.guest_email IS NOT NULL AND order_row.guest_phone IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'partner');
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_partner(user_id uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role = 'partner');
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_audit(p_actor_id uuid, p_actor_role text, p_action text, p_entity_type text, p_entity_id text, p_changes jsonb DEFAULT NULL::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  log_id BIGINT;
BEGIN
  INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, changes, ip_address, user_agent)
  VALUES (p_actor_id, p_actor_role, p_action, p_entity_type, p_entity_id, p_changes, p_ip_address, p_user_agent) RETURNING id INTO log_id;
  RETURN log_id::TEXT::UUID;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_delivery_policy_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $function$
BEGIN
  INSERT INTO delivery_time_policy_history (policy_id, service_type, standard_minimum_hours, rush_enabled, rush_early_pickup_hours, rush_late_pickup_hours, rush_cutoff_hour, same_day_earliest_hour, change_reason, changed_by)
  VALUES (NEW.id, NEW.service_type, NEW.standard_minimum_hours, NEW.rush_enabled, NEW.rush_early_pickup_hours, NEW.rush_late_pickup_hours, NEW.rush_cutoff_hour, NEW.same_day_earliest_hour, NEW.change_reason, NEW.updated_by);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_events (order_id, event_type, payload_json)
    VALUES (NEW.id, 'status_changed', jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'changed_at', NOW()));
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_policy_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $function$
BEGIN
  IF (OLD.policy_id IS DISTINCT FROM NEW.policy_id) OR (OLD.policy_version IS DISTINCT FROM NEW.policy_version) THEN
    INSERT INTO order_events (order_id, actor, actor_role, event_type, payload_json)
    VALUES (NEW.id, auth.uid(), 'system', 'POLICY_UPDATED', jsonb_build_object('old_policy_id', OLD.policy_id, 'new_policy_id', NEW.policy_id, 'old_version', OLD.policy_version, 'new_version', NEW.policy_version));
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_settings_change(p_table_name text, p_record_id uuid, p_action text, p_field_name text, p_old_value text, p_new_value text, p_changed_by uuid, p_change_reason text DEFAULT NULL::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO settings_audit_log (table_name, record_id, action, field_name, old_value, new_value, changed_by, change_reason, ip_address, user_agent)
  VALUES (p_table_name, p_record_id, p_action, p_field_name, p_old_value, p_new_value, p_changed_by, p_change_reason, p_ip_address, p_user_agent) RETURNING id INTO log_id;
  RETURN log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_order_with_version(p_order_id uuid, p_expected_version integer, p_updates jsonb)
RETURNS TABLE(success boolean, new_version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $function$
DECLARE
  v_new_version INT;
  v_current_version INT;
BEGIN
  SELECT version INTO v_current_version FROM orders WHERE id = p_order_id;
  IF v_current_version IS NULL OR v_current_version != p_expected_version THEN
    RETURN QUERY SELECT false, COALESCE(v_current_version, 0);
    RETURN;
  END IF;
  UPDATE orders SET status = COALESCE((p_updates->>'status')::TEXT, status), quote_cents = COALESCE((p_updates->>'quote_cents')::INT, quote_cents), paid_at = COALESCE((p_updates->>'paid_at')::TIMESTAMPTZ, paid_at), payment_error = COALESCE((p_updates->>'payment_error')::TEXT, payment_error), requires_approval = COALESCE((p_updates->>'requires_approval')::BOOLEAN, requires_approval), version = version + 1, updated_at = NOW()
  WHERE id = p_order_id AND version = p_expected_version RETURNING version INTO v_new_version;
  IF FOUND THEN
    RETURN QUERY SELECT true, v_new_version;
  ELSE
    RETURN QUERY SELECT false, v_current_version;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

COMMIT;

-- ============================================================================
-- NOTE: Policy optimizations (Part 3) have been excluded
-- ============================================================================
-- The performance optimizations for RLS policies require verification of
-- exact column names in each table. To add those optimizations manually:
--
-- 1. Verify the column name used for user identification in each table
-- 2. For each policy, wrap auth.uid() in (SELECT auth.uid())
--    Example: user_id = auth.uid() becomes user_id = (SELECT auth.uid())
--
-- This simple change provides 10-100x performance improvement on large queries
