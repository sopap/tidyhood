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

    // Fetch email from auth using admin API
    const { data: { user: authUser }, error: authError } = await db.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('Auth user fetch error:', authError);
    }

    // Fetch all orders for statistics
    const { data: orders, error: ordersError } = await db
      .from('orders')
      .select('id, service_type, status, total_cents, quote_cents, created_at, slot_start')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('Orders fetch error:', ordersError);
    }

    // Calculate statistics - count completed/delivered orders for revenue
    // Use quote_cents (final quoted amount) if available, otherwise fall back to total_cents (estimate)
    const totalOrders = orders?.length || 0;
    const completedOrders = orders?.filter(o => 
      o.status === 'delivered' || o.status === 'completed'
    ) || [];
    const lifetimeValue = completedOrders.reduce((sum, o) => {
      const actualAmount = o.quote_cents || o.total_cents || 0;
      return sum + actualAmount;
    }, 0) / 100;
    const avgOrderValue = completedOrders.length > 0 ? lifetimeValue / completedOrders.length : 0;
    
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
      service_type: order.service_type,
      status: order.status,
      total_cents: order.quote_cents || order.total_cents,
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
        name: profile.full_name || authUser?.user_metadata?.full_name || 'Unknown',
        email: authUser?.email || 'N/A',
        phone: profile.phone || authUser?.user_metadata?.phone || 'N/A',
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
