import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getServiceClient } from '@/lib/db';
import { handleApiError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

// GET /api/partner/orders/[id] - Get partner order detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const db = getServiceClient();
    
    // Verify user is a partner or admin
    if (user.role !== 'partner' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Partner access required' },
        { status: 403 }
      );
    }
    
    const orderId = params.id;
    
    // Fetch order with related data
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // If partner (not admin), verify they own this order
    if (user.role === 'partner') {
      const { data: partner } = await db
        .from('partners')
        .select('id')
        .or(`contact_email.eq.${user.email},profile_id.eq.${user.id}`)
        .single();
      
      if (!partner || order.partner_id !== partner.id) {
        return NextResponse.json(
          { error: 'Order not found or not accessible' },
          { status: 404 }
        );
      }
    }
    
    // Fetch customer profile
    const { data: customer } = await db
      .from('profiles')
      .select('id, full_name, phone')
      .eq('id', order.user_id)
      .single();
    
    // Fetch customer email from auth.users
    const { data: authUser } = await db
      .from('auth.users')
      .select('email')
      .eq('id', order.user_id)
      .single();
    
    // Fetch service address
    const { data: address } = await db
      .from('user_addresses')
      .select('*')
      .eq('id', order.address_id)
      .single();
    
    // Fetch order history/audit log
    const { data: history } = await db
      .from('order_audit_log')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    
    // Fetch delivery slots if available
    let pickupSlot = null;
    let deliverySlot = null;
    
    if (order.pickup_slot_id) {
      const { data } = await db
        .from('delivery_slots')
        .select('*')
        .eq('id', order.pickup_slot_id)
        .single();
      pickupSlot = data;
    }
    
    if (order.delivery_slot_id) {
      const { data } = await db
        .from('delivery_slots')
        .select('*')
        .eq('id', order.delivery_slot_id)
        .single();
      deliverySlot = data;
    }
    
    // Build comprehensive response
    return NextResponse.json({
      order: {
        ...order,
        customer: customer
          ? {
              id: customer.id,
              name: customer.full_name || 'Unknown',
              email: authUser?.email || 'N/A',
              phone: customer.phone || 'N/A'
            }
          : null,
        address: address || null,
        pickupSlot: pickupSlot || null,
        deliverySlot: deliverySlot || null,
        history: history || []
      }
    });
  } catch (error) {
    console.error('Partner order detail GET error:', error);
    const apiError = handleApiError(error);
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.statusCode }
    );
  }
}
