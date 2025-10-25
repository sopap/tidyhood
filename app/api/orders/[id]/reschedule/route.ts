import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { getCancellationPolicy, validateModification } from '@/lib/cancellationFees'
import { releaseCapacity, reserveCapacity } from '@/lib/capacity'
import { NotFoundError, ForbiddenError, ValidationError, handleApiError } from '@/lib/errors'
import { rescheduleCleaning, canRescheduleCleaning } from '@/lib/cleaningStatus'

/**
 * POST /api/orders/:id/reschedule - Reschedule an order
 * 
 * Handles rescheduling for both laundry and cleaning:
 * - LAUNDRY: Updates same order in place (free)
 * - CLEANING: Creates new order, marks old as 'rescheduled' (free if >24h)
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: orderId } = await params
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
      .eq('id', orderId)
      .single()
    
    if (fetchError || !order) {
      throw new NotFoundError('Order not found')
    }
    
    // Check authorization
    if (order.user_id !== user.id && user.role !== 'admin') {
      throw new ForbiddenError('You do not have permission to reschedule this order')
    }
    
    // Check if trying to reschedule to same time
    if (order.slot_start === new_slot_start && order.slot_end === new_slot_end) {
      throw new ValidationError('New time slot is the same as current slot')
    }
    
    // Route to appropriate handler based on service type
    if (order.service_type === 'CLEANING') {
      return await handleCleaningReschedule(order, orderId, new_slot_start, new_slot_end, partner_id, reason, user, db)
    } else {
      return await handleLaundryReschedule(order, orderId, new_slot_start, new_slot_end, partner_id, reason, user, db)
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

/**
 * Handle cleaning order reschedule using new cleaning_status system
 * Creates a new order and marks old as 'rescheduled'
 */
async function handleCleaningReschedule(
  order: any,
  orderId: string,
  new_slot_start: string,
  new_slot_end: string,
  partner_id: string,
  reason: string | undefined,
  user: any,
  db: any
) {
  // Validate can reschedule using new system
  if (!canRescheduleCleaning(order)) {
    throw new ValidationError(
      'Cannot reschedule less than 24 hours before appointment. Please cancel and rebook instead.',
      'CANNOT_RESCHEDULE'
    )
  }
  
  try {
    // Use new rescheduleCleaning function which handles:
    // - Marking old order as 'rescheduled'
    // - Creating new order with 'scheduled' status
    // - Linking orders with rescheduled_from/rescheduled_to
    // - Releasing old slot and reserving new slot
    // - Reusing payment (no additional charge)
    
    // Note: The function expects slot_id, but we have partner_id and slot times
    // We need to find the slot_id or create a slot record
    // For now, pass the new slot time directly
    const result = await rescheduleCleaning(
      orderId,
      partner_id, // Using partner_id as slot identifier for now
      new Date(new_slot_start)
    )
    
    // Log modification for audit trail
    await db.from('order_modifications').insert({
      order_id: orderId,
      modification_type: 'RESCHEDULE',
      old_slot_start: order.slot_start,
      old_slot_end: order.slot_end,
      new_slot_start,
      new_slot_end,
      fee_cents: 0,
      reason: reason || 'Customer requested reschedule',
      created_by: user.id
    })
    
    // Create order event
    await db.from('order_events').insert({
      order_id: result.newOrderId,
      actor: user.id,
      actor_role: user.role || 'user',
      event_type: 'order_rescheduled',
      payload_json: {
        old_order_id: result.oldOrderId,
        old_slot: { start: order.slot_start, end: order.slot_end },
        new_slot: { start: new_slot_start, end: new_slot_end },
        reason: reason || 'Customer requested reschedule',
        service_type: 'CLEANING'
      }
    })
    
    return NextResponse.json({
      success: true,
      old_order_id: result.oldOrderId,
      new_order_id: result.newOrderId,
      new_scheduled_time: result.newScheduledTime,
      fee_charged: false,
      fee_amount: 0,
      message: 'Rescheduled successfully. No additional charge - your payment has been transferred to the new booking.'
    })
    
  } catch (error) {
    console.error('Error during cleaning reschedule:', error)
    throw error
  }
}

/**
 * Handle laundry order reschedule using existing system
 * Updates same order in place
 */
async function handleLaundryReschedule(
  order: any,
  orderId: string,
  new_slot_start: string,
  new_slot_end: string,
  partner_id: string,
  reason: string | undefined,
  user: any,
  db: any
) {
  // Validate rescheduling is allowed
  await validateModification(order, 'reschedule')
  
  const policy = await getCancellationPolicy(order)
  if (!policy.canReschedule) {
    throw new ValidationError(
      policy.reason || 'Order cannot be rescheduled at this time',
      'CANNOT_RESCHEDULE'
    )
  }
  
  // Begin transaction-like operations
  let capacityReserved = false
  let oldCapacityReleased = false
  
  try {
    // 1. Check and reserve new slot availability
    const available = await reserveCapacity(
      partner_id,
      order.service_type as 'LAUNDRY',
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
      order.service_type as 'LAUNDRY',
      order.slot_start,
      1
    )
    oldCapacityReleased = true
    
    // 3. Update order with new slot
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({
        slot_start: new_slot_start,
        slot_end: new_slot_end,
        partner_id,
        reschedule_fee_cents: 0, // Laundry reschedules are always free
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()
    
    if (updateError) {
      throw new Error('Failed to update order: ' + updateError.message)
    }
    
    // 4. Log modification in order_modifications table
    await db.from('order_modifications').insert({
      order_id: orderId,
      modification_type: 'RESCHEDULE',
      old_slot_start: order.slot_start,
      old_slot_end: order.slot_end,
      new_slot_start,
      new_slot_end,
      fee_cents: 0,
      reason: reason || 'Customer requested reschedule',
      created_by: user.id
    })
    
    // 5. Create audit event in order_events
    await db.from('order_events').insert({
      order_id: orderId,
      actor: user.id,
      actor_role: user.role || 'user',
      event_type: 'order_rescheduled',
      payload_json: {
        old_slot: { start: order.slot_start, end: order.slot_end },
        new_slot: { start: new_slot_start, end: new_slot_end },
        fee_cents: 0,
        reason: reason || 'Customer requested reschedule',
        service_type: 'LAUNDRY'
      }
    })
    
    return NextResponse.json({
      success: true,
      order: updatedOrder,
      fee_charged: false,
      fee_amount: 0,
      message: 'Rescheduled successfully. No fee.'
    })
    
  } catch (error) {
    // Rollback on error
    console.error('Laundry reschedule error, attempting rollback:', error)
    
    // If we reserved new capacity but failed later, release it
    if (capacityReserved) {
      try {
        await releaseCapacity(
          partner_id,
          order.service_type as 'LAUNDRY',
          new_slot_start,
          1
        )
      } catch (rollbackError) {
        console.error('Failed to rollback capacity reservation:', rollbackError)
      }
    }
    
    // If we released old capacity but failed later, try to re-reserve it
    if (oldCapacityReleased) {
      try {
        await reserveCapacity(
          order.partner_id,
          order.service_type as 'LAUNDRY',
          order.slot_start,
          1
        )
      } catch (rollbackError) {
        console.error('Failed to rollback capacity release:', rollbackError)
      }
    }
    
    throw error
  }
}
