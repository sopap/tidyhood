// Core type definitions for booking flow

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
