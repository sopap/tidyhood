import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { isCancellable, validateTransition } from '@/lib/orderStateMachine'
import { getCancellationPolicy, validateModification } from '@/lib/cancellationFees'
import { releaseCapacity } from '@/lib/capacity'
import { NotFoundError, ForbiddenError, ValidationError, handleApiError } from '@/lib/errors'

/**
 * POST /api/orders/:id/cancel - Cancel an order
 * 
 * Handles cancellation for both laundry (free, no refund) and cleaning (85% refund)
 * Manages capacity release, refund processing, and notifications
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
    
    // Validate cancellation using new policy system
    validateModification(order, 'cancel')
    
    // Get cancellation policy for fee/refund calculation
    const policy = getCancellationPolicy(order)
    if (!policy.canCancel) {
      throw new ValidationError(
        policy.reason || 'Order cannot be canceled at this time',
        'CANNOT_CANCEL'
      )
    }
    
    // Process based on service type
    let refundAmount = 0
    let refundId: string | undefined
    
    try {
      // 1. Process refund for paid cleanings
      if (order.service_type === 'CLEANING' && order.paid_at && policy.refundAmount > 0) {
        // Create refund record
        const { data: refund, error: refundError } = await db
          .from('refunds')
          .insert({
            order_id: orderId,
            amount_cents: policy.refundAmount,
            reason: reason || 'Customer requested cancellation',
            approved_by: user.id,
            status: 'pending'
          })
          .select()
          .single()
        
        if (refundError) {
          console.error('Failed to create refund record:', refundError)
        } else {
          refundId = refund.id
          refundAmount = policy.refundAmount
          
          // TODO: Process Stripe refund in production
          // const stripeRefund = await stripe.refunds.create({
          //   payment_intent: order.payment_id,
          //   amount: policy.refundAmount,
          //   reason: 'requested_by_customer'
          // })
          // 
          // await db.from('refunds').update({
          //   stripe_refund_id: stripeRefund.id,
          //   status: 'processing',
          //   processed_at: new Date().toISOString()
          // }).eq('id', refund.id)
          
          console.log(`Refund of ${policy.refundAmount} cents would be processed for order ${orderId}`)
        }
      }
      
      // 2. Release capacity slot
      await releaseCapacity(
        order.partner_id,
        order.service_type as 'LAUNDRY' | 'CLEANING',
        order.slot_start,
        1
      )
      
      // 3. Update order status to canceled
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
        console.error('Error canceling order:', updateError)
        throw new Error('Failed to cancel order')
      }
      
      // 4. Log modification
      await db.from('order_modifications').insert({
        order_id: orderId,
        modification_type: 'CANCEL',
        old_slot_start: order.slot_start,
        old_slot_end: order.slot_end,
        fee_cents: policy.cancellationFee,
        reason: reason || 'Customer requested cancellation',
        created_by: user.id
      })
      
      // 5. Create order event
      await db.from('order_events').insert({
        order_id: orderId,
        actor: user.id,
        actor_role: user.role || 'user',
        event_type: 'order_canceled',
        payload_json: {
          reason: reason || 'Customer requested cancellation',
          previous_status: order.status,
          refund_amount: refundAmount,
          fee_amount: policy.cancellationFee,
          service_type: order.service_type
        },
      })
      
      // 6. TODO: Send cancellation notification
      // await sendNotification({
      //   user_id: user.id,
      //   type: 'order_canceled',
      //   title: 'Order Canceled',
      //   body: refundAmount > 0 
      //     ? `Your order has been canceled. Refund of $${(refundAmount / 100).toFixed(2)} will be processed within 5-10 business days.`
      //     : 'Your order has been canceled.',
      //   data: { order_id: orderId }
      // })
      
      // Build response message
      let message = 'Order canceled successfully'
      if (order.service_type === 'CLEANING' && refundAmount > 0) {
        message += `. Refund of $${(refundAmount / 100).toFixed(2)} will be processed within 5-10 business days`
        if (policy.cancellationFee > 0) {
          message += ` (85% refund, 15% cancellation fee: $${(policy.cancellationFee / 100).toFixed(2)})`
        }
      } else if (order.service_type === 'LAUNDRY') {
        message += '. No charges since service was not yet provided'
      }
      
      return NextResponse.json({
        success: true,
        order: updatedOrder,
        refund_amount: refundAmount,
        refund_id: refundId,
        fee_charged: policy.cancellationFee,
        message
      })
      
    } catch (error) {
      console.error('Error during cancellation process:', error)
      throw error
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
