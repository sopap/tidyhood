// Core type definitions for booking flow

// Partner Capabilities
export type LaundryCapability = 'wash_fold' | 'dry_clean' | 'mixed';
export type CleaningCapability = 'standard' | 'deep_clean' | 'move_in_out' | 'post_construction' | 'commercial';

export interface PartnerCapabilities {
  // For LAUNDRY partners
  wash_fold?: boolean;
  dry_clean?: boolean;
  mixed?: boolean;
  
  // For CLEANING partners
  standard?: boolean;
  deep_clean?: boolean;
  move_in_out?: boolean;
  post_construction?: boolean;
  commercial?: boolean;
}

export interface ServiceAvailability {
  service_type: 'LAUNDRY' | 'CLEANING';
  zip_code: string;
  available_capabilities: string[];
  unavailable_capabilities: string[];
  partner_count: number;
}

// Laundry types
export type ServiceType = 'washFold' | 'dryClean' | 'mixed';
export type WeightTier = 'small' | 'medium' | 'large';
export type AddonKey = 'LND_RUSH_24HR' | 'LND_DELICATE' | 'LND_EXTRA_SOFTENER' | 'LND_FOLDING';

// Cleaning types
export type CleaningType = 'standard' | 'deep' | 'moveOut';
export type CleaningAddonKey =
  | 'laundryPickup' | 'petHair' | 'insideCabinets' | 'windows'
  | 'fridgeOvenBundle' | 'wallWipe' | 'ecoProducts' | 'sanitization'
  | 'junkQuote';
export type AddonCategory = 'core' | 'premium' | 'moveOut';

// Recurring cleaning types
export type Frequency = 'oneTime' | 'weekly' | 'biweekly' | 'monthly';

export interface RecurringPlan {
  id: string;
  user_id: string;
  service_type: 'LAUNDRY' | 'CLEANING';
  frequency: Exclude<Frequency, 'oneTime'>; // DB stores as uppercase
  visits_completed: number;
  day_of_week?: number; // 0=Sunday, 6=Saturday
  time_window?: string; // e.g., '8–10am'
  default_addons: Record<string, boolean>;
  first_visit_deep: boolean;
  discount_pct: number;
  next_date?: string; // ISO date
  active: boolean;
  created_at: string;
}

export const RECURRING_DISCOUNT: Record<Exclude<Frequency, 'oneTime'>, number> = {
  weekly: 0.20,
  biweekly: 0.15,
  monthly: 0.10,
};

export interface CleaningAddon {
  key: CleaningAddonKey;
  label: string;
  price?: number; // price omitted => TBD/quote
  category: AddonCategory;
  showIf?: (ctx: { type: CleaningType }) => boolean;
}

export interface EstimateInput {
  serviceType: ServiceType;
  weightTier?: WeightTier;
  addons: Partial<Record<AddonKey, boolean>>;
  promoCode?: string;
  zip: string;
}

export interface EstimateResult {
  subtotal: number;
  discount: number;
  total: number;
  breakdown: Array<{
    label: string;
    amount: number;
  }>;
}

export interface Slot {
  startISO: string;
  endISO: string;
  capacity: number;
}

export interface BookingSlot {
  partner_id: string;
  partner_name: string;
  slot_start: string;
  slot_end: string;
  available_units: number;
  max_units: number;
  service_type: string;
}

// Weight tier to pounds mapping
export const WEIGHT_TIER_POUNDS: Record<WeightTier, number> = {
  small: 15,
  medium: 25,
  large: 35,
};

// Weight tier labels and descriptions
export const WEIGHT_TIER_INFO: Record<WeightTier, { label: string; description: string; price: string }> = {
  small: {
    label: 'Small Load',
    description: '~15 lbs (2-3 outfits, towels)',
    price: '~$26',
  },
  medium: {
    label: 'Medium Load',
    description: '~25 lbs (5-7 outfits, sheets)',
    price: '~$44',
  },
  large: {
    label: 'Large Load',
    description: '~35 lbs (full week, bedding)',
    price: '~$61',
  },
};

// Addon information
export const ADDON_INFO: Record<AddonKey, { label: string; description: string; price: number }> = {
  LND_RUSH_24HR: {
    label: 'Rush Service (24h)',
    description: 'Pickup today, delivery next day.',
    price: 10,
  },
  LND_DELICATE: {
    label: 'Delicate Care',
    description: 'Gentle cycle, air-dry on request.',
    price: 10,
  },
  LND_EXTRA_SOFTENER: {
    label: 'Extra Softener',
    description: 'Hypoallergenic available.',
    price: 3,
  },
  LND_FOLDING: {
    label: 'Professional Folding',
    description: 'Tidy, shelf-ready stacks.',
    price: 5,
  },
};

// Order types - Import unified state machine types
import type { OrderStatus as UnifiedOrderStatus, ServiceType as StateMachineServiceType, Action as OrderAction } from './orderStateMachine';
export type { OrderStatus, ServiceType as OrderServiceType, Action } from './orderStateMachine';

// Legacy order status type for backward compatibility
export type LegacyOrderStatus = 
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

// Quote structure for laundry orders
export interface QuoteItem {
  label: string;
  qty?: number;
  amountCents: number;
  notes?: string;
}

export interface Quote {
  items: QuoteItem[];
  totalCents: number;
  expiresAtISO: string;
  acceptedAtISO?: string;
}

// Address type
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
}

// Time window type
export interface TimeWindow {
  startISO: string;
  endISO: string;
}

// Rating type
export interface Rating {
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  ratedAt: string;
}

// Cleaning order details
export interface CleaningDetails {
  bedrooms: number;
  bathrooms: number;
  addOns: string[];
  frequency?: Frequency;
  visitsCompleted?: number;
}

// Order interface - unified with state machine
export interface Order {
  id: string;
  user_id: string;
  service_type: 'LAUNDRY' | 'CLEANING';
  status: UnifiedOrderStatus;
  partner_id?: string;
  phone?: string;
  
  // Time windows
  slot_start: string;
  slot_end: string;
  delivery_slot_start?: string;
  delivery_slot_end?: string;
  
  // Money (all in cents)
  subtotal_cents: number;
  tax_cents: number;
  delivery_cents: number;
  total_cents: number;
  
  // Quote (laundry only)
  quote?: Quote;
  quote_cents?: number; // Legacy field
  quoted_at?: string;
  paid_at?: string;
  
  // Cleaning specifics
  cleaning?: CleaningDetails;
  
  // Additional details
  actual_weight_lbs?: number;
  partner_notes?: string;
  intake_photos_json?: string[];
  outtake_photos_json?: string[];
  
  // Rating
  rating?: Rating;
  
  // Timestamps
  created_at: string;
  updated_at?: string;
  
  // Legacy fields
  order_details?: any;
  address_snapshot?: any | Address;
}
