import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { getCancellationPolicy, validateModification } from '@/lib/cancellationFees'
import { releaseCapacity, reserveCapacity } from '@/lib/capacity'
import { NotFoundError, ForbiddenError, ValidationError, handleApiError } from '@/lib/errors'

/**
 * POST /api/orders/:id/reschedule - Reschedule an order
 * 
 * Handles rescheduling for both laundry (free) and cleaning (15% fee if <24hrs)
 * Manages capacity reservation, fee processing, and notifications
 * 
 * Request Body:
 * - new_slot_start: string (ISO timestamp)
 * - new_slot_end: string (ISO timestamp)
 * - partner_id: string (UUID)
 * - reason: string (optional)
 * 
 * Authorization: User must own the order or be an admin
 */

const rescheduleSchema = z.object({
  new_slot_start: z.string(),
  new_slot_end: z.string(),
  partner_id: z.string().uuid(),
  reason: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const db = getServiceClient()
    
    // Parse and validate request
    const body = await request.json()
    const { new_slot_start, new_slot_end, partner_id, reason } = rescheduleSchema.parse(body)
    
    // Validate timestamps
    const newSlotTime = new Date(new_slot_start)
    const now = new Date()
    if (newSlotTime <= now) {
      throw new ValidationError('New slot time must be in the future')
    }
    
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
      throw new ForbiddenError('You do not have permission to reschedule this order')
    }
    
    // Validate rescheduling is allowed
    validateModification(order, 'reschedule')
    
    // Get cancellation policy for fee calculation
    const policy = getCancellationPolicy(order)
    if (!policy.canReschedule) {
      throw new ValidationError(
        policy.reason || 'Order cannot be rescheduled at this time',
        'CANNOT_RESCHEDULE'
      )
    }
    
    // Check if trying to reschedule to same time
    if (order.slot_start === new_slot_start && order.slot_end === new_slot_end) {
      throw new ValidationError('New time slot is the same as current slot')
    }
    
    // Begin transaction-like operations
    let capacityReserved = false
    let oldCapacityReleased = false
    
    try {
      // 1. Check and reserve new slot availability
      const available = await reserveCapacity(
        partner_id,
        order.service_type as 'LAUNDRY' | 'CLEANING',
        new_slot_start,
        1
      )
      
      if (!available) {
        throw new ValidationError('Selected time slot is no longer available', 'SLOT_UNAVAILABLE')
      }
      capacityReserved = true
      
      // 2. Release old capacity
      await releaseCapacity(
        order.partner_id,
        order.service_type as 'LAUNDRY' | 'CLEANING',
        order.slot_start,
        1
      )
      oldCapacityReleased = true
      
      // 3. Charge rescheduling fee if applicable (for cleaning with <24hrs notice)
      // Note: In production, integrate with Stripe payment processing here
      // For now, we'll just log the fee
      const feeCharged = policy.rescheduleFee > 0
      if (feeCharged) {
        console.log(`Rescheduling fee of ${policy.rescheduleFee} cents would be charged`)
        // TODO: Integrate Stripe charge
        // const charge = await stripe.charges.create({
        //   amount: policy.rescheduleFee,
        //   currency: 'usd',
        //   customer: order.stripe_customer_id,
        //   description: `Rescheduling fee for order ${order.id}`
        // })
      }
      
      // 4. Update order with new slot
      const { data: updatedOrder, error: updateError } = await db
        .from('orders')
        .update({
          slot_start: new_slot_start,
          slot_end: new_slot_end,
          partner_id,
          reschedule_fee_cents: policy.rescheduleFee,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)
        .select()
        .single()
      
      if (updateError) {
        throw new Error('Failed to update order: ' + updateError.message)
      }
      
      // 5. Log modification in order_modifications table
      await db.from('order_modifications').insert({
        order_id: params.id,
        modification_type: 'RESCHEDULE',
        old_slot_start: order.slot_start,
        old_slot_end: order.slot_end,
        new_slot_start,
        new_slot_end,
        fee_cents: policy.rescheduleFee,
        reason: reason || 'Customer requested reschedule',
        created_by: user.id
      })
      
      // 6. Create audit event in order_events
      await db.from('order_events').insert({
        order_id: params.id,
        actor: user.id,
        actor_role: user.role || 'user',
        event_type: 'order_rescheduled',
        payload_json: {
          old_slot: { start: order.slot_start, end: order.slot_end },
          new_slot: { start: new_slot_start, end: new_slot_end },
          fee_cents: policy.rescheduleFee,
          reason: reason || 'Customer requested reschedule',
          hours_notice: Math.floor((new Date(order.slot_start).getTime() - now.getTime()) / (1000 * 60 * 60))
        }
      })
      
      // 7. TODO: Send notification to user
      // await sendNotification({
      //   user_id: user.id,
      //   type: 'order_rescheduled',
      //   title: 'Service Rescheduled',
      //   body: `Your ${order.service_type.toLowerCase()} has been rescheduled to ${new Date(new_slot_start).toLocaleString()}`,
      //   data: { order_id: params.id }
      // })
      
      return NextResponse.json({
        success: true,
        order: updatedOrder,
        fee_charged: feeCharged,
        fee_amount: policy.rescheduleFee,
        message: policy.rescheduleFee > 0 
          ? `Rescheduled successfully. $${(policy.rescheduleFee / 100).toFixed(2)} fee will be charged.`
          : 'Rescheduled successfully. No fee.'
      })
      
    } catch (error) {
      // Rollback on error
      console.error('Reschedule error, attempting rollback:', error)
      
      // If we reserved new capacity but failed later, release it
      if (capacityReserved && !oldCapacityReleased) {
        try {
          await releaseCapacity(
            partner_id,
            order.service_type as 'LAUNDRY' | 'CLEANING',
            new_slot_start,
            1
          )
        } catch (rollbackError) {
          console.error('Failed to rollback capacity reservation:', rollbackError)
        }
      }
      
      // If we released old capacity but failed later, try to re-reserve it
      if (oldCapacityReleased && !capacityReserved) {
        try {
          await reserveCapacity(
            order.partner_id,
            order.service_type as 'LAUNDRY' | 'CLEANING',
            order.slot_start,
            1
          )
        } catch (rollbackError) {
          console.error('Failed to rollback capacity release:', rollbackError)
        }
      }
      
      throw error
    }
    
  } catch (error) {
    console.error('Order reschedule error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    const apiError = handleApiError(error)
    return NextResponse.json(
      { 
        error: apiError.error, 
        code: apiError.code,
        details: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: apiError.statusCode }
    )
  }
}
