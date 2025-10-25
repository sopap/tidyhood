import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getServiceClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/[id]/link-account
 * 
 * Link a guest order to the authenticated user's account
 * Security: Verifies email matches the order's guest_email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    
    const { email } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    const db = getServiceClient();
    
    // Fetch the order
    const { data: order, error: fetchError } = await db
      .from('orders')
      .select('*')
      .eq('id', id)
      .is('user_id', null) // Must be a guest order
      .single();
    
    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Order not found or already linked' },
        { status: 404 }
      );
    }
    
    // Verify the email matches the guest email in address_snapshot
    const guestEmail = order.address_snapshot?.guest_email;
    
    if (!guestEmail || guestEmail.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match order guest email' },
        { status: 403 }
      );
    }
    
    // Verify the authenticated user's email matches
    const { data: profile } = await db
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();
    
    if (profile?.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Authenticated user email does not match' },
        { status: 403 }
      );
    }
    
    // Link the order to the user
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({
        user_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('user_id', null) // Ensure it's still a guest order (prevent race conditions)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error linking order:', updateError);
      return NextResponse.json(
        { error: 'Failed to link order to account' },
        { status: 500 }
      );
    }
    
    if (!updatedOrder) {
      return NextResponse.json(
        { error: 'Order was already linked or not found' },
        { status: 409 }
      );
    }
    
    // Create an order event for the linking
    await db.from('order_events').insert({
      order_id: id,
      actor: user.id,
      actor_role: 'user',
      event_type: 'guest_order_linked',
      payload_json: {
        linked_at: new Date().toISOString(),
        guest_email: guestEmail,
      },
    });
    
    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order successfully linked to your account',
    });
  } catch (error: any) {
    console.error('Error linking guest order:', error);
    
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to link order to account' },
      { status: 500 }
    );
  }
}
