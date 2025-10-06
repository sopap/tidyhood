import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getServiceClient } from '@/lib/db';
import type { TransitionRequest, TransitionResponse } from '@/types/cleaningOrders';

/**
 * POST /api/orders/[id]/transition
 * 
 * Unified status transition endpoint for both LAUNDRY and CLEANING orders.
 * Calls the Supabase RPC function transition_order_status which handles
 * service-aware validation and audit logging.
 * 
 * Authorization: Validates session and derives actor role
 * Side effects: May trigger notifications, webhooks, analytics events
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Validate session
    const user = await requireAuth();

    // 2. Parse request body
    const body: TransitionRequest = await req.json();
    const { action, metadata = {} } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    // 3. Initialize Supabase client
    const supabase = getServiceClient();

    // 4. Fetch order to determine service type (needed for side effects)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, service_type, status, partner_id')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // 5. Determine actor role
    let actorRole: 'customer' | 'partner' | 'admin' | 'system' = 'customer';
    
    // Check if user is the customer
    if (order.user_id === user.id) {
      actorRole = 'customer';
    } 
    // Check if user is assigned partner
    else if (order.partner_id) {
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('id', order.partner_id)
        .eq('user_id', user.id)
        .single();
      
      if (partner) {
        actorRole = 'partner';
      }
    }

    // Check if user is admin (role is on user object from requireAuth)
    if (user.role === 'admin') {
      actorRole = 'admin';
    }

    // 6. Call RPC transition function
    const { data: result, error: rpcError } = await supabase
      .rpc('transition_order_status', {
        p_order_id: params.id,
        p_action: action,
        p_actor_id: user.id,
        p_actor_role: actorRole,
        p_meta: metadata
      });

    if (rpcError) {
      console.error('[Transition API] RPC error:', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Transition failed' },
        { status: 400 }
      );
    }

    // RPC function returns jsonb with success/error
    const response = result as TransitionResponse;

    if (!response.success) {
      return NextResponse.json(
        {
          error: response.error || 'Transition failed',
          hint: response.hint,
          detail: response.detail
        },
        { status: 400 }
      );
    }

    // 7. Trigger side effects based on service type and action
    await triggerSideEffects(order.service_type, action, order, actorRole, supabase);

    // 8. Return success response
    return NextResponse.json({
      success: true,
      order_id: response.order_id,
      old_status: response.old_status,
      new_status: response.new_status,
      message: response.message
    });

  } catch (error) {
    console.error('[Transition API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Trigger service-specific side effects after successful transition
 */
async function triggerSideEffects(
  serviceType: string,
  action: string,
  order: any,
  actorRole: string,
  supabase: any
) {
  try {
    if (serviceType === 'CLEANING') {
      switch (action) {
        case 'assign':
          // Notify partner of assignment
          // TODO: Send SMS/email to partner
          console.log(`[Side Effect] Notify partner ${order.partner_id} of assignment`);
          break;

        case 'en_route':
          // Notify customer that partner is on the way
          // TODO: Send SMS to customer
          console.log(`[Side Effect] Notify customer ${order.user_id} - partner en route`);
          break;

        case 'complete':
          // Send rating/tip request
          // TODO: Schedule rating reminder
          console.log(`[Side Effect] Schedule rating request for order ${order.id}`);
          break;

        case 'open_dispute':
          // Alert admin team
          // TODO: Create admin notification
          console.log(`[Side Effect] Alert admin team - dispute opened on ${order.id}`);
          break;

        case 'resolve_dispute_refund':
          // Process refund via Stripe
          // TODO: Call Stripe refund API
          console.log(`[Side Effect] Process refund for order ${order.id}`);
          break;
      }
    } else if (serviceType === 'LAUNDRY') {
      switch (action) {
        case 'send_quote':
          // Send quote notification to customer
          console.log(`[Side Effect] Send quote notification for order ${order.id}`);
          break;

        case 'mark_delivered':
          // Send rating request
          console.log(`[Side Effect] Send rating request for order ${order.id}`);
          break;
      }
    }

    // Log to analytics (PostHog, Amplitude, etc.)
    // TODO: Integrate analytics
    console.log(`[Analytics] order_${action}`, {
      order_id: order.id,
      service_type: serviceType,
      actor_role: actorRole
    });

  } catch (error) {
    // Don't fail the request if side effects fail
    console.error('[Side Effects] Error:', error);
  }
}

/**
 * GET /api/orders/[id]/transition
 * 
 * Get available actions for an order based on current status and user role
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const supabase = getServiceClient();

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, service_type, status, partner_id')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Determine actor role (same logic as POST)
    let actorRole: 'customer' | 'partner' | 'admin' = 'customer';
    
    if (order.user_id === user.id) {
      actorRole = 'customer';
    } else if (order.partner_id) {
      const { data: partner } = await supabase
        .from('partners')
        .select('id')
        .eq('id', order.partner_id)
        .eq('user_id', user.id)
        .single();
      
      if (partner) {
        actorRole = 'partner';
      }
    }

    if (user.role === 'admin') {
      actorRole = 'admin';
    }

    // Call helper RPC to get valid actions
    const { data: actions, error: actionsError } = await supabase
      .rpc('get_valid_actions', {
        p_order_id: params.id,
        p_actor_role: actorRole
      });

    if (actionsError) {
      console.error('[Get Actions] RPC error:', actionsError);
      return NextResponse.json(
        { error: 'Failed to get actions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      order_id: params.id,
      status: order.status,
      service_type: order.service_type,
      actor_role: actorRole,
      available_actions: actions || []
    });

  } catch (error) {
    console.error('[Get Actions] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
