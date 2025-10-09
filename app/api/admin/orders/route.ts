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
    const { searchParams } = new URL(request.url)
    
    // Check if this is a single order request
    const orderId = searchParams.get('id')
    
    // If an ID is provided, return single order
    if (orderId) {
      const { data: order, error } = await db
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()
      
      if (error || !order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }
      
      // Get profile data
      const { data: profile } = await db
        .from('profiles')
        .select('id, full_name, phone, email')
        .eq('id', order.user_id)
        .single()
      
      // Get partner data if assigned
      let partner = null
      if (order.partner_id) {
        const { data } = await db
          .from('partners')
          .select('id, name, contact_email')
          .eq('id', order.partner_id)
          .single()
        partner = data
      }
      
      // Enrich order with profile and partner data
      const enrichedOrder = {
        ...order,
        profiles: profile || null,
        partners: partner
      }
      
      return NextResponse.json({ order: enrichedOrder })
    }
    
    // Otherwise, return list of orders
    // Extract query parameters
    const status = searchParams.get('status')
    const serviceType = searchParams.get('service_type')
    const partnerId = searchParams.get('partner_id')
    const userId = searchParams.get('user_id')
    const search = searchParams.get('search')
    const pendingApproval = searchParams.get('pending_approval')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = (page - 1) * limit

    // Build query - fetch orders first, then manually join customer data
    let query = db
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (serviceType && serviceType !== 'all') {
      query = query.eq('service_type', serviceType)
    }

    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Filter for pending admin approval
    if (pendingApproval === 'true') {
      query = query.eq('pending_admin_approval', true)
    }

    // Search filter (order ID, customer phone, or name)
    if (search) {
      query = query.or(
        `id.ilike.%${search}%,` +
        `profiles.phone.ilike.%${search}%,` +
        `profiles.full_name.ilike.%${search}%`
      )
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: orders, error, count } = await query

    if (error) throw error

    // Get all unique user IDs and partner IDs
    const userIds = [...new Set(orders?.map(o => o.user_id).filter(Boolean))];
    const partnerIds = [...new Set(orders?.map(o => o.partner_id).filter(Boolean))];

    // Fetch all profiles at once
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name, phone, email')
      .in('id', userIds);

    // Fetch all partners at once
    const { data: partners } = await db
      .from('partners')
      .select('id, name, contact_email')
      .in('id', partnerIds);

    // Create lookup maps
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const partnerMap = new Map(partners?.map(p => [p.id, p]) || []);

    // Enrich orders with profile and partner data
    const enrichedOrders = orders?.map(order => {
      const profile = profileMap.get(order.user_id);
      const partner = partnerMap.get(order.partner_id);

      return {
        ...order,
        profiles: profile ? {
          id: profile.id,
          full_name: profile.full_name || profile.email?.split('@')[0] || 'Unknown',
          phone: profile.phone || 'N/A',
          email: profile.email || 'N/A'
        } : null,
        partners: partner || null
      };
    }) || [];

    return NextResponse.json({
      orders: enrichedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Admin orders fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
