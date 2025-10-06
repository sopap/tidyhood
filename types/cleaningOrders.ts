/**
 * Cleaning Order Types
 * 
 * Service-specific types for the cleaning order workflow with
 * granular status tracking and dispute management.
 */

// ============================================================================
// Status Types
// ============================================================================

/**
 * Laundry-specific statuses (quote-first workflow)
 */
export type LaundryStatus =
  | 'pending'
  | 'pending_pickup'
  | 'at_facility'
  | 'awaiting_payment'
  | 'paid_processing'
  | 'in_progress'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'canceled';

/**
 * Cleaning-specific statuses (pay-to-book workflow)
 */
export type CleaningStatus =
  | 'pending'           // Order created, awaiting assignment
  | 'assigned'          // Partner assigned
  | 'en_route'          // Partner traveling to location
  | 'on_site'           // Partner arrived
  | 'in_progress'       // Cleaning started
  | 'completed'         // Cleaning finished
  | 'canceled'          // Order canceled
  | 'cleaner_no_show'   // Partner failed to arrive
  | 'customer_no_show'  // Customer not available
  | 'disputed'          // Customer opened dispute
  | 'refunded';         // Dispute resolved with refund

/**
 * Union of all possible order statuses
 */
export type OrderStatus = LaundryStatus | CleaningStatus;

/**
 * Actor roles for status transitions
 */
export type ActorRole = 'customer' | 'partner' | 'admin' | 'system';

/**
 * Resolution types for disputes
 */
export type ResolutionType = 'refund' | 'completed' | 'dismissed';

/**
 * No-show types
 */
export type NoShowType = 'cleaner' | 'customer';

// ============================================================================
// Proof/Evidence Types
// ============================================================================

export interface ProofPhoto {
  type: 'photo';
  url: string;
  caption?: string;
  timestamp?: string;
}

export interface ProofNote {
  type: 'note';
  text: string;
  timestamp?: string;
}

export type ProofItem = ProofPhoto | ProofNote;

// ============================================================================
// Base Order Interface
// ============================================================================

export interface BaseOrder {
  id: string;
  user_id: string;
  service_type: 'LAUNDRY' | 'CLEANING';
  status: OrderStatus;
  partner_id: string | null;
  slot_start: string;
  slot_end: string;
  subtotal_cents: number;
  tax_cents: number;
  delivery_cents: number;
  total_cents: number;
  address_snapshot: {
    line1: string;
    line2?: string;
    city: string;
    zip: string;
    notes?: string;
  };
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Service-Specific Order Interfaces
// ============================================================================

/**
 * Laundry Order (existing workflow)
 */
export interface LaundryOrder extends BaseOrder {
  service_type: 'LAUNDRY';
  status: LaundryStatus;
  order_details: {
    lbs?: number;
    items?: string[];
  };
  quote_cents?: number | null;
  actual_weight_lbs?: number | null;
  quoted_at?: string | null;
  paid_at?: string | null;
  partner_notes?: string | null;
  intake_photos_json?: string[] | null;
  outtake_photos_json?: string[] | null;
}

/**
 * Cleaning Order (new workflow with enhanced tracking)
 */
export interface CleaningOrder extends BaseOrder {
  service_type: 'CLEANING';
  status: CleaningStatus;
  order_details: {
    bedrooms: number;
    bathrooms: number;
    deep?: boolean;
    addons?: string[];
    square_feet?: number;
  };
  
  // Assignment tracking
  assigned_at?: string | null;
  
  // Location tracking
  en_route_at?: string | null;
  on_site_at?: string | null;
  
  // Work tracking
  started_at?: string | null;
  completed_at?: string | null;
  
  // Dispute management
  disputed_at?: string | null;
  dispute_reason?: string | null;
  resolved_at?: string | null;
  resolution_type?: ResolutionType | null;
  
  // Evidence/proof
  proof?: ProofItem[];
  
