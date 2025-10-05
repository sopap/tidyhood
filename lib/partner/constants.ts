/**
 * Constants for Partner Portal operations
 * Centralized configuration for quotes, pricing, and business rules
 */

// Quote Limits
export const QUOTE_LIMITS = {
  MIN_TOTAL: 10, // Minimum quote amount in dollars
  MAX_TOTAL: 500, // Maximum quote amount in dollars
  MIN_WEIGHT: 1, // Minimum weight in lbs (laundry)
  MAX_WEIGHT: 100, // Maximum weight in lbs (laundry)
  MIN_TIME: 30, // Minimum time in minutes (cleaning)
  MAX_TIME: 480, // Maximum time in minutes (8 hours)
  DEFAULT_EXPIRY_HOURS: 24, // Default quote expiry time
} as const;

// Pricing - Laundry
export const LAUNDRY_PRICING = {
  PER_LB: 2.50, // Base price per pound
  BAG_FEE: 2.00, // Fee per bag
  BEDDING_SURCHARGE: 5.00, // Surcharge for bedding items
  DELICATES_SURCHARGE: 3.00, // Surcharge for delicate items
  
  // Addons
  FOLD_PACKAGE: 5.00,
  SAME_DAY: 10.00,
  ECO_DETERGENT: 3.00,
} as const;

// Pricing - Cleaning
export const CLEANING_PRICING = {
  PER_MINUTE: 1.00, // Base price per minute
  
  // Additional Addons (beyond customer-selected)
  DEEP_CLEAN: { minutes: 30, price: 25.00 },
  INSIDE_FRIDGE: { minutes: 15, price: 15.00 },
  INSIDE_OVEN: { minutes: 15, price: 15.00 },
  INSIDE_CABINETS: { minutes: 20, price: 20.00 },
} as const;

// Status Transitions - Valid paths for partners
export const VALID_PARTNER_TRANSITIONS = {
  pending_quote: ['in_progress'], // After quote accepted by customer
  quote_sent: ['in_progress'], // If auto-accepted
  in_progress: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
} as const;

// Order Status Display
export const STATUS_LABELS = {
  pending_quote: 'Pending Quote',
  quote_sent: 'Quote Sent',
  in_progress: 'In Progress',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
} as const;

export const STATUS_COLORS = {
  pending_quote: 'bg-blue-100 text-blue-800',
  quote_sent: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  out_for_delivery: 'bg-orange-100 text-orange-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
} as const;

// Service Types
export const SERVICE_TYPES = {
  LAUNDRY: 'laundry',
  CLEANING: 'cleaning',
  DRYCLEAN: 'dryclean',
} as const;

// Capacity Colors (utilization percentage)
export const CAPACITY_COLORS = {
  LOW: 'text-green-600', // < 50%
  MEDIUM: 'text-yellow-600', // 50-80%
  HIGH: 'text-red-600', // > 80%
} as const;

export function getCapacityColor(utilization: number): string {
  if (utilization < 50) return CAPACITY_COLORS.LOW;
  if (utilization < 80) return CAPACITY_COLORS.MEDIUM;
  return CAPACITY_COLORS.HIGH;
}

// Validation Messages
export const VALIDATION_MESSAGES = {
  QUOTE_TOO_LOW: `Quote total must be at least $${QUOTE_LIMITS.MIN_TOTAL}`,
  QUOTE_TOO_HIGH: `Quote total exceeds maximum ($${QUOTE_LIMITS.MAX_TOTAL})`,
  WEIGHT_TOO_LOW: `Weight must be at least ${QUOTE_LIMITS.MIN_WEIGHT} lb`,
  WEIGHT_TOO_HIGH: `Weight cannot exceed ${QUOTE_LIMITS.MAX_WEIGHT} lbs`,
  TIME_TOO_LOW: `Time must be at least ${QUOTE_LIMITS.MIN_TIME} minutes`,
  TIME_TOO_HIGH: `Time cannot exceed ${QUOTE_LIMITS.MAX_TIME} minutes`,
  INVALID_TRANSITION: 'This status change is not allowed',
  REQUIRED_FIELD: 'This field is required',
} as const;

// Time Formats
export const TIME_FORMATS = {
  DATE_DISPLAY: { month: 'short', day: 'numeric', year: 'numeric' } as const,
  TIME_DISPLAY: { hour: 'numeric', minute: '2-digit' } as const,
  DATETIME_DISPLAY: { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit' 
  } as const,
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;
