/**
 * Order State Machine - Legacy System
 * 
 * Updated to work with migration 009 statuses.
 * Implements order lifecycle for laundry (quote-first) and 
 * cleaning (pay-to-book) services with improved status tracking.
 */

// Legacy status names matching migration 009
export type OrderStatus =
  | 'pending'             // Initial state
  | 'pending_pickup'      // Scheduled for pickup
  | 'at_facility'         // Laundry: items at facility
  | 'awaiting_payment'    // Laundry: quote sent, waiting for payment
  | 'paid_processing'     // Laundry: paid, being processed
  | 'in_progress'         // NEW: Active work (laundry processing or cleaning in progress)
  | 'out_for_delivery'    // NEW: Laundry returning to customer
  | 'delivered'           // NEW: Laundry items returned (terminal for laundry)
  | 'completed'           // Cleaning finished (terminal for cleaning)
  | 'canceled';           // Canceled (terminal)

export type ServiceType = 'LAUNDRY' | 'CLEANING';

export type Action = 
  | 'view'
  | 'edit'
  | 'cancel'
  | 'pay_quote'
  | 'track'
  | 'rate'
  | 'rebook';

/**
 * Terminal statuses where no further transitions are possible
 */
export const TERMINAL_STATUSES: OrderStatus[] = [
  'delivered',
  'completed',
  'canceled'
];

/**
 * Statuses where cancellation is allowed
 */
export const CANCELLABLE_STATUSES: OrderStatus[] = [
  'pending',
  'pending_pickup',
  'at_facility',
  'awaiting_payment'
];

/**
 * Status display labels for UI
 */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  pending_pickup: 'Pending Pickup',
  at_facility: 'At Facility',
  awaiting_payment: 'Awaiting Payment',
  paid_processing: 'Processing',
  in_progress: 'In Progress',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  canceled: 'Canceled'
};

/**
 * Status colors for UI badges
 */
export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'blue',
  pending_pickup: 'blue',
  at_facility: 'yellow',
  awaiting_payment: 'orange',
  paid_processing: 'indigo',
  in_progress: 'indigo',
  out_for_delivery: 'blue',
  delivered: 'green',
  completed: 'green',
  canceled: 'red'
};

interface TransitionRule {
  from: OrderStatus;
  to: OrderStatus;
  service?: ServiceType;
  condition?: (order: any) => boolean;
}

/**
 * Valid state transitions
 */
const TRANSITIONS: TransitionRule[] = [
  // Laundry transitions
  { from: 'pending', to: 'pending_pickup', service: 'LAUNDRY' },
  { from: 'pending_pickup', to: 'at_facility', service: 'LAUNDRY' },
  { from: 'at_facility', to: 'awaiting_payment', service: 'LAUNDRY' },
  { 
    from: 'awaiting_payment', 
    to: 'paid_processing', 
    service: 'LAUNDRY',
    condition: (order) => !!order.paid_at
  },
  { from: 'paid_processing', to: 'in_progress', service: 'LAUNDRY' },
  { from: 'in_progress', to: 'out_for_delivery', service: 'LAUNDRY' },
  { from: 'out_for_delivery', to: 'delivered', service: 'LAUNDRY' },
  
  // Cleaning transitions
  { from: 'pending', to: 'pending_pickup', service: 'CLEANING' },
  { from: 'pending_pickup', to: 'in_progress', service: 'CLEANING' },
  { from: 'in_progress', to: 'completed', service: 'CLEANING' },
  
  // Cancellation (any service, pre-terminal)
  { from: 'pending', to: 'canceled' },
  { from: 'pending_pickup', to: 'canceled' },
  { from: 'at_facility', to: 'canceled' },
  { from: 'awaiting_payment', to: 'canceled' },
];

/**
 * Check if a status transition is valid
 */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  service: ServiceType,
  order?: any
): boolean {
  const rule = TRANSITIONS.find(
    r => r.from === from && 
         r.to === to && 
         (!r.service || r.service === service)
  );
  
  if (!rule) return false;
  if (rule.condition && order) return rule.condition(order);
  return true;
}

