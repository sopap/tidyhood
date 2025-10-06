-- Migration 020: Cleaning Service Status System
-- Extends existing order_status enum with cleaning-specific statuses
-- Maintains backward compatibility with laundry flow
-- Creates unified transition function with service-aware validation

-- ============================================================================
-- PART 1: Extend Existing Enum
-- ============================================================================

-- Add new cleaning-specific status values
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'assigned';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'en_route';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'on_site';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'disputed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'cleaner_no_show';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'customer_no_show';

-- ============================================================================
-- PART 2: Add Columns for Cleaning Workflow
-- ============================================================================

ALTER TABLE orders
  -- Assignment tracking
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  
  -- Partner location tracking
  ADD COLUMN IF NOT EXISTS en_route_at timestamptz,
  ADD COLUMN IF NOT EXISTS on_site_at timestamptz,
  
  -- Work tracking (reuse existing started_at if present, else add)
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  
  -- Dispute management
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_type text CHECK (resolution_type IN ('refund', 'completed', 'dismissed')),
  
  -- Proof/evidence (photos, notes)
  ADD COLUMN IF NOT EXISTS proof jsonb DEFAULT '[]'::jsonb,
  
  -- No-show tracking
  ADD COLUMN IF NOT EXISTS no_show_reported_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_type text CHECK (no_show_type IN ('cleaner', 'customer'));

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_assigned_at ON orders(assigned_at) WHERE assigned_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_disputed ON orders(status) WHERE status = 'disputed';
CREATE INDEX IF NOT EXISTS idx_orders_cleaning_active ON orders(service_type, status) 
  WHERE service_type = 'CLEANING' AND status IN ('assigned', 'en_route', 'on_site', 'in_progress');

-- ============================================================================
-- PART 3: Order Events Audit Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  actor_role text NOT NULL CHECK (actor_role IN ('customer', 'partner', 'admin', 'system')),
  old_status order_status,
  new_status order_status NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_events_actor ON order_events(actor_id, created_at DESC);

COMMENT ON TABLE order_events IS 'Audit trail for all order status transitions';

-- ============================================================================
-- PART 4: Unified Transition Function (Service-Aware)
-- ============================================================================

