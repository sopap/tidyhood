/**
 * Cleaning Status System
 * 
 * Manages the 5-state status system for cleaning orders:
 * - scheduled: Booked and paid, waiting for appointment
 * - in_service: Appointment is today (cleaner arriving/working)
 * - completed: Service finished successfully
 * - canceled: Booking canceled (with refund logic)
 * - rescheduled: Moved to different date (transitional)
 * 
 * @module lib/cleaningStatus
 */

import { getServiceClient } from './db'
import { logger } from './logger'
import Stripe from 'stripe'

// ============================================
// TYPES
// ============================================

export type CleaningStatus = 
  | 'scheduled'
  | 'in_service'
  | 'completed'
  | 'canceled'
  | 'rescheduled'

export type CancelBy = 'customer' | 'partner' | 'system'

export interface CleaningStatusConfig {
  label: string
  icon: string
  color: 'blue' | 'indigo' | 'green' | 'gray' | 'red' | 'amber'
  canCancel: boolean
  canReschedule: boolean
  description: string
  showRating?: boolean
  showRebook?: boolean
  showRefundInfo?: boolean
  isTransitional?: boolean
}

export interface CancellationResult {
  feeCents: number
  refundCents: number
  reason: string
  canceledBy: CancelBy
}

export interface RescheduleResult {
  oldOrderId: string
  newOrderId: string
  newScheduledTime: Date
}

// ============================================
// CONFIGURATION
// ============================================

