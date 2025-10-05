import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const db = getServiceClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Get today's orders
    const { data: todayOrders, error: todayError } = await db
      .from('orders')
      .select('id, total_cents, status')
      .gte('created_at', today.toISOString())
    
    if (todayError) throw todayError

    // Get yesterday's orders
    const { data: yesterdayOrders, error: yesterdayError } = await db
      .from('orders')
      .select('id, total_cents')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())
    
    if (yesterdayError) throw yesterdayError

    // Get active partners count
    const { count: partnersCount, error: partnersError } = await db
      .from('partners')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
    
    if (partnersError) throw partnersError

    // Calculate metrics
    const todayOrderCount = todayOrders?.length || 0
    const yesterdayOrderCount = yesterdayOrders?.length || 0
    
    const todayGMV = todayOrders?.reduce((sum, order) => 
      sum + (order.total_cents || 0), 0) || 0
    const yesterdayGMV = yesterdayOrders?.reduce((sum, order) => 
      sum + (order.total_cents || 0), 0) || 0

    // Calculate SLA (simplified - orders delivered vs late)
    const completedToday = todayOrders?.filter(o => 
      ['DELIVERED', 'CLEANED'].includes(o.status)
    ).length || 0
    
    const slaToday = todayOrderCount > 0 ? completedToday / todayOrderCount : 1

    // Get pending orders count
    const { count: pendingCount, error: pendingError } = await db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['PENDING', 'PAID', 'RECEIVED', 'IN_PROGRESS', 'READY', 'OUT_FOR_DELIVERY'])
    
    if (pendingError) throw pendingError

    return NextResponse.json({
      orders: {
        today: todayOrderCount,
        yesterday: yesterdayOrderCount,
        change: todayOrderCount - yesterdayOrderCount,
        pending: pendingCount || 0
      },
      gmv: {
        today: todayGMV / 100, // Convert to dollars
        yesterday: yesterdayGMV / 100,
        change: (todayGMV - yesterdayGMV) / 100
      },
      sla: {
        today: slaToday,
        yesterday: 0.98 // Placeholder
      },
      partners: {
        active: partnersCount || 0
      }
    })
  } catch (error) {
    console.error('Admin metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}
