import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { completeCleaningOrder } from '@/lib/cleaningStatus'
import { logger } from '@/lib/logger'

/**
 * Complete a cleaning order
 * 
 * POST /api/orders/{id}/complete
 * 
 * Marks a cleaning order as completed.
 * Only accessible by partners assigned to the order.
 * Order must be in 'in_service' status.
 * 
 * Body: {
 *   notes?: string // Optional completion notes
 * }
 */

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params
    
    // Verify partner authentication
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    if (user.role !== 'partner') {
      return NextResponse.json(
        { error: 'Not a partner account' },
        { status: 403 }
      )
    }

    const supabase = getServiceClient()
    
    // Get partner record
    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .or(`profile_id.eq.${user.id},contact_email.eq.${user.email}`)
      .single()
    
    if (!partner) {
      return NextResponse.json(
        { error: 'Partner record not found' },
        { status: 404 }
      )
    }
    
    // Get request body
    const body = await request.json().catch(() => ({}))
    const { notes } = body
    
    // Fetch order to verify ownership and service type
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
    
    if (fetchError || !order) {
      console.error('Order not found:', orderId, fetchError)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // Verify partner owns this order
    if (order.partner_id !== partner.id) {
      console.warn('Partner attempted to complete order they do not own')
      return NextResponse.json(
        { error: 'You are not assigned to this order' },
        { status: 403 }
      )
    }
    
    // Verify it's a cleaning order
    if (order.service_type !== 'CLEANING') {
      return NextResponse.json(
        { error: 'Only cleaning orders can be completed through this endpoint' },
        { status: 400 }
      )
    }
    
    // Complete the order
    const result = await completeCleaningOrder(orderId, {
      notes,
      partnerId: partner.id
    })
    
    if (!result.success) {
      console.error('Failed to complete order:', orderId, result.error)
      return NextResponse.json(
        { error: result.error || 'Failed to complete order' },
        { status: 400 }
      )
    }
    
    console.log('Order completed by partner:', orderId)
    
    return NextResponse.json({
      success: true,
      message: 'Order marked as completed',
      order: result.order
    })
    
  } catch (error: any) {
    console.error('Complete order error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
