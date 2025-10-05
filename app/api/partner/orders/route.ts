import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

// GET /api/partner/orders - List partner's orders
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const db = getServiceClient()
    
    // Verify user is a partner
    if (user.role !== 'partner' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Partner access required' },
        { status: 403 }
      )
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const date = searchParams.get('date')
    
    // Build query
    let query = db
      .from('orders')
      .select('*')
      .order('slot_start', { ascending: true })
    
    // Filter by partner (unless admin)
    if (user.role === 'partner') {
      // Find partner_id for this user
      const { data: partner } = await db
        .from('partners')
        .select('id')
        .eq('contact_email', user.email)
        .single()
      
      if (!partner) {
        return NextResponse.json(
          { error: 'Partner profile not found' },
          { status: 404 }
        )
      }
      
      query = query.eq('partner_id', partner.id)
    }
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status)
    }
    
    // Filter by date if provided
    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)
      
      query = query
        .gte('slot_start', startOfDay.toISOString())
        .lte('slot_start', endOfDay.toISOString())
    }
    
    const { data: orders, error } = await query
    
    if (error) {
      console.error('Error fetching partner orders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ orders: orders || [] })
  } catch (error) {
    console.error('Partner orders GET error:', error)
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.statusCode }
    )
  }
}