CREATE OR REPLACE FUNCTION transition_order_status(
  p_order_id uuid,
  p_action text,
  p_actor_id uuid,
  p_actor_role text,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb AS $$
DECLARE
  v_order orders;
  v_old_status order_status;
  v_service_type text;
  v_result jsonb;
BEGIN
  -- Lock and fetch order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'order_not_found' USING HINT = 'Order ID does not exist';
  END IF;
  
  v_old_status := v_order.status;
  v_service_type := v_order.service_type;
  
  -- ========================================
  -- CLEANING SERVICE TRANSITIONS
  -- ========================================
  IF v_service_type = 'CLEANING' THEN
    CASE p_action
      WHEN 'assign' THEN
        IF v_old_status <> 'pending' THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Can only assign from pending status';
        END IF;
        IF NOT (p_meta ? 'partner_id') THEN
          RAISE EXCEPTION 'missing_parameter' USING HINT = 'partner_id required for assign action';
        END IF;
        v_order.status := 'assigned';
        v_order.partner_id := (p_meta->>'partner_id')::uuid;
        v_order.assigned_at := now();
        
      WHEN 'en_route' THEN
        IF v_old_status <> 'assigned' THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Can only go en route from assigned status';
        END IF;
        IF p_actor_role <> 'partner' THEN
          RAISE EXCEPTION 'unauthorized' USING HINT = 'Only partners can mark en route';
        END IF;
        v_order.status := 'en_route';
        v_order.en_route_at := now();
        
      WHEN 'arrive' THEN
        IF v_old_status <> 'en_route' THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Can only arrive from en route status';
        END IF;
        IF p_actor_role <> 'partner' THEN
          RAISE EXCEPTION 'unauthorized' USING HINT = 'Only partners can mark arrival';
        END IF;
        v_order.status := 'on_site';
        v_order.on_site_at := now();
        
      WHEN 'start' THEN
        IF v_old_status NOT IN ('on_site', 'assigned', 'en_route') THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Can only start from on_site, assigned, or en_route';
        END IF;
        IF p_actor_role <> 'partner' THEN
          RAISE EXCEPTION 'unauthorized' USING HINT = 'Only partners can start work';
        END IF;
        v_order.status := 'in_progress';
        v_order.started_at := now();
        
      WHEN 'complete' THEN
        IF v_old_status <> 'in_progress' THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Can only complete from in_progress status';
        END IF;
        IF p_actor_role NOT IN ('partner', 'admin') THEN
          RAISE EXCEPTION 'unauthorized' USING HINT = 'Only partners or admins can complete work';
        END IF;
        v_order.status := 'completed';
        v_order.completed_at := now();
        -- Store proof if provided
        IF p_meta ? 'proof' THEN
          v_order.proof := p_meta->'proof';
        END IF;
        
      WHEN 'cancel' THEN
        IF v_old_status IN ('in_progress', 'completed', 'refunded') THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Cannot cancel orders that are in progress or completed';
        END IF;
        v_order.status := 'canceled';
        v_order.cancellation_reason := COALESCE(p_meta->>'reason', '');
        
      WHEN 'mark_cleaner_no_show' THEN
        IF v_old_status <> 'en_route' THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Can only mark no-show from en_route status';
        END IF;
        IF p_actor_role NOT IN ('customer', 'admin') THEN
          RAISE EXCEPTION 'unauthorized' USING HINT = 'Only customers or admins can report cleaner no-show';
        END IF;
        v_order.status := 'cleaner_no_show';
        v_order.no_show_reported_at := now();
        v_order.no_show_type := 'cleaner';
        
      WHEN 'mark_customer_no_show' THEN
        IF v_old_status <> 'en_route' THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Can only mark no-show from en_route status';
        END IF;
        IF p_actor_role NOT IN ('partner', 'admin') THEN
          RAISE EXCEPTION 'unauthorized' USING HINT = 'Only partners or admins can report customer no-show';
        END IF;
        v_order.status := 'customer_no_show';
        v_order.no_show_reported_at := now();
        v_order.no_show_type := 'customer';
        
      WHEN 'open_dispute' THEN
        IF v_old_status NOT IN ('in_progress', 'completed') THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Can only dispute in_progress or completed orders';
        END IF;
        IF p_actor_role <> 'customer' THEN
          RAISE EXCEPTION 'unauthorized' USING HINT = 'Only customers can open disputes';
        END IF;
        -- Check if completed order is within dispute window (7 days)
        IF v_old_status = 'completed' AND v_order.completed_at < (now() - INTERVAL '7 days') THEN
          RAISE EXCEPTION 'dispute_window_expired' USING HINT = 'Can only dispute within 7 days of completion';
        END IF;
        v_order.status := 'disputed';
        v_order.disputed_at := now();
        v_order.dispute_reason := COALESCE(p_meta->>'reason', '');
        
      WHEN 'resolve_dispute_complete' THEN
        IF v_old_status <> 'disputed' THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Can only resolve from disputed status';
        END IF;
        IF p_actor_role <> 'admin' THEN
          RAISE EXCEPTION 'unauthorized' USING HINT = 'Only admins can resolve disputes';
        END IF;
        v_order.status := 'completed';
        v_order.resolved_at := now();
        v_order.resolution_type := 'completed';
        
      WHEN 'resolve_dispute_refund' THEN
        IF v_old_status <> 'disputed' THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Can only resolve from disputed status';
        END IF;
        IF p_actor_role <> 'admin' THEN
          RAISE EXCEPTION 'unauthorized' USING HINT = 'Only admins can resolve disputes';
        END IF;
        v_order.status := 'refunded';
        v_order.resolved_at := now();
        v_order.resolution_type := 'refund';
        
      ELSE
        RAISE EXCEPTION 'unknown_action' USING HINT = format('Action "%s" not recognized for cleaning service', p_action);
    END CASE;
    
  -- ========================================
  -- LAUNDRY SERVICE TRANSITIONS (Existing)
  -- ========================================
  ELSIF v_service_type = 'LAUNDRY' THEN
    CASE p_action
      WHEN 'mark_pending_pickup' THEN
        IF v_old_status <> 'pending' THEN 
          RAISE EXCEPTION 'invalid_transition';
        END IF;
        v_order.status := 'pending_pickup';
        
      WHEN 'mark_at_facility' THEN
        IF v_old_status <> 'pending_pickup' THEN 
          RAISE EXCEPTION 'invalid_transition';
        END IF;
        v_order.status := 'at_facility';
        
      WHEN 'send_quote' THEN
        IF v_old_status <> 'at_facility' THEN 
          RAISE EXCEPTION 'invalid_transition';
        END IF;
        v_order.status := 'awaiting_payment';
        v_order.quoted_at := now();
        IF p_meta ? 'quote_cents' THEN
          v_order.quote_cents := (p_meta->>'quote_cents')::integer;
        END IF;
        IF p_meta ? 'actual_weight_lbs' THEN
          v_order.actual_weight_lbs := (p_meta->>'actual_weight_lbs')::numeric;
        END IF;
        
      WHEN 'mark_paid' THEN
        IF v_old_status <> 'awaiting_payment' THEN 
          RAISE EXCEPTION 'invalid_transition';
        END IF;
        v_order.status := 'paid_processing';
        v_order.paid_at := COALESCE(v_order.paid_at, now());
        
      WHEN 'start_processing' THEN
        IF v_old_status <> 'paid_processing' THEN 
          RAISE EXCEPTION 'invalid_transition';
        END IF;
        v_order.status := 'in_progress';
        
      WHEN 'mark_out_for_delivery' THEN
        IF v_old_status <> 'in_progress' THEN 
          RAISE EXCEPTION 'invalid_transition';
        END IF;
        v_order.status := 'out_for_delivery';
        
      WHEN 'mark_delivered' THEN
        IF v_old_status <> 'out_for_delivery' THEN 
          RAISE EXCEPTION 'invalid_transition';
        END IF;
        v_order.status := 'delivered';
        v_order.completed_at := now();
        
      WHEN 'cancel' THEN
        IF v_old_status IN ('paid_processing', 'in_progress', 'out_for_delivery', 'delivered') THEN 
          RAISE EXCEPTION 'invalid_transition' USING HINT = 'Cannot cancel paid or processing laundry orders';
        END IF;
        v_order.status := 'canceled';
        v_order.cancellation_reason := COALESCE(p_meta->>'reason', '');
        
      ELSE
        RAISE EXCEPTION 'unknown_action' USING HINT = format('Action "%s" not recognized for laundry service', p_action);
    END CASE;
    
  ELSE
    RAISE EXCEPTION 'unsupported_service' USING HINT = format('Service type "%s" not supported', v_service_type);
  END IF;
  
  -- ========================================
  -- UPDATE ORDER & CREATE AUDIT EVENT
  -- ========================================
  
  UPDATE orders SET
    status = v_order.status,
    partner_id = v_order.partner_id,
    assigned_at = v_order.assigned_at,
    en_route_at = v_order.en_route_at,
    on_site_at = v_order.on_site_at,
    started_at = v_order.started_at,
    completed_at = v_order.completed_at,
    disputed_at = v_order.disputed_at,
    dispute_reason = v_order.dispute_reason,
    resolved_at = v_order.resolved_at,
    resolution_type = v_order.resolution_type,
    proof = v_order.proof,
    no_show_reported_at = v_order.no_show_reported_at,
    no_show_type = v_order.no_show_type,
    cancellation_reason = v_order.cancellation_reason,
    quoted_at = v_order.quoted_at,
    quote_cents = v_order.quote_cents,
    actual_weight_lbs = v_order.actual_weight_lbs,
    paid_at = v_order.paid_at,
    updated_at = now()
  WHERE id = p_order_id;
  
  -- Create audit event
  INSERT INTO order_events (order_id, action, actor_id, actor_role, old_status, new_status, metadata)
  VALUES (p_order_id, p_action, p_actor_id, p_actor_role, v_old_status, v_order.status, p_meta);
  
  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'old_status', v_old_status,
    'new_status', v_order.status,
    'action', p_action,
    'message', format('Order %s: %s → %s', p_action, v_old_status, v_order.status)
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'hint', COALESCE(PG_EXCEPTION_HINT, ''),
      'detail', COALESCE(PG_EXCEPTION_DETAIL, '')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION transition_order_status IS 'Unified order status transition with service-aware validation and audit trail';

-- ============================================================================
-- PART 5: RLS Policies
-- ============================================================================

-- Drop existing if any, recreate
DROP POLICY IF EXISTS order_events_select_policy ON order_events;
DROP POLICY IF EXISTS order_events_insert_system ON order_events;

-- Customers can view events for their orders
CREATE POLICY order_events_select_policy ON order_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_events.order_id 
      AND orders.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM partners
      WHERE partners.user_id = auth.uid()
      AND partners.id IN (SELECT partner_id FROM orders WHERE orders.id = order_events.order_id)
    )
  );