  // No-show tracking
  no_show_reported_at?: string | null;
  no_show_type?: NoShowType | null;
}

/**
 * Discriminated union for type safety
 */
export type Order = LaundryOrder | CleaningOrder;

// ============================================================================
// Action Types
// ============================================================================

/**
 * Available actions for cleaning orders
 */
export type CleaningAction =
  | 'assign'
  | 'en_route'
  | 'arrive'
  | 'start'
  | 'complete'
  | 'cancel'
  | 'mark_cleaner_no_show'
  | 'mark_customer_no_show'
  | 'open_dispute'
  | 'resolve_dispute_complete'
  | 'resolve_dispute_refund';

/**
 * Available actions for laundry orders
 */
export type LaundryAction =
  | 'mark_pending_pickup'
  | 'mark_at_facility'
  | 'send_quote'
  | 'mark_paid'
  | 'start_processing'
  | 'mark_out_for_delivery'
  | 'mark_delivered'
  | 'cancel';

export type OrderAction = CleaningAction | LaundryAction;

// ============================================================================
// Transition Request/Response Types
// ============================================================================

/**
 * Request payload for status transitions
 */
export interface TransitionRequest {
  action: OrderAction;
  metadata?: {
    partner_id?: string;
    reason?: string;
    proof?: ProofItem[];
    quote_cents?: number;
    actual_weight_lbs?: number;
    [key: string]: any;
  };
}

/**
 * Response from transition function
 */
export interface TransitionResponse {
  success: boolean;
  order_id?: string;
  old_status?: OrderStatus;
  new_status?: OrderStatus;
  action?: OrderAction;
  message?: string;
  error?: string;
  hint?: string;
  detail?: string;
}

// ============================================================================
// Audit Event Types
// ============================================================================

export interface OrderEvent {
  id: string;
  order_id: string;
  action: OrderAction;
  actor_id: string | null;
  actor_role: ActorRole;
  old_status: OrderStatus | null;
  new_status: OrderStatus;
  metadata: Record<string, any>;
  created_at: string;
}

// ============================================================================
// Timeline/Stage Types for UI
// ============================================================================

/**
 * Primary stages for cleaning timeline (customer view)
 */
export type CleaningStage = 'scheduled' | 'in_progress' | 'completed';

/**
 * Sub-states that map to primary stages
 */
export interface CleaningStageMapping {
  stage: CleaningStage;
  statuses: CleaningStatus[];
  label: string;
  icon: string;
}

export const CLEANING_STAGES: CleaningStageMapping[] = [
  {
    stage: 'scheduled',
    statuses: ['pending', 'assigned', 'en_route', 'on_site'],
    label: 'Scheduled',
    icon: '📅',
  },
  {
    stage: 'in_progress',
    statuses: ['in_progress'],
    label: 'Cleaning in Progress',
    icon: '🧹',
  },
  {
    stage: 'completed',
    statuses: ['completed'],
    label: 'Completed',
    icon: '✅',
  },
];

/**
 * Stage-specific descriptions for timeline display
 * These describe the STAGE, not the current order status
 */
export const CLEANING_STAGE_DESCRIPTIONS: Record<CleaningStage, string> = {
  scheduled: "Your cleaner will arrive during the scheduled time window.",
  in_progress: "Your cleaning is currently underway.",
  completed: "Your cleaning has been completed. Thank you for using TidyHood!",
};

// ============================================================================
// Status Display Configuration
// ============================================================================

export interface StatusConfig {
  label: string;
  color: 'blue' | 'yellow' | 'green' | 'red' | 'orange' | 'purple' | 'gray';
  icon: string;
  description: string;
}

export const CLEANING_STATUS_CONFIG: Record<CleaningStatus, StatusConfig> = {
  pending: {
    label: 'Pending Assignment',
    color: 'blue',
    icon: '⏳',
    description: 'Waiting for partner assignment',
  },
  assigned: {
    label: 'Assigned',
    color: 'blue',
    icon: '👤',
    description: 'Partner assigned to your order',
  },
  en_route: {
    label: 'En Route',
    color: 'yellow',
    icon: '🚗',
    description: 'Partner is on the way',
  },
  on_site: {
    label: 'On Site',
    color: 'yellow',
    icon: '📍',
    description: 'Partner has arrived',
  },
  in_progress: {
    label: 'In Progress',
    color: 'purple',
    icon: '🧹',
    description: 'Cleaning is underway',
  },
  completed: {
    label: 'Completed',
    color: 'green',
    icon: '✅',
    description: 'Cleaning completed successfully',
  },
  canceled: {
    label: 'Canceled',
    color: 'gray',
    icon: '❌',
    description: 'Order was canceled',
  },
  cleaner_no_show: {
    label: 'Cleaner No-Show',
    color: 'red',
    icon: '⚠️',
    description: 'Partner did not arrive',
  },
  customer_no_show: {
    label: 'Customer No-Show',
    color: 'orange',
    icon: '⚠️',
    description: 'Customer was not available',
  },
  disputed: {
    label: 'Under Review',
    color: 'orange',
    icon: '🔍',
    description: 'Dispute is being reviewed',
  },
  refunded: {
    label: 'Refunded',
    color: 'green',
    icon: '💰',
    description: 'Payment has been refunded',
  },
};

// ============================================================================
// Helper Type Guards
// ============================================================================

export function isCleaningOrder(order: Order): order is CleaningOrder {
  return order.service_type === 'CLEANING';
}

export function isLaundryOrder(order: Order): order is LaundryOrder {
  return order.service_type === 'LAUNDRY';
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return ['completed', 'delivered', 'canceled', 'cleaner_no_show', 'customer_no_show', 'refunded'].includes(status);
}

export function isActiveStatus(status: CleaningStatus): boolean {
  return ['assigned', 'en_route', 'on_site', 'in_progress'].includes(status);
}

export function canOpenDispute(order: CleaningOrder): boolean {
  if (order.status === 'in_progress') return true;
  if (order.status === 'completed' && order.completed_at) {
    const completedDate = new Date(order.completed_at);
    const daysSinceCompletion = (Date.now() - completedDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCompletion <= 7;
  }
  return false;
}

// ============================================================================
// Legacy Status Mapping
// ============================================================================

/**
 * Map legacy/laundry statuses to cleaning statuses for backward compatibility
 * 
 * This allows existing orders with old statuses to work with the new Cleaning V2 UI
 * without requiring a data migration.
 */
export function mapToCleaningStatus(dbStatus: string): CleaningStatus {
  const statusLower = dbStatus.toLowerCase();
  
  // Direct matches (already cleaning statuses)
  const cleaningStatuses: CleaningStatus[] = [
    'pending', 'assigned', 'en_route', 'on_site', 'in_progress',
    'completed', 'canceled', 'cleaner_no_show', 'customer_no_show',
    'disputed', 'refunded'
  ];
  
  if (cleaningStatuses.includes(statusLower as CleaningStatus)) {
    return statusLower as CleaningStatus;
  }
  
  // Map legacy/laundry statuses to cleaning equivalents
  const legacyMapping: Record<string, CleaningStatus> = {
    // Laundry statuses
    'pending_pickup': 'pending',
    'at_facility': 'in_progress',
    'awaiting_payment': 'pending',
    'paid_processing': 'in_progress',
    'processing': 'in_progress',
    'out_for_delivery': 'in_progress',
    'delivered': 'completed',
    'received': 'in_progress',
    'ready': 'in_progress',
    'paid': 'pending', // Order paid but not started yet
    
    // Other possible legacy statuses
    'scheduled': 'pending',
    'confirmed': 'assigned',
    'active': 'in_progress',
    'done': 'completed',
    'cancelled': 'canceled', // British spelling
  };
  
  return legacyMapping[statusLower] || 'pending'; // Safe fallback
}

/**
 * Get status config with fallback for unknown statuses
 */
export function getCleaningStatusConfig(status: string): StatusConfig {
  const mappedStatus = mapToCleaningStatus(status);
  return CLEANING_STATUS_CONFIG[mappedStatus] || CLEANING_STATUS_CONFIG.pending;
}

// ============================================================================
// SLA/Metric Types
// ============================================================================

export interface CleaningMetrics {
  order_id: string;
  time_to_assign_minutes?: number;
  time_to_arrival_minutes?: number;
  time_on_site_before_start_minutes?: number;
  cleaning_duration_minutes?: number;
  total_time_minutes?: number;
  on_time_arrival: boolean;
  sla_violations: string[];
}

export interface SLAThresholds {
  max_arrival_delay_minutes: number;  // 15 minutes
  max_pre_start_delay_minutes: number; // 10 minutes
  expected_cleaning_minutes: number;   // Based on order size
}
