/**
 * Cancellation & Rescheduling Fee Calculation
 * 
 * Handles all business logic for determining fees, refunds, and eligibility
 * for order cancellations and rescheduling.
 * 
 * MIGRATION 035: Now reads from database instead of hardcoded values
 */

import { getServiceClient } from '@/lib/db'

export interface Order {
  id: string
  user_id: string | null  // Nullable for guest orders (Migration 035)
  service_type: 'LAUNDRY' | 'CLEANING'
  status: string
  slot_start: string
  slot_end: string
  total_cents: number
  paid_at?: string
  payment_id?: string
  partner_id: string
  policy_id: string | null  // FK to cancellation_policies (Migration 035)
}

export interface CancellationPolicy {
  canCancel: boolean
  canReschedule: boolean
  requiresNotice: boolean
  noticeHours: number
  cancellationFee: number
  rescheduleFee: number
  refundAmount: number
  policyVersion?: number  // Policy version locked at booking time (Migration 035)
  reason?: string
}

/**
 * Statuses where modifications are allowed
 */
const MODIFIABLE_STATUSES = [
  'pending',
  'pending_pickup',
  'at_facility',
  'awaiting_payment'
]

/**
 * Get default fallback policy for orders without policy_id (pre-migration 035)
 * Uses original hardcoded values for backward compatibility
 */
function getDefaultPolicy(serviceType: 'LAUNDRY' | 'CLEANING'): {
  noticeHours: number
  cancellationFeePercent: number
  rescheduleFeePercent: number
  allowCancellation: boolean
  allowRescheduling: boolean
} {
  if (serviceType === 'LAUNDRY') {
    return {
      noticeHours: 0,
      cancellationFeePercent: 0,
      rescheduleFeePercent: 0,
      allowCancellation: true,
      allowRescheduling: true,
    }
  }
  
  // CLEANING defaults (original hardcoded values)
  return {
    noticeHours: 24,
    cancellationFeePercent: 0.15,  // 15%
    rescheduleFeePercent: 0,
    allowCancellation: true,
    allowRescheduling: true,
  }
}

/**
 * Calculate comprehensive cancellation policy for an order
 * Reads from database using policy locked at booking time (Migration 035)
 */
export async function getCancellationPolicy(order: Order): Promise<CancellationPolicy> {
  const now = new Date()
  const slotTime = new Date(order.slot_start)
  const hoursUntilSlot = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  // Check if order status allows modifications
  const canModify = MODIFIABLE_STATUSES.includes(order.status.toLowerCase())
  
  if (!canModify) {
    return {
      canCancel: false,
      canReschedule: false,
      requiresNotice: false,
      noticeHours: 0,
      cancellationFee: 0,
      rescheduleFee: 0,
      refundAmount: 0,
      reason: `Cannot modify order in ${order.status} status`
    }
  }
  
  // Check if service time has passed
  if (hoursUntilSlot < 0) {
    return {
      canCancel: false,
      canReschedule: false,
      requiresNotice: true,
      noticeHours: 24,
      cancellationFee: 0,
      rescheduleFee: 0,
      refundAmount: 0,
      reason: 'Service time has passed'
    }
  }
  
  // Fetch policy from database (policy locked at booking time)
  let policyData
  let policyVersion: number | undefined
  
  if (order.policy_id) {
    const db = getServiceClient()
    const { data: policy, error } = await db
      .from('cancellation_policies')
      .select('*')
      .eq('id', order.policy_id)
      .single()
    
    if (error || !policy) {
      console.warn(`[getCancellationPolicy] Policy ${order.policy_id} not found for order ${order.id}, using defaults`)
      policyData = getDefaultPolicy(order.service_type)
      policyVersion = undefined
    } else {
      policyData = {
        noticeHours: policy.notice_hours,
        cancellationFeePercent: policy.cancellation_fee_percent,
        rescheduleFeePercent: policy.reschedule_fee_percent,
        allowCancellation: policy.allow_cancellation,
        allowRescheduling: policy.allow_rescheduling,
      }
      policyVersion = policy.version
    }
  } else {
    // Old orders without policy_id (pre-migration 035)
    console.warn(`[getCancellationPolicy] No policy_id for order ${order.id}, using defaults`)
    policyData = getDefaultPolicy(order.service_type)
    policyVersion = undefined
  }
  
  // Calculate using database values (NOT hardcoded)
  const withinNoticeWindow = hoursUntilSlot >= policyData.noticeHours
  
  // Laundry (unpaid) - always free to modify
  if (order.service_type === 'LAUNDRY') {
    return {
      canCancel: policyData.allowCancellation,
      canReschedule: policyData.allowRescheduling,
      requiresNotice: policyData.noticeHours > 0,
      noticeHours: policyData.noticeHours,
      cancellationFee: 0,
      rescheduleFee: 0,
      refundAmount: 0, // No refund because no payment made yet
      policyVersion,
      reason: 'Free cancellation/rescheduling for unpaid laundry orders'
    }
  }
  
  // Cleaning (paid) - calculate using database values
  const cancellationFee = withinNoticeWindow 
    ? 0 
    : Math.round(order.total_cents * policyData.cancellationFeePercent)
  
  const rescheduleFee = withinNoticeWindow
    ? 0
    : Math.round(order.total_cents * policyData.rescheduleFeePercent)
  
  if (!withinNoticeWindow) {
    // Within notice window - can cancel with fee, may not reschedule
    const feePercent = Math.round(policyData.cancellationFeePercent * 100)
    return {
      canCancel: policyData.allowCancellation,
      canReschedule: false, // Too late to reschedule
      requiresNotice: true,
      noticeHours: policyData.noticeHours,
      cancellationFee,
      rescheduleFee: 0,
      refundAmount: order.total_cents - cancellationFee,
      policyVersion,
      reason: `Cancellations within ${policyData.noticeHours} hours incur a ${feePercent}% fee. Rescheduling not available.`
    }
  }
  
  // Sufficient notice - both cancel and reschedule are free
  return {
    canCancel: policyData.allowCancellation,
    canReschedule: policyData.allowRescheduling,
    requiresNotice: policyData.noticeHours > 0,
    noticeHours: policyData.noticeHours,
    cancellationFee: 0,
    rescheduleFee: 0,
    refundAmount: order.total_cents,
    policyVersion,
    reason: `Free rescheduling and cancellation with ${policyData.noticeHours}+ hours notice.`
  }
}