-- System/RPC can insert events (SECURITY DEFINER handles this)
CREATE POLICY order_events_insert_system ON order_events
  FOR INSERT
  WITH CHECK (true); -- Secured by SECURITY DEFINER function

-- Grant execute permission on transition function
GRANT EXECUTE ON FUNCTION transition_order_status TO authenticated;

-- ============================================================================
-- PART 6: Helper Functions
-- ============================================================================

-- Get valid actions for current order state
CREATE OR REPLACE FUNCTION get_valid_actions(p_order_id uuid, p_actor_role text)
RETURNS text[] AS $$
DECLARE
  v_order orders;
  v_actions text[];
BEGIN
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN ARRAY[]::text[]; END IF;
  
  IF v_order.service_type = 'CLEANING' THEN
    CASE v_order.status
      WHEN 'pending' THEN
        IF p_actor_role = 'admin' THEN
          v_actions := ARRAY['assign', 'cancel'];
        ELSIF p_actor_role = 'customer' THEN
          v_actions := ARRAY['cancel'];
        END IF;
      WHEN 'assigned' THEN
        IF p_actor_role = 'partner' THEN
          v_actions := ARRAY['en_route'];
        ELSIF p_actor_role = 'admin' THEN
          v_actions := ARRAY['en_route', 'cancel'];
        ELSIF p_actor_role = 'customer' THEN
          v_actions := ARRAY['cancel'];
        END IF;
      WHEN 'en_route' THEN
        IF p_actor_role = 'partner' THEN
          v_actions := ARRAY['arrive'];
        ELSIF p_actor_role = 'customer' THEN
          v_actions := ARRAY['mark_cleaner_no_show'];
        ELSIF p_actor_role = 'admin' THEN
          v_actions := ARRAY['arrive', 'mark_cleaner_no_show', 'mark_customer_no_show'];
        END IF;
      WHEN 'on_site' THEN
        IF p_actor_role IN ('partner', 'admin') THEN
          v_actions := ARRAY['start'];
        END IF;
      WHEN 'in_progress' THEN
        IF p_actor_role = 'partner' THEN
          v_actions := ARRAY['complete'];
        ELSIF p_actor_role = 'customer' THEN
          v_actions := ARRAY['open_dispute'];
        ELSIF p_actor_role = 'admin' THEN
          v_actions := ARRAY['complete', 'open_dispute'];
        END IF;
      WHEN 'completed' THEN
        IF p_actor_role = 'customer' AND v_order.completed_at >= (now() - INTERVAL '7 days') THEN
          v_actions := ARRAY['open_dispute'];
        END IF;
      WHEN 'disputed' THEN
        IF p_actor_role = 'admin' THEN
          v_actions := ARRAY['resolve_dispute_complete', 'resolve_dispute_refund'];
        END IF;
      ELSE
        v_actions := ARRAY[]::text[];
    END CASE;
  ELSIF v_order.service_type = 'LAUNDRY' THEN
    -- Laundry actions (simplified - extend as needed)
    CASE v_order.status
      WHEN 'pending' THEN v_actions := ARRAY['mark_pending_pickup', 'cancel'];
      WHEN 'pending_pickup' THEN v_actions := ARRAY['mark_at_facility', 'cancel'];
      WHEN 'at_facility' THEN v_actions := ARRAY['send_quote', 'cancel'];
      WHEN 'awaiting_payment' THEN v_actions := ARRAY['mark_paid', 'cancel'];
      WHEN 'paid_processing' THEN v_actions := ARRAY['start_processing'];
      WHEN 'in_progress' THEN v_actions := ARRAY['mark_out_for_delivery'];
      WHEN 'out_for_delivery' THEN v_actions := ARRAY['mark_delivered'];
      ELSE v_actions := ARRAY[]::text[];
    END CASE;
  END IF;
  
  RETURN COALESCE(v_actions, ARRAY[]::text[]);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_valid_actions IS 'Returns list of valid actions for order based on current status and actor role';

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 020 complete: Cleaning status system added';
  RAISE NOTICE 'New statuses: assigned, en_route, on_site, disputed, refunded, cleaner_no_show, customer_no_show';
  RAISE NOTICE 'New function: transition_order_status() for unified state management';
  RAISE NOTICE 'Audit table: order_events tracks all transitions';
END $$;
