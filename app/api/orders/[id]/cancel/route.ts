import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { isCancellable, validateTransition } from '@/lib/orderStateMachine'
import { NotFoundError, ForbiddenError, ValidationError, handleApiError } from '@/lib/errors'

/**
 * POST /api/orders/:id/cancel - Cancel an order
 * 
 * Validates that the order can be canceled based on its current status
 * using the unified state machine rules.
 * 
 * Request Body:
 * - reason: string (optional) - Cancellation reason
 * 
 * Authorization: User must own the order or be an admin
 */

const cancelSchema = z.object({
  reason: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const db = getServiceClient()
    
    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { reason } = cancelSchema.parse(body)
    
    // Fetch current order
    const { data: order, error: fetchError } = await db
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (fetchError || !order) {
      throw new NotFoundError('Order not found')
    }
    
    // Check authorization
    if (order.user_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('You do not have permission to cancel this order')
    }
    
    // Validate cancellation using state machine
    if (!isCancellable(order.status)) {
      throw new ValidationError(
        `Order cannot be canceled in ${order.status} status. Cancellation is only allowed for orders that haven't been picked up or are awaiting payment.`,
        'CANNOT_CANCEL'
      )
    }
    
    // Double-check with validateTransition
    const validation = validateTransition(
      order.status,
      'canceled',
      order.service_type as 'LAUNDRY' | 'CLEANING',
      order
    )
    
    if (!validation.valid) {
      throw new ValidationError(
        validation.error || 'Cannot cancel order at this time',
        'INVALID_TRANSITION'
      )
    }
    
    // Update order status to canceled
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error canceling order:', updateError)
      throw new Error('Failed to cancel order')
    }
    
    // Create order event
    await db.from('order_events').insert({
      order_id: params.id,
      actor: user.id,
      actor_role: user.role || 'user',
      event_type: 'order_canceled',
      payload_json: {
        reason: reason || 'Customer requested cancellation',
        previous_status: order.status,
      },
    })
    
    // TODO: Release capacity reservation
    // TODO: Process refund if payment was made
    // TODO: Send cancellation notification
    
    return NextResponse.json({
      ...updatedOrder,
      message: 'Order canceled successfully',
    })
  } catch (error) {
    console.error('Order cancel error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}