/**
 * Format monetary amount in cents to display string
 */
export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Calculate hours remaining until slot
 */
export function getHoursUntilSlot(slotStart: string): number {
  const now = new Date()
  const slot = new Date(slotStart)
  return (slot.getTime() - now.getTime()) / (1000 * 60 * 60)
}

/**
 * Check if sufficient notice was given (24 hours for cleanings)
 */
export function hasSufficientNotice(slotStart: string, requiredHours: number = 24): boolean {
  const hoursUntil = getHoursUntilSlot(slotStart)
  return hoursUntil >= requiredHours
}

/**
 * Get user-friendly time remaining message
 */
export function getTimeRemainingMessage(slotStart: string): string {
  const hours = getHoursUntilSlot(slotStart)
  
  if (hours < 0) {
    return 'Service time has passed'
  }
  
  if (hours < 1) {
    const minutes = Math.floor(hours * 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`
  }
  
  if (hours < 24) {
    const roundedHours = Math.floor(hours)
    return `${roundedHours} hour${roundedHours !== 1 ? 's' : ''} remaining`
  }
  
  if (hours < 48) {
    return 'Less than 2 days'
  }
  
  const days = Math.floor(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} remaining`
}

/**
 * Calculate deadline for free cancellation (24 hours before slot)
 */
export function getFreeChangeDeadline(slotStart: string): Date {
  const slot = new Date(slotStart)
  return new Date(slot.getTime() - 24 * 60 * 60 * 1000)
}

/**
 * Format deadline for display (uses NY ET timezone)
 */
export function formatDeadline(deadline: Date): string {
  const now = new Date()
  const isToday = deadline.toDateString() === now.toDateString()
  const isTomorrow = deadline.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()
  
  const timeStr = deadline.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  
  if (isToday) {
    return `Today at ${timeStr}`
  }
  
  if (isTomorrow) {
    return `Tomorrow at ${timeStr}`
  }
  
  const dateStr = deadline.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  })
  
  return `${dateStr} at ${timeStr}`
}

/**
 * Validate that a cancellation/reschedule is allowed
 * Throws error if not allowed
 */
export async function validateModification(
  order: Order,
  modificationType: 'cancel' | 'reschedule'
): Promise<void> {
  const policy = await getCancellationPolicy(order)
  
  if (modificationType === 'cancel' && !policy.canCancel) {
    throw new Error(policy.reason || 'Cannot cancel this order')
  }
  
  if (modificationType === 'reschedule' && !policy.canReschedule) {
    throw new Error(policy.reason || 'Cannot reschedule this order')
  }
}

/**
 * Get cancellation policy summary for display
 * Note: This is a simplified sync version. For accurate policy details,
 * use the GET /api/policies/cancellation endpoint
 */
export function getPolicySummary(serviceType: 'LAUNDRY' | 'CLEANING'): string {
  if (serviceType === 'LAUNDRY') {
    return 'Free cancellation or rescheduling anytime before pickup'
  }
  
  // Note: This returns default summary. Actual policy may vary.
  // Use /api/policies/cancellation for real-time policy details
  return 'Free rescheduling with notice. Cancellation fees may apply within notice window.'
}
