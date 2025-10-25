import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[id]/guest
 * 
 * Fetch guest order details without authentication
 * Only returns orders where user_id IS NULL (guest orders)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getServiceClient();
    
    // Fetch order but only if it's a guest order (no user_id)
    const { data: order, error } = await db
      .from('orders')
      .select('*')
      .eq('id', id)
      .is('user_id', null) // Only guest orders
      .single();
    
    if (error || !order) {
      return NextResponse.json(
        { error: 'Order not found or not accessible' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching guest order:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    );
  }
}
