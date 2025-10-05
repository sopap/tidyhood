/**
 * Quote Calculation Library
 * Pure functions for calculating and validating partner quotes
 */

import { 
  LAUNDRY_PRICING, 
  CLEANING_PRICING, 
  QUOTE_LIMITS,
  VALIDATION_MESSAGES 
} from './constants';

// Types
export interface LaundryQuoteParams {
  weight_lbs: number;
  bag_count?: number;
  has_bedding: boolean;
  has_delicates: boolean;
  addons: {
    fold_package?: boolean;
    same_day?: boolean;
    eco_detergent?: boolean;
  };
}

export interface CleaningQuoteParams {
  estimated_minutes: number;
  customer_addons_total?: number;
  additional_addons: {
    deep_clean?: boolean;
    inside_fridge?: boolean;
    inside_oven?: boolean;
    inside_cabinets?: boolean;
  };
}

export interface QuoteResult {
  subtotal_cents: number;
  breakdown: QuoteBreakdown;
  total_cents: number;
  is_valid: boolean;
  validation_errors: string[];
}

export interface QuoteBreakdown {
  base: number;
  surcharges: { label: string; amount: number }[];
  addons: { label: string; amount: number }[];
}

/**
 * Calculate quote for laundry orders
 */
export function calculateLaundryQuote(params: LaundryQuoteParams): QuoteResult {
  const breakdown: QuoteBreakdown = {
    base: 0,
    surcharges: [],
    addons: []
  };

  // Base price: weight * per lb rate
  const basePrice = params.weight_lbs * LAUNDRY_PRICING.PER_LB;
  breakdown.base = basePrice;

  // Bag fee
  if (params.bag_count && params.bag_count > 0) {
    const bagFee = params.bag_count * LAUNDRY_PRICING.BAG_FEE;
    breakdown.surcharges.push({
      label: `Bag Fee (${params.bag_count} bags)`,
      amount: bagFee
    });
  }

  // Bedding surcharge
  if (params.has_bedding) {
    breakdown.surcharges.push({
      label: 'Bedding Surcharge',
      amount: LAUNDRY_PRICING.BEDDING_SURCHARGE
    });
  }

  // Delicates surcharge
  if (params.has_delicates) {
    breakdown.surcharges.push({
      label: 'Delicates Surcharge',
      amount: LAUNDRY_PRICING.DELICATES_SURCHARGE
    });
  }

  // Addons
  if (params.addons.fold_package) {
    breakdown.addons.push({
      label: 'Fold & Package',
      amount: LAUNDRY_PRICING.FOLD_PACKAGE
    });
  }

  if (params.addons.same_day) {
    breakdown.addons.push({
      label: 'Same Day Service',
      amount: LAUNDRY_PRICING.SAME_DAY
    });
  }

  if (params.addons.eco_detergent) {
    breakdown.addons.push({
      label: 'Eco-Friendly Detergent',
      amount: LAUNDRY_PRICING.ECO_DETERGENT
    });
  }

  // Calculate totals
  const surchargesTotal = breakdown.surcharges.reduce((sum, item) => sum + item.amount, 0);
  const addonsTotal = breakdown.addons.reduce((sum, item) => sum + item.amount, 0);
  const subtotal = basePrice + surchargesTotal + addonsTotal;

  // Validation
  const validation_errors = validateLaundryQuote({
    weight_lbs: params.weight_lbs,
    total: subtotal
  });

  return {
    subtotal_cents: Math.round(subtotal * 100),
    breakdown,
    total_cents: Math.round(subtotal * 100),
    is_valid: validation_errors.length === 0,
    validation_errors
  };
}

/**
 * Calculate quote for cleaning orders
 */
