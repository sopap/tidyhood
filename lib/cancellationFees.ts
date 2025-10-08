/**
 * Cancellation & Rescheduling Fee Calculation
 * 
 * Handles all business logic for determining fees, refunds, and eligibility
 * for order cancellations and rescheduling.
 */

export interface Order {
  id: string
  user_id: string
  service_type: 'LAUNDRY' | 'CLEANING'
  status: string
  slot_start: string
  slot_end: string
  total_cents: number
  paid_at?: string
  payment_id?: string
  partner_id: string
}

export interface CancellationPolicy {
  canCancel: boolean
  canReschedule: boolean
  requiresNotice: boolean
  noticeHours: number
  cancellationFee: number
  rescheduleFee: number
  refundAmount: number
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
 * Calculate comprehensive cancellation policy for an order
 */
export function getCancellationPolicy(order: Order): CancellationPolicy {
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
  
  // Laundry (unpaid) - always free to modify
  if (order.service_type === 'LAUNDRY') {
    return {
      canCancel: true,
      canReschedule: true,
      requiresNotice: false,
      noticeHours: 0,
      cancellationFee: 0,
      rescheduleFee: 0,
      refundAmount: 0, // No refund because no payment made yet
      reason: 'Free cancellation/rescheduling for unpaid laundry orders'
    }
  }
  
  // Cleaning (paid) - Updated policy: Free reschedule >24h, 15% cancel fee >24h, no changes <24h
  if (order.service_type === 'CLEANING') {
    const feePercent = 0.15
    const cancellationFee = Math.round(order.total_cents * feePercent)
    const withinNoticeWindow = hoursUntilSlot >= 24
    
    if (!withinNoticeWindow) {
      // Within 24 hours - no changes allowed
      return {
        canCancel: false,
        canReschedule: false,
        requiresNotice: true,
        noticeHours: 24,
        cancellationFee: 0,
        rescheduleFee: 0,
        refundAmount: 0,
        reason: 'No changes allowed within 24 hours of service time'
      }
    }
    
    // 24+ hours notice - reschedule free, cancel with 15% fee
    return {
      canCancel: true,
      canReschedule: true,
      requiresNotice: true,
      noticeHours: 24,
      cancellationFee: cancellationFee,
      rescheduleFee: 0, // Free rescheduling
      refundAmount: order.total_cents - cancellationFee,
      reason: 'Free rescheduling with 24+ hours notice. Cancellations incur a 15% fee.'
    }
  }
  
  // Unknown service type
  return {
    canCancel: false,
    canReschedule: false,
    requiresNotice: false,
    noticeHours: 0,
    cancellationFee: 0,
    rescheduleFee: 0,
    refundAmount: 0,
    reason: 'Unknown service type'
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
 * Format deadline for display
 */
export function formatDeadline(deadline: Date): string {
  const now = new Date()
  const isToday = deadline.toDateString() === now.toDateString()
  const isTomorrow = deadline.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString()
  
  const timeStr = deadline.toLocaleTimeString('en-US', {
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
export function validateModification(
  order: Order,
  modificationType: 'cancel' | 'reschedule'
): void {
  const policy = getCancellationPolicy(order)
  
  if (modificationType === 'cancel' && !policy.canCancel) {
    throw new Error(policy.reason || 'Cannot cancel this order')
  }
  
  if (modificationType === 'reschedule' && !policy.canReschedule) {
    throw new Error(policy.reason || 'Cannot reschedule this order')
  }
}

/**
 * Get cancellation policy summary for display
 */
export function getPolicySummary(serviceType: 'LAUNDRY' | 'CLEANING'): string {
  if (serviceType === 'LAUNDRY') {
    return 'Free cancellation or rescheduling anytime before pickup'
  }
  
  return 'Free rescheduling with 24+ hours notice. Cancellations incur a 15% fee with 24+ hours notice. No changes allowed within 24 hours of service.'
}
