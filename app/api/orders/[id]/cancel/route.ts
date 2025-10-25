import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { isCancellable, validateTransition } from '@/lib/orderStateMachine'
import { getCancellationPolicy, validateModification } from '@/lib/cancellationFees'
import { releaseCapacity } from '@/lib/capacity'
import { NotFoundError, ForbiddenError, ValidationError, handleApiError } from '@/lib/errors'
import { 
  cancelCleaning, 
  canCancelCleaning, 
  calculateCancellationFee as calculateCleaningFee 
} from '@/lib/cleaningStatus'

/**
 * POST /api/orders/:id/cancel - Cancel an order
 * 
 * Handles cancellation for both laundry (free, no refund) and cleaning (new status system)
 * - LAUNDRY: Uses old system with status field
 * - CLEANING: Uses new cleaning_status system with auto refunds
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: orderId } = await params
    const db = getServiceClient()
    
    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { reason } = cancelSchema.parse(body)
    
    // Fetch current order
    const { data: order, error: fetchError } = await db
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
    
    if (fetchError || !order) {
      throw new NotFoundError('Order not found')
    }
    
    // Check authorization
    if (order.user_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('You do not have permission to cancel this order')
    }
    
    // Route to appropriate cancellation handler based on service type
    if (order.service_type === 'CLEANING') {
      return await handleCleaningCancellation(order, orderId, reason, user, db)
    } else {
      return await handleLaundryCancellation(order, orderId, reason, user, db)
    }
    
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

/**
 * Handle cleaning order cancellation using new cleaning_status system
 */
async function handleCleaningCancellation(
  order: any,
  orderId: string,
  reason: string | undefined,
  user: any,
  db: any
) {
  // Validate can cancel using new system
  if (!canCancelCleaning(order)) {
    throw new ValidationError(
      'Order cannot be canceled in current status',
      'CANNOT_CANCEL'
    )
  }
  
  // Calculate fees using new system
  const { feeCents, refundCents } = calculateCleaningFee(order)
  
  try {
    // Use new cancelCleaning function which handles:
    // - Status update to 'canceled'
    // - Stripe refund processing
    // - Capacity release
    // - All database updates
    const result = await cancelCleaning(
      orderId,
      reason || 'Customer requested cancellation',
      'customer'
    )
    
    // Log modification for audit trail
    await db.from('order_modifications').insert({
      order_id: orderId,
      modification_type: 'CANCEL',
      old_slot_start: order.slot_start,
      old_slot_end: order.slot_end,
      fee_cents: result.feeCents,
      reason: result.reason,
      created_by: user.id
    })
    
    // Create order event
    await db.from('order_events').insert({
      order_id: orderId,
      actor: user.id,
      actor_role: user.role || 'user',
      event_type: 'order_canceled',
      payload_json: {
        reason: result.reason,
        previous_status: order.cleaning_status,
        refund_amount: result.refundCents,
        fee_amount: result.feeCents,
        service_type: 'CLEANING',
        canceled_by: result.canceledBy
      },
    })
    
    // Build response message
    let message = 'Order canceled successfully'
    if (result.refundCents > 0) {
      message += `. Refund of $${(result.refundCents / 100).toFixed(2)} will be processed within 5-10 business days`
      if (result.feeCents > 0) {
        message += ` (after $${(result.feeCents / 100).toFixed(2)} cancellation fee)`
      }
    } else if (result.feeCents === order.total_cents) {
      message += '. No refund available (canceled during service)'
    }
    
    return NextResponse.json({
      success: true,
      order_id: orderId,
      refund_amount: result.refundCents,
      fee_charged: result.feeCents,
      message
    })
    
  } catch (error) {
    console.error('Error during cleaning cancellation:', error)
    throw error
  }
}

/**
 * Handle laundry order cancellation using existing system
 */
async function handleLaundryCancellation(
  order: any,
  orderId: string,
  reason: string | undefined,
  user: any,
  db: any
) {
  // Validate cancellation using existing policy system
  await validateModification(order, 'cancel')
  
  const policy = await getCancellationPolicy(order)
  if (!policy.canCancel) {
    throw new ValidationError(
      policy.reason || 'Order cannot be canceled at this time',
      'CANNOT_CANCEL'
    )
  }
  
  try {
    // 1. Release capacity slot
    await releaseCapacity(
      order.partner_id,
      order.service_type as 'LAUNDRY',
      order.slot_start,
      1
    )
    
    // 2. Update order status to canceled
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        canceled_by: user.id,
        canceled_reason: reason || 'Customer requested cancellation',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error canceling laundry order:', updateError)
      throw new Error('Failed to cancel order')
    }
    
    // 3. Log modification
    await db.from('order_modifications').insert({
      order_id: orderId,
      modification_type: 'CANCEL',
      old_slot_start: order.slot_start,
      old_slot_end: order.slot_end,
      fee_cents: 0,
      reason: reason || 'Customer requested cancellation',
      created_by: user.id
    })
    
    // 4. Create order event
    await db.from('order_events').insert({
      order_id: orderId,
      actor: user.id,
      actor_role: user.role || 'user',
      event_type: 'order_canceled',
      payload_json: {
        reason: reason || 'Customer requested cancellation',
        previous_status: order.status,
        service_type: 'LAUNDRY'
      },
    })
    
    return NextResponse.json({
      success: true,
      order: updatedOrder,
      refund_amount: 0,
      fee_charged: 0,
      message: 'Order canceled successfully. No charges since service was not yet provided.'
    })
    
  } catch (error) {
    console.error('Error during laundry cancellation:', error)
    throw error
  }
}