/**
 * Get all possible next statuses from current status
 */
export function getNextStatuses(
  current: OrderStatus,
  service: ServiceType
): OrderStatus[] {
  return TRANSITIONS
    .filter(r => r.from === current && (!r.service || r.service === service))
    .map(r => r.to);
}

/**
 * Get available actions for a given status
 */
export function getAvailableActions(
  status: OrderStatus,
  service: ServiceType
): Action[] {
  const actions: Action[] = [];
  
  // View is always available
  actions.push('view');
  
  // Status-specific actions
  if (status === 'pending' || status === 'pending_pickup') {
    actions.push('edit', 'cancel');
  }
  
  if (status === 'awaiting_payment') {
    actions.push('pay_quote');
  }
  
  if (['at_facility', 'paid_processing', 'in_progress', 'out_for_delivery'].includes(status)) {
    actions.push('track');
  }
  
  if (['delivered', 'completed'].includes(status)) {
    actions.push('rate', 'rebook');
  }
  
  return actions;
}

/**
 * Check if status is terminal (no further transitions possible)
 */
export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Check if order can be canceled
 */
export function isCancellable(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

/**
 * Get status display label
 */
export function getStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: OrderStatus): string {
  return STATUS_COLORS[status] || 'gray';
}

/**
 * Group statuses by section for orders list
 * CRITICAL: Orders only show as "completed" when truly done:
 * - LAUNDRY: status === 'delivered'
 * - CLEANING: status === 'completed'
 */
export function getStatusSection(status: OrderStatus): 'upcoming' | 'in_progress' | 'completed' | 'canceled' {
  if (status === 'pending' || status === 'pending_pickup') return 'upcoming';
  if (status === 'canceled') return 'canceled';
  if (status === 'delivered' || status === 'completed') return 'completed';
  return 'in_progress'; // at_facility, awaiting_payment, paid_processing, in_progress, out_for_delivery
}

/**
 * Validate state transition with error message
 */
export function validateTransition(
  from: OrderStatus,
  to: OrderStatus,
  service: ServiceType,
  order?: any
): { valid: boolean; error?: string } {
  if (from === to) {
    return { valid: true }; // No-op transition
  }
  
  if (isTerminal(from)) {
    return {
      valid: false,
      error: `Cannot transition from terminal status: ${from}`
    };
  }
  
  if (!canTransition(from, to, service, order)) {
    return {
      valid: false,
      error: `Invalid transition from ${from} to ${to} for ${service} service`
    };
  }
  
  return { valid: true };
}

/**
 * Get progress percentage for status
 */
export function getProgress(status: OrderStatus, service: ServiceType): number {
  const laundryFlow: OrderStatus[] = [
    'pending',
    'pending_pickup',
    'at_facility',
    'awaiting_payment',
    'paid_processing',
    'in_progress',
    'out_for_delivery',
    'delivered'
  ];
  
  const cleaningFlow: OrderStatus[] = [
    'pending',
    'pending_pickup',
    'in_progress',
    'completed'
  ];
  
  const flow = service === 'LAUNDRY' ? laundryFlow : cleaningFlow;
  const index = flow.indexOf(status);
  
  if (index === -1) return 0;
  if (status === 'canceled') return 0;
  
  return Math.round((index / (flow.length - 1)) * 100);
}

/**
 * Legacy uppercase status mapping for backward compatibility
 * Maps old UPPERCASE statuses to current lowercase statuses
 */
export function mapLegacyStatus(legacyStatus: string): OrderStatus {
  const mapping: Record<string, OrderStatus> = {
    'PENDING': 'pending',
    'PAID': 'paid_processing',
    'RECEIVED': 'at_facility',
    'IN_PROGRESS': 'in_progress',
    'READY': 'out_for_delivery',
    'OUT_FOR_DELIVERY': 'out_for_delivery',
    'DELIVERED': 'delivered',
    'CANCELED': 'canceled',
    'REFUNDED': 'canceled',
  };
  
  return (mapping[legacyStatus] || legacyStatus.toLowerCase()) as OrderStatus;
}
