import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: userId } = await params;
    const db = getServiceClient();
    
    // Fetch user profile
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('id, full_name, phone, role, created_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch email from auth.users
    const { data: authUser } = await db
      .from('auth.users')
      .select('email')
      .eq('id', userId)
      .single();

    // Fetch all orders for statistics
    const { data: orders } = await db
      .from('orders')
      .select('id, order_id, service_type, status, total_cents, created_at, slot_start')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Calculate statistics
    const totalOrders = orders?.length || 0;
    const deliveredOrders = orders?.filter(o => o.status === 'delivered') || [];
    const lifetimeValue = deliveredOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0) / 100;
    const avgOrderValue = deliveredOrders.length > 0 ? lifetimeValue / deliveredOrders.length : 0;
    
    // Get last order date
    const lastOrder = orders && orders.length > 0 ? orders[0].created_at : null;
    
    // Get favorite service
    const serviceCounts = orders?.reduce((acc, o) => {
      acc[o.service_type] = (acc[o.service_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    const favoriteService = Object.keys(serviceCounts).length > 0
      ? Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0][0]
      : 'None';

    // Get recent orders (5 most recent)
    const recentOrders = orders?.slice(0, 5).map(order => ({
      id: order.id,
      order_id: order.order_id,
      service_type: order.service_type,
      status: order.status,
      total_cents: order.total_cents,
      created_at: order.created_at,
      slot_start: order.slot_start
    })) || [];

    // Fetch saved addresses
    const { data: addresses } = await db
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    return NextResponse.json({
      user: {
        id: profile.id,
        name: profile.full_name || 'Unknown',
        email: authUser?.email || 'N/A',
        phone: profile.phone || 'N/A',
        role: profile.role,
        created_at: profile.created_at
      },
      stats: {
        total_orders: totalOrders,
        lifetime_value: lifetimeValue,
        avg_order_value: avgOrderValue,
        last_order: lastOrder,
        favorite_service: favoriteService
      },
      recent_orders: recentOrders,
      addresses: addresses || []
    });
  } catch (error) {
    console.error('User detail API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user details' },
      { status: 500 }
    );
  }
}
