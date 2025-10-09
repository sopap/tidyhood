import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const sort = searchParams.get('sort') || 'newest';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const db = getServiceClient();
    
    // Base query
    let query = db
      .from('profiles')
      .select('id, full_name, phone, email, role, created_at', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Apply status filter (for now, just filter by role)
    if (status !== 'all') {
      query = query.eq('role', status);
    }

    // Apply sorting
    switch (sort) {
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'name':
        query = query.order('full_name', { ascending: true });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: profiles, error, count } = await query;

    if (error) throw error;

    // Get order counts and LTV for each user
    const userIds = profiles?.map(p => p.id) || [];
    
    // Fetch orders - fetch quote_cents for accurate revenue calculations
    const { data: orderStats } = await db
      .from('orders')
      .select('user_id, total_cents, quote_cents, status')
      .in('user_id', userIds);

    // Calculate stats per user
    const usersWithStats = profiles?.map(profile => {
      const userOrders = orderStats?.filter(o => o.user_id === profile.id) || [];
      const orderCount = userOrders.length;
      
      // Use quote_cents (final quoted amount) if available, otherwise fall back to total_cents (estimate)
      const lifetimeValue = userOrders
        .filter(o => o.status === 'delivered' || o.status === 'completed')
        .reduce((sum, o) => {
          const actualAmount = o.quote_cents || o.total_cents || 0;
          return sum + actualAmount;
        }, 0) / 100;

      // Use profile data directly - email is stored in profiles table
      const fullName = profile.full_name 
        || profile.email?.split('@')[0] 
        || 'Unknown';

      return {
        id: profile.id,
        name: fullName,
        email: profile.email || 'N/A',
        phone: profile.phone || 'N/A',
        role: profile.role,
        order_count: orderCount,
        lifetime_value: lifetimeValue,
        created_at: profile.created_at
      };
    }) || [];

    const totalPages = count ? Math.ceil(count / limit) : 0;

    return NextResponse.json({
      users: usersWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages
      }
    });
  } catch (error) {
    console.error('Users API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
