/**
 * Order State Machine
 * Phase 1, Week 1, Days 2-4
 * 
 * Implements unified state transitions for laundry (quote-first) and 
 * cleaning (pay-to-book) services with validation and action helpers.
 */

export type OrderStatus =
  | 'scheduled'           // booked, future
  | 'picked_up'           // items collected (laundry) / crew en route (cleaning optional)
  | 'at_facility'         // laundry only (intake)
  | 'quote_sent'          // laundry only
  | 'awaiting_payment'    // laundry only (after quote_sent)
  | 'processing'          // laundry processing / cleaning in progress
  | 'out_for_delivery'    // laundry only (return trip)
  | 'delivered'           // laundry terminal
  | 'cleaned'             // cleaning terminal
  | 'canceled';           // any service

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
  'cleaned',
  'canceled'
];

/**
 * Statuses where cancellation is allowed
 */
export const CANCELLABLE_STATUSES: OrderStatus[] = [
  'scheduled',
  'picked_up',
  'at_facility',
  'quote_sent',
  'awaiting_payment'
];

/**
 * Status display labels for UI
 */
export const STATUS_LABELS: Record<OrderStatus, string> = {
  scheduled: 'Scheduled',
  picked_up: 'Picked Up',
  at_facility: 'At Facility',
  quote_sent: 'Quote Sent',
  awaiting_payment: 'Awaiting Payment',
  processing: 'Processing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cleaned: 'Completed',
  canceled: 'Canceled'
};

/**
 * Status colors for UI badges
 */
export const STATUS_COLORS: Record<OrderStatus, string> = {
  scheduled: 'blue',
  picked_up: 'yellow',
  at_facility: 'yellow',
  quote_sent: 'purple',
  awaiting_payment: 'orange',
  processing: 'indigo',
  out_for_delivery: 'blue',
  delivered: 'green',
  cleaned: 'green',
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
  { from: 'scheduled', to: 'picked_up', service: 'LAUNDRY' },
  { from: 'picked_up', to: 'at_facility', service: 'LAUNDRY' },
  { from: 'at_facility', to: 'quote_sent', service: 'LAUNDRY' },
  { from: 'quote_sent', to: 'awaiting_payment', service: 'LAUNDRY' },
  { 
    from: 'awaiting_payment', 
    to: 'processing', 
    service: 'LAUNDRY',
    condition: (order) => !!order.paid_at
  },
  { from: 'processing', to: 'out_for_delivery', service: 'LAUNDRY' },
  { from: 'out_for_delivery', to: 'delivered', service: 'LAUNDRY' },
  
  // Cleaning transitions
  { from: 'scheduled', to: 'processing', service: 'CLEANING' },
  { from: 'processing', to: 'cleaned', service: 'CLEANING' },
  
  // Cancellation (any service, pre-terminal)
  { from: 'scheduled', to: 'canceled' },
  { from: 'picked_up', to: 'canceled' },
  { from: 'at_facility', to: 'canceled' },
  { from: 'quote_sent', to: 'canceled' },
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
  if (status === 'scheduled') {
    actions.push('edit', 'cancel');
  }
  
  if (status === 'awaiting_payment') {
    actions.push('pay_quote');
  }
  
  if (['picked_up', 'at_facility', 'processing', 'out_for_delivery'].includes(status)) {
    actions.push('track');
  }
  
  if (['delivered', 'cleaned'].includes(status)) {
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
 */
export function getStatusSection(status: OrderStatus): 'upcoming' | 'in_progress' | 'completed' | 'canceled' {
  if (status === 'scheduled') return 'upcoming';
  if (status === 'canceled') return 'canceled';
  if (['delivered', 'cleaned'].includes(status)) return 'completed';
  return 'in_progress';
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
    'scheduled',
    'picked_up',
    'at_facility',
    'quote_sent',
    'awaiting_payment',
    'processing',
    'out_for_delivery',
    'delivered'
  ];
  
  const cleaningFlow: OrderStatus[] = [
    'scheduled',
    'processing',
    'cleaned'
  ];
  
  const flow = service === 'LAUNDRY' ? laundryFlow : cleaningFlow;
  const index = flow.indexOf(status);
  
  if (index === -1) return 0;
  if (status === 'canceled') return 0;
  
  return Math.round((index / (flow.length - 1)) * 100);
}

/**
 * Legacy status mapping for backward compatibility
 */
export function mapLegacyStatus(legacyStatus: string): OrderStatus {
  const mapping: Record<string, OrderStatus> = {
    'pending_pickup': 'scheduled',
    'paid_processing': 'processing',
    'completed': 'delivered', // Default to delivered, may need service context
  };
  
  return (mapping[legacyStatus] || legacyStatus) as OrderStatus;
}

/**
 * Map unified status back to legacy
 */
export function mapToLegacyStatus(status: OrderStatus): string {
  const mapping: Record<OrderStatus, string> = {
    'scheduled': 'pending_pickup',
    'processing': 'paid_processing',
    'delivered': 'completed',
    'cleaned': 'completed',
    'picked_up': 'picked_up',
    'at_facility': 'at_facility',
    'quote_sent': 'quote_sent',
    'awaiting_payment': 'awaiting_payment',
    'out_for_delivery': 'out_for_delivery',
    'canceled': 'canceled'
  };
  
  return mapping[status] || status;
}