export function calculateCleaningQuote(params: CleaningQuoteParams): QuoteResult {
  const breakdown: QuoteBreakdown = {
    base: 0,
    surcharges: [],
    addons: []
  };

  // Base price: minutes * per minute rate
  const basePrice = params.estimated_minutes * CLEANING_PRICING.PER_MINUTE;
  breakdown.base = basePrice;

  // Customer-selected addons (already paid)
  if (params.customer_addons_total && params.customer_addons_total > 0) {
    breakdown.addons.push({
      label: 'Customer Selected Addons',
      amount: params.customer_addons_total
    });
  }

  // Additional addons (partner-added)
  let totalAdditionalMinutes = 0;

  if (params.additional_addons.deep_clean) {
    totalAdditionalMinutes += CLEANING_PRICING.DEEP_CLEAN.minutes;
    breakdown.addons.push({
      label: `Deep Clean (+${CLEANING_PRICING.DEEP_CLEAN.minutes} min)`,
      amount: CLEANING_PRICING.DEEP_CLEAN.price
    });
  }

  if (params.additional_addons.inside_fridge) {
    totalAdditionalMinutes += CLEANING_PRICING.INSIDE_FRIDGE.minutes;
    breakdown.addons.push({
      label: `Inside Fridge (+${CLEANING_PRICING.INSIDE_FRIDGE.minutes} min)`,
      amount: CLEANING_PRICING.INSIDE_FRIDGE.price
    });
  }

  if (params.additional_addons.inside_oven) {
    totalAdditionalMinutes += CLEANING_PRICING.INSIDE_OVEN.minutes;
    breakdown.addons.push({
      label: `Inside Oven (+${CLEANING_PRICING.INSIDE_OVEN.minutes} min)`,
      amount: CLEANING_PRICING.INSIDE_OVEN.price
    });
  }

  if (params.additional_addons.inside_cabinets) {
    totalAdditionalMinutes += CLEANING_PRICING.INSIDE_CABINETS.minutes;
    breakdown.addons.push({
      label: `Inside Cabinets (+${CLEANING_PRICING.INSIDE_CABINETS.minutes} min)`,
      amount: CLEANING_PRICING.INSIDE_CABINETS.price
    });
  }

  // Calculate totals
  const addonsTotal = breakdown.addons.reduce((sum, item) => sum + item.amount, 0);
  const subtotal = basePrice + addonsTotal;

  // Validation
  const totalMinutes = params.estimated_minutes + totalAdditionalMinutes;
  const validation_errors = validateCleaningQuote({
    estimated_minutes: totalMinutes,
    total: subtotal
  });

  return {
    subtotal_cents: Math.round(subtotal * 100),
    breakdown,
    total_cents: Math.round(subtotal * 100),
    is_valid: validation_errors.length === 0,
    validation_errors
  };
}

/**
 * Validate laundry quote parameters
 */
function validateLaundryQuote(params: { weight_lbs: number; total: number }): string[] {
  const errors: string[] = [];

  // Weight validation
  if (params.weight_lbs < QUOTE_LIMITS.MIN_WEIGHT) {
    errors.push(VALIDATION_MESSAGES.WEIGHT_TOO_LOW);
  }
  if (params.weight_lbs > QUOTE_LIMITS.MAX_WEIGHT) {
    errors.push(VALIDATION_MESSAGES.WEIGHT_TOO_HIGH);
  }

  // Total validation
  if (params.total < QUOTE_LIMITS.MIN_TOTAL) {
    errors.push(VALIDATION_MESSAGES.QUOTE_TOO_LOW);
  }
  if (params.total > QUOTE_LIMITS.MAX_TOTAL) {
    errors.push(VALIDATION_MESSAGES.QUOTE_TOO_HIGH);
  }

  return errors;
}

/**
 * Validate cleaning quote parameters
 */
function validateCleaningQuote(params: { estimated_minutes: number; total: number }): string[] {
  const errors: string[] = [];

  // Time validation
  if (params.estimated_minutes < QUOTE_LIMITS.MIN_TIME) {
    errors.push(VALIDATION_MESSAGES.TIME_TOO_LOW);
  }
  if (params.estimated_minutes > QUOTE_LIMITS.MAX_TIME) {
    errors.push(VALIDATION_MESSAGES.TIME_TOO_HIGH);
  }

  // Total validation
  if (params.total < QUOTE_LIMITS.MIN_TOTAL) {
    errors.push(VALIDATION_MESSAGES.QUOTE_TOO_LOW);
  }
  if (params.total > QUOTE_LIMITS.MAX_TOTAL) {
    errors.push(VALIDATION_MESSAGES.QUOTE_TOO_HIGH);
  }

  return errors;
}

/**
 * Format quote breakdown as human-readable string
 */
export function formatQuoteBreakdown(result: QuoteResult): string {
  const lines: string[] = [];

  // Base
  lines.push(`Base: $${result.breakdown.base.toFixed(2)}`);

  // Surcharges
  if (result.breakdown.surcharges.length > 0) {
    result.breakdown.surcharges.forEach(item => {
      lines.push(`+ ${item.label}: $${item.amount.toFixed(2)}`);
    });
  }

  // Addons
  if (result.breakdown.addons.length > 0) {
    result.breakdown.addons.forEach(item => {
      lines.push(`+ ${item.label}: $${item.amount.toFixed(2)}`);
    });
  }

  // Total
  lines.push('─────────────');
  lines.push(`Total: $${(result.total_cents / 100).toFixed(2)}`);

  return lines.join('\n');
}

/**
 * Get quote expiry date (default 24 hours from now)
 */
export function getDefaultQuoteExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + QUOTE_LIMITS.DEFAULT_EXPIRY_HOURS);
  return expiry;
}

/**
 * Check if quote is expired
 */
export function isQuoteExpired(expiryDate: Date): boolean {
  return new Date() > new Date(expiryDate);
}
