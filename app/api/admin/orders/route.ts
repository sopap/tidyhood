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
    
    // Extract query parameters
    const status = searchParams.get('status')
    const serviceType = searchParams.get('service_type')
    const partnerId = searchParams.get('partner_id')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = (page - 1) * limit

    // Build query
    let query = db
      .from('orders')
      .select(`
        *,
        profiles!orders_customer_id_fkey(email, phone),
        partners(name)
      `, { count: 'exact' })
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

    // Search filter (order ID, customer email, or phone)
    if (search) {
      query = query.or(
        `id.ilike.%${search}%,` +
        `profiles.email.ilike.%${search}%,` +
        `profiles.phone.ilike.%${search}%`
      )
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: orders, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      orders: orders || [],
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
