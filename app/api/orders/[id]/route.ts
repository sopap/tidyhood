import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { NotFoundError, ForbiddenError, handleApiError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const db = getServiceClient()
    
    // Fetch order
    const { data: order, error } = await db
      .from('orders')
      .select(`
        *,
        partner:partners(name, contact_phone),
        bags(*),
        cleaning_checklist(*)
      `)
      .eq('id', params.id)
      .single()
    
    if (error || !order) {
      throw new NotFoundError('Order not found')
    }
    
    // Check authorization (user owns order, or user is partner/admin)
    if (
      order.user_id !== user.id &&
      user.role !== 'admin' &&
      !(user.role === 'partner' && order.partner_id)
    ) {
      throw new ForbiddenError()
    }
    
    // Fetch order events
    const { data: events } = await db
      .from('order_events')
      .select('*')
      .eq('order_id', params.id)
      .order('ts', { ascending: true })
    
    return NextResponse.json({
      ...order,
      events: events || [],
    })
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}