export const CLEANING_STATUS_CONFIG: Record<CleaningStatus, CleaningStatusConfig> = {
  scheduled: {
    label: 'Scheduled',
    icon: '📅',
    color: 'blue',
    canCancel: true,
    canReschedule: true,
    description: 'Your cleaning is booked'
  },
  in_service: {
    label: 'Today',
    icon: '🏠',
    color: 'indigo',
    canCancel: false, // Too late to cancel without fee
    canReschedule: false,
    description: 'Cleaner arriving during scheduled window'
  },
  completed: {
    label: 'Complete',
    icon: '✨',
    color: 'green',
    canCancel: false,
    canReschedule: false,
    description: 'Service completed',
    showRating: true,
    showRebook: true
  },
  canceled: {
    label: 'Canceled',
    icon: '❌',
    color: 'gray',
    canCancel: false,
    canReschedule: false,
    description: 'Booking canceled',
    showRefundInfo: true,
    showRebook: true
  },
  rescheduled: {
    label: 'Rescheduled',
    icon: '🔄',
    color: 'amber',
    canCancel: false,
    canReschedule: false,
    description: 'Moved to new date',
    isTransitional: true
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get hours until appointment
 */
function getHoursUntilAppointment(scheduledTime: Date): number {
  const now = new Date()
  const scheduled = new Date(scheduledTime)
  return (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60)
}

/**
 * Calculate cancellation fee based on timing
 * - Free if >24 hours before appointment
 * - 15% if <24 hours before appointment
 * - 100% (no refund) if during service
 */
export function calculateCancellationFee(
  order: any
): { feeCents: number; refundCents: number } {
  const totalCents = order.total_cents || 0
  const hoursUntil = getHoursUntilAppointment(order.scheduled_time)
  
  // During service - no refund
  if (order.cleaning_status === 'in_service') {
    return {
      feeCents: totalCents,
      refundCents: 0
    }
  }
  
  // Less than 24 hours - 15% fee
  if (hoursUntil < 24) {
    const feeCents = Math.round(totalCents * 0.15)
    return {
      feeCents,
      refundCents: totalCents - feeCents
    }
  }
  
  // More than 24 hours - free cancellation
  return {
    feeCents: 0,
    refundCents: totalCents
  }
}

/**
 * Check if order can be canceled
 */
export function canCancelCleaning(order: any): boolean {
  if (!order || order.service_type !== 'CLEANING') return false
  
  const status = order.cleaning_status
  return status === 'scheduled' || status === 'in_service'
}

/**
 * Check if order can be rescheduled
 */
export function canRescheduleCleaning(order: any): boolean {
  if (!order || order.service_type !== 'CLEANING') return false
  
  const status = order.cleaning_status
  const hoursUntil = getHoursUntilAppointment(order.scheduled_time)
  
  // Can only reschedule if scheduled and >24h away
  return status === 'scheduled' && hoursUntil >= 24
}

/**
 * Get display info for a cleaning status
 */
export function getCleaningStatusDisplay(status: CleaningStatus) {
  return CLEANING_STATUS_CONFIG[status]
}

// ============================================
// STATE TRANSITIONS
// ============================================

/**
 * Transition order to in_service status
 * Called automatically on appointment day at 6 AM
 */
export async function transitionToInService(orderId: string): Promise<void> {
  try {
    const supabase = getServiceClient()
    
    const { error } = await supabase
      .from('orders')
      .update({
        cleaning_status: 'in_service',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('service_type', 'CLEANING')
      .eq('cleaning_status', 'scheduled')
    
    if (error) throw error
    
    logger.info(`Order ${orderId} transitioned to in_service`)
  } catch (error) {
    logger.error(`Failed to transition order ${orderId} to in_service:`, error)
    throw error
  }
}

/**
 * Transition order to completed status
 * Called by partner or automatically 4h after time window
 */
export async function transitionToCompleted(
  orderId: string,
  partnerId?: string
): Promise<void> {
  try {
    const supabase = getServiceClient()
    
    const { error } = await supabase
      .from('orders')
      .update({
        cleaning_status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('service_type', 'CLEANING')
      .eq('cleaning_status', 'in_service')
    
    if (error) throw error
    
    logger.info(`Order ${orderId} completed${partnerId ? ` by partner ${partnerId}` : ' automatically'}`)
  } catch (error) {
    logger.error(`Failed to complete order ${orderId}:`, error)
    throw error
  }
}

/**
 * Complete a cleaning order (wrapper for API use)
 * Returns success/error result
 */
export async function completeCleaningOrder(
  orderId: string,
  options?: { notes?: string; partnerId?: string }
): Promise<{ success: boolean; error?: string; order?: any }> {
  try {
    await transitionToCompleted(orderId, options?.partnerId)
    
    // Get updated order
    const supabase = getServiceClient()
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()
    
    // If notes provided, update partner_notes
    if (options?.notes) {
      await supabase
        .from('orders')
        .update({ partner_notes: options.notes })
        .eq('id', orderId)
    }
    
    return { success: true, order }
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to complete order' 
    }
  }
}

/**
 * Cancel a cleaning order
 * Calculates refund, processes via Stripe, sends notifications
 */
export async function cancelCleaning(
  orderId: string,
  reason: string,
  canceledBy: CancelBy
): Promise<CancellationResult> {
  try {
    const supabase = getServiceClient()
    
    // Get order details
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('service_type', 'CLEANING')
      .single()
    
    if (fetchError || !order) {
      throw new Error('Order not found')
    }
    
    // Calculate fees
    const { feeCents, refundCents } = calculateCancellationFee(order)
    
    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        cleaning_status: 'canceled',
        cancellation_reason: reason,
        cancellation_fee_cents: feeCents,
        refund_amount_cents: refundCents,
        canceled_at: new Date().toISOString(),
        canceled_by: canceledBy,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
    
    if (updateError) throw updateError
    
    // Process refund via Stripe if amount > 0
    if (refundCents > 0 && order.payment_intent_id) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16'
      })
      
      await stripe.refunds.create({
        payment_intent: order.payment_intent_id,
        amount: refundCents,
        reason: 'requested_by_customer',
        metadata: {
          order_id: orderId,
          cancellation_fee_cents: feeCents.toString()
        }
      })
      
      logger.info(`Refund of $${(refundCents / 100).toFixed(2)} processed for order ${orderId}`)
    }
    
    // Release time slot
    if (order.slot_id) {
      const { error: slotError } = await supabase
        .from('time_slots')
        .update({
          available_units: supabase.rpc('increment', { x: 1, row_id: order.slot_id }),
          updated_at: new Date().toISOString()
        })
        .eq('id', order.slot_id)
      
      if (slotError) logger.error(`Failed to release slot: ${slotError.message}`)
    }
    
    logger.info(`Order ${orderId} canceled by ${canceledBy}, refund: $${(refundCents / 100).toFixed(2)}`)
    
    return {
      feeCents,
      refundCents,
      reason,
      canceledBy
    }
  } catch (error) {
    logger.error(`Failed to cancel order ${orderId}:`, error)
    throw error
  }
}

/**
 * Reschedule a cleaning order
 * Marks old order as rescheduled, creates new order
 */
export async function rescheduleCleaning(
  oldOrderId: string,
  newSlotId: string,
  newDateTime: Date
): Promise<RescheduleResult> {
  try {
    const supabase = getServiceClient()
    
    // Get old order
    const { data: oldOrder, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', oldOrderId)
      .eq('service_type', 'CLEANING')
      .single()
    
    if (fetchError || !oldOrder) {
      throw new Error('Order not found')
    }
    
    // Check if can reschedule
    if (!canRescheduleCleaning(oldOrder)) {
      const hoursUntil = getHoursUntilAppointment(oldOrder.scheduled_time)
      throw new Error(
        hoursUntil < 24 
          ? 'Cannot reschedule less than 24 hours before appointment. Please cancel and rebook.'
          : 'Order cannot be rescheduled in current status.'
      )
    }
    
    // Mark old order as rescheduled
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        cleaning_status: 'rescheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', oldOrderId)
    
    if (updateError) throw updateError
    
    // Create new order
    const { data: newOrder, error: insertError } = await supabase
      .from('orders')
      .insert({
        user_id: oldOrder.user_id,
        service_type: oldOrder.service_type,
        scheduled_time: newDateTime.toISOString(),
        slot_id: newSlotId,
        address_snapshot: oldOrder.address_snapshot,
        order_details: oldOrder.order_details,
        total_cents: oldOrder.total_cents,
        payment_intent_id: oldOrder.payment_intent_id,
        cleaning_status: 'scheduled',
        rescheduled_from: oldOrderId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()
    
    if (insertError || !newOrder) throw new Error('Failed to create new order')
    
    const newOrderId = newOrder.id
    
    // Link orders
    const { error: linkError } = await supabase
      .from('orders')
      .update({ rescheduled_to: newOrderId })
      .eq('id', oldOrderId)
    
    if (linkError) logger.error(`Failed to link orders: ${linkError.message}`)
    
    // Release old slot
    if (oldOrder.slot_id) {
      await supabase.rpc('increment_slot_units', { 
        slot_id: oldOrder.slot_id 
      }).catch(err => logger.error(`Failed to release old slot: ${err.message}`))
    }
    
    // Reserve new slot  
    await supabase.rpc('decrement_slot_units', { 
      slot_id: newSlotId 
    }).catch(err => logger.error(`Failed to reserve new slot: ${err.message}`))
    
    logger.info(`Order ${oldOrderId} rescheduled to ${newDateTime}, new order: ${newOrderId}`)
    
    return {
      oldOrderId,
      newOrderId,
      newScheduledTime: newDateTime
    }
  } catch (error) {
    logger.error(`Failed to reschedule order ${oldOrderId}:`, error)
    throw error
  }
}

// ============================================
// BATCH OPERATIONS (for cron jobs)
// ============================================

/**
 * Auto-transition all scheduled orders to in_service on appointment day
 * Run daily at 6 AM
 */
export async function autoTransitionToInService(): Promise<number> {
  try {
    const supabase = getServiceClient()
    const today = new Date().toISOString().split('T')[0]
    
    // Get orders that need transitioning
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .eq('service_type', 'CLEANING')
      .eq('cleaning_status', 'scheduled')
      .gte('scheduled_time', `${today}T00:00:00`)
      .lt('scheduled_time', `${today}T23:59:59`)
    
    if (fetchError) throw fetchError
    
    if (!orders || orders.length === 0) {
      logger.info('No orders to auto-transition')
      return 0
    }
    
    // Update all orders
    const orderIds = orders.map(o => o.id)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        cleaning_status: 'in_service',
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds)
    
    if (updateError) throw updateError
    
    const count = orders.length
    logger.info(`Auto-transitioned ${count} orders to in_service`)
    
    return count
  } catch (error) {
    logger.error('Failed to auto-transition orders:', error)
    throw error
  }
}

/**
 * Auto-complete orders that ended 4+ hours ago
 * Run hourly as safety net for partners who forget to mark complete
 */
export async function autoCompleteCleanings(): Promise<number> {
  try {
    const supabase = getServiceClient()
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
    
    // Get orders that need completing
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select('id')
      .eq('service_type', 'CLEANING')
      .eq('cleaning_status', 'in_service')
      .lt('scheduled_time', fourHoursAgo.toISOString())
    
    if (fetchError) throw fetchError
    
    if (!orders || orders.length === 0) {
      return 0
    }
    
    // Update all orders
    const orderIds = orders.map(o => o.id)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        cleaning_status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds)
    
    if (updateError) throw updateError
    
    const count = orders.length
    if (count > 0) {
      logger.warn(`Auto-completed ${count} orders that partners didn't mark`)
    }
    
    return count
  } catch (error) {
    logger.error('Failed to auto-complete orders:', error)
    throw error
  }
}

/**
 * Get orders needing reminders (24h before appointment)
 */
export async function getOrdersNeedingReminders(): Promise<any[]> {
  try {
    const supabase = getServiceClient()
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0))
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999))
    
    // Get orders with user details
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles:user_id (
          email,
          phone
        )
      `)
      .eq('service_type', 'CLEANING')
      .eq('cleaning_status', 'scheduled')
      .gte('scheduled_time', tomorrowStart.toISOString())
      .lte('scheduled_time', tomorrowEnd.toISOString())
      .eq('reminder_sent', false)
    
    if (error) throw error
    
    return orders || []
  } catch (error) {
    logger.error('Failed to get orders needing reminders:', error)
    throw error
  }
}
