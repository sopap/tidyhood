import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/db';

// Performance monitoring helper
function logPerformance(metric: string, duration: number, context?: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PERF] ${metric}: ${duration}ms`, context || '');
  }
  // In production, this would send to monitoring service
}

export async function GET() {
  const startTime = Date.now();
  
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'partner') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getServiceClient();
    
    // Get partner ID
    const { data: partner } = await db
      .from('partners')
      .select('id, name, service_type')
      .or(`profile_id.eq.${user.id},contact_email.eq.${user.email}`)
      .single();

    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    const partnerId = partner.id;
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch all data in parallel for better performance
    const [statsData, actionsData, scheduleData] = await Promise.all([
      // 1. Calculate statistics
      db.rpc('get_partner_stats', { 
        p_partner_id: partnerId,
        p_date: today 
      }).then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
      
      // 2. Get action required orders (pending quotes, < 24h old)
      db
        .from('orders')
        .select(`
          id,
          order_id,
          service_type,
          status,
          slot_start,
          created_at,
          quote_expires_at,
          user_id,
          order_details
        `)
        .eq('partner_id', partnerId)
        .eq('status', 'pending_quote')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
        .limit(5),
      
      // 3. Get today's capacity schedule
      db
        .from('capacity_calendar')
        .select('id, slot_start, slot_end, max_units, reserved_units, service_type')
        .eq('partner_id', partnerId)
        .gte('slot_start', `${today}T00:00:00`)
        .lte('slot_end', `${today}T23:59:59`)
        .order('slot_start', { ascending: true })
    ]);

    // Fallback stats calculation if RPC doesn't exist
    let stats;
    if (statsData) {
      stats = statsData;
    } else {
      // Manual calculation
      const todayStart = `${today}T00:00:00`;
      const todayEnd = `${today}T23:59:59`;
      
      const { data: todayOrders } = await db
        .from('orders')
        .select('id, status, total_cents')
        .eq('partner_id', partnerId)
        .gte('slot_start', todayStart)
        .lte('slot_start', todayEnd);
      
      const { data: weekOrders } = await db
        .from('orders')
        .select('id')
        .eq('partner_id', partnerId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      
      const { data: allOrders } = await db
        .from('orders')
        .select('id, status')
        .eq('partner_id', partnerId);

      stats = {
        today_orders: todayOrders?.length || 0,
        pending_quotes: todayOrders?.filter((o: any) => o.status === 'pending_quote').length || 0,
        in_progress: todayOrders?.filter((o: any) => o.status === 'in_progress').length || 0,
        today_earnings: (todayOrders || [])
          .filter((o: any) => o.status === 'delivered')
          .reduce((sum: number, o: any) => sum + (o.total_cents || 0), 0) / 100 || 0,
        this_week_orders: weekOrders?.length || 0,
        completion_rate: (allOrders && allOrders.length > 0) ? 
          ((allOrders.filter((o: any) => o.status === 'delivered').length / allOrders.length) * 100).toFixed(1)
          : '0'
      };
    }

    const duration = Date.now() - startTime;
    logPerformance('dashboard_api', duration, { partner_id: partnerId });

    return NextResponse.json({
      stats: {
        today_orders: stats.today_orders || 0,
        pending_quotes: stats.pending_quotes || 0,
        in_progress: stats.in_progress || 0,
        today_earnings: stats.today_earnings || 0,
        this_week_orders: stats.this_week_orders || 0,
        completion_rate: stats.completion_rate || 0
      },
      action_required: actionsData.data || [],
      todays_schedule: scheduleData.data || [],
      partner_info: {
        id: partner.id,
        name: partner.name,
        service_type: partner.service_type
      }
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    logPerformance('dashboard_api_error', Date.now() - startTime);
    
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
