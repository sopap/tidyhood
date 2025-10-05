import {
  calculateLaundryQuote,
  calculateCleaningQuote,
  formatQuoteBreakdown,
  getDefaultQuoteExpiry,
  isQuoteExpired,
  type LaundryQuoteParams,
  type CleaningQuoteParams
} from '../quoteCalculation';
import { LAUNDRY_PRICING, CLEANING_PRICING, QUOTE_LIMITS } from '../constants';

describe('calculateLaundryQuote', () => {
  test('calculates base price correctly for minimum weight', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 1, // Use exactly 1 lb (minimum valid weight)
      has_bedding: false,
      has_delicates: false,
      addons: {}
    };
    
    const result = calculateLaundryQuote(params);
    const expectedTotal = 1 * LAUNDRY_PRICING.PER_LB;
    
    expect(result.breakdown.base).toBe(expectedTotal);
    expect(result.total_cents).toBe(Math.round(expectedTotal * 100));
    expect(result.is_valid).toBe(true);
    expect(result.validation_errors).toHaveLength(0);
  });

  test('calculates base price correctly for standard weight', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 10,
      has_bedding: false,
      has_delicates: false,
      addons: {}
    };
    
    const result = calculateLaundryQuote(params);
    const expectedTotal = 10 * LAUNDRY_PRICING.PER_LB;
    
    expect(result.breakdown.base).toBe(expectedTotal);
    expect(result.total_cents).toBe(Math.round(expectedTotal * 100));
  });

  test('applies bedding surcharge correctly', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 10,
      has_bedding: true,
      has_delicates: false,
      addons: {}
    };
    
    const result = calculateLaundryQuote(params);
    const expectedTotal = (10 * LAUNDRY_PRICING.PER_LB) + LAUNDRY_PRICING.BEDDING_SURCHARGE;
    
    expect(result.breakdown.surcharges).toHaveLength(1);
    expect(result.breakdown.surcharges[0].label).toContain('Bedding');
    expect(result.breakdown.surcharges[0].amount).toBe(LAUNDRY_PRICING.BEDDING_SURCHARGE);
    expect(result.total_cents).toBe(Math.round(expectedTotal * 100));
  });

  test('applies delicates surcharge correctly', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 10,
      has_bedding: false,
      has_delicates: true,
      addons: {}
    };
    
    const result = calculateLaundryQuote(params);
    const expectedTotal = (10 * LAUNDRY_PRICING.PER_LB) + LAUNDRY_PRICING.DELICATES_SURCHARGE;
    
    expect(result.breakdown.surcharges).toHaveLength(1);
    expect(result.breakdown.surcharges[0].label).toContain('Delicates');
    expect(result.breakdown.surcharges[0].amount).toBe(LAUNDRY_PRICING.DELICATES_SURCHARGE);
    expect(result.total_cents).toBe(Math.round(expectedTotal * 100));
  });

  test('calculates bag fees correctly', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 10,
      bag_count: 3,
      has_bedding: false,
      has_delicates: false,
      addons: {}
    };
    
    const result = calculateLaundryQuote(params);
    const expectedBagFee = 3 * LAUNDRY_PRICING.BAG_FEE;
    
    expect(result.breakdown.surcharges).toHaveLength(1);
    expect(result.breakdown.surcharges[0].label).toContain('Bag Fee');
    expect(result.breakdown.surcharges[0].amount).toBe(expectedBagFee);
  });

  test('adds fold package addon correctly', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 10,
      has_bedding: false,
      has_delicates: false,
      addons: {
        fold_package: true
      }
    };
    
    const result = calculateLaundryQuote(params);
    
    expect(result.breakdown.addons).toHaveLength(1);
    expect(result.breakdown.addons[0].label).toContain('Fold');
    expect(result.breakdown.addons[0].amount).toBe(LAUNDRY_PRICING.FOLD_PACKAGE);
  });

  test('adds same day addon correctly', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 10,
      has_bedding: false,
      has_delicates: false,
      addons: {
        same_day: true
      }
    };
    
    const result = calculateLaundryQuote(params);
    
    expect(result.breakdown.addons).toHaveLength(1);
    expect(result.breakdown.addons[0].label).toContain('Same Day');
    expect(result.breakdown.addons[0].amount).toBe(LAUNDRY_PRICING.SAME_DAY);
  });

  test('adds eco detergent addon correctly', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 10,
      has_bedding: false,
      has_delicates: false,
      addons: {
        eco_detergent: true
      }
    };
    
    const result = calculateLaundryQuote(params);
    
    expect(result.breakdown.addons).toHaveLength(1);
    expect(result.breakdown.addons[0].label).toContain('Eco');
    expect(result.breakdown.addons[0].amount).toBe(LAUNDRY_PRICING.ECO_DETERGENT);
  });

  test('calculates complex quote with multiple items', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 15,
      bag_count: 2,
      has_bedding: true,
      has_delicates: true,
      addons: {
        fold_package: true,
        same_day: true,
        eco_detergent: true
      }
    };
    
    const result = calculateLaundryQuote(params);
    const expectedTotal = 
      (15 * LAUNDRY_PRICING.PER_LB) +
      (2 * LAUNDRY_PRICING.BAG_FEE) +
      LAUNDRY_PRICING.BEDDING_SURCHARGE +
      LAUNDRY_PRICING.DELICATES_SURCHARGE +
      LAUNDRY_PRICING.FOLD_PACKAGE +
      LAUNDRY_PRICING.SAME_DAY +
      LAUNDRY_PRICING.ECO_DETERGENT;
    
    expect(result.breakdown.surcharges).toHaveLength(3); // bags, bedding, delicates
    expect(result.breakdown.addons).toHaveLength(3);
    expect(result.total_cents).toBe(Math.round(expectedTotal * 100));
    expect(result.is_valid).toBe(true);
  });

  test('validates minimum weight constraint', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 0.5, // Below minimum
      has_bedding: false,
      has_delicates: false,
      addons: {}
    };
    
    const result = calculateLaundryQuote(params);
    
    expect(result.is_valid).toBe(false);
    expect(result.validation_errors.length).toBeGreaterThan(0);
    expect(result.validation_errors[0].toLowerCase()).toContain('weight');
  });

  test('validates maximum weight constraint', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 150, // Above maximum
      has_bedding: false,
      has_delicates: false,
      addons: {}
    };
    
    const result = calculateLaundryQuote(params);
    
    expect(result.is_valid).toBe(false);
    expect(result.validation_errors.length).toBeGreaterThan(0);
  });
});

describe('calculateCleaningQuote', () => {
  test('calculates base price correctly', () => {
    const params: CleaningQuoteParams = {
      estimated_minutes: 120,
      additional_addons: {}
    };
    
    const result = calculateCleaningQuote(params);
    const expectedTotal = 120 * CLEANING_PRICING.PER_MINUTE;
    
    expect(result.breakdown.base).toBe(expectedTotal);
    expect(result.total_cents).toBe(Math.round(expectedTotal * 100));
    expect(result.is_valid).toBe(true);
  });

  test('includes customer addon total', () => {
    const params: CleaningQuoteParams = {
      estimated_minutes: 120,
      customer_addons_total: 25,
      additional_addons: {}
    };
    
    const result = calculateCleaningQuote(params);
    const expectedTotal = (120 * CLEANING_PRICING.PER_MINUTE) + 25;
    
    expect(result.breakdown.addons).toHaveLength(1);
    expect(result.breakdown.addons[0].label).toContain('Customer');
    expect(result.breakdown.addons[0].amount).toBe(25);
    expect(result.total_cents).toBe(Math.round(expectedTotal * 100));
  });

  test('adds deep clean addon correctly', () => {
    const params: CleaningQuoteParams = {
      estimated_minutes: 120,
      additional_addons: {
        deep_clean: true
      }
    };
    
    const result = calculateCleaningQuote(params);
    
    expect(result.breakdown.addons).toHaveLength(1);
    expect(result.breakdown.addons[0].label).toContain('Deep Clean');
    expect(result.breakdown.addons[0].amount).toBe(CLEANING_PRICING.DEEP_CLEAN.price);
  });

  test('adds inside fridge addon correctly', () => {
    const params: CleaningQuoteParams = {
      estimated_minutes: 120,
      additional_addons: {
        inside_fridge: true
      }
    };
    
    const result = calculateCleaningQuote(params);
    
    expect(result.breakdown.addons).toHaveLength(1);
    expect(result.breakdown.addons[0].amount).toBe(CLEANING_PRICING.INSIDE_FRIDGE.price);
  });

  test('calculates complex cleaning quote with multiple addons', () => {
    const params: CleaningQuoteParams = {
      estimated_minutes: 180,
      customer_addons_total: 30,
      additional_addons: {
        deep_clean: true,
        inside_fridge: true,
        inside_oven: true,
        inside_cabinets: true
      }
    };
    
    const result = calculateCleaningQuote(params);
    const expectedTotal = 
      (180 * CLEANING_PRICING.PER_MINUTE) +
      30 +
      CLEANING_PRICING.DEEP_CLEAN.price +
      CLEANING_PRICING.INSIDE_FRIDGE.price +
      CLEANING_PRICING.INSIDE_OVEN.price +
      CLEANING_PRICING.INSIDE_CABINETS.price;
    
    expect(result.breakdown.addons).toHaveLength(5); // customer + 4 additional
    expect(result.total_cents).toBe(Math.round(expectedTotal * 100));
    expect(result.is_valid).toBe(true);
  });

  test('validates minimum time constraint', () => {
    const params: CleaningQuoteParams = {
      estimated_minutes: 15, // Below minimum
      additional_addons: {}
    };
    
    const result = calculateCleaningQuote(params);
    
    expect(result.is_valid).toBe(false);
    expect(result.validation_errors.length).toBeGreaterThan(0);
  });

  test('validates maximum time constraint', () => {
    const params: CleaningQuoteParams = {
      estimated_minutes: 600, // Above maximum
      additional_addons: {}
    };
    
    const result = calculateCleaningQuote(params);
    
    expect(result.is_valid).toBe(false);
    expect(result.validation_errors.length).toBeGreaterThan(0);
  });
});

describe('formatQuoteBreakdown', () => {
  test('formats simple laundry quote correctly', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 10,
      has_bedding: false,
      has_delicates: false,
      addons: {}
    };
    
    const quote = calculateLaundryQuote(params);
    const formatted = formatQuoteBreakdown(quote);
    
    expect(formatted).toContain('Base:');
    expect(formatted).toContain('Total:');
    expect(formatted).toContain('$');
  });

  test('formats complex quote with surcharges and addons', () => {
    const params: LaundryQuoteParams = {
      weight_lbs: 10,
      has_bedding: true,
      has_delicates: false,
      addons: {
        fold_package: true
      }
    };
    
    const quote = calculateLaundryQuote(params);
    const formatted = formatQuoteBreakdown(quote);
    
    expect(formatted).toContain('Bedding');
    expect(formatted).toContain('Fold');
    expect(formatted).toContain('─────────────'); // separator
  });
});

describe('getDefaultQuoteExpiry', () => {
  test('returns a date 24 hours in the future', () => {
    const now = new Date();
    const expiry = getDefaultQuoteExpiry();
    const hoursDiff = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    expect(hoursDiff).toBeGreaterThan(23.9);
    expect(hoursDiff).toBeLessThan(24.1);
  });
});

describe('isQuoteExpired', () => {
  test('returns false for future date', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 1);
    
    expect(isQuoteExpired(futureDate)).toBe(false);
  });

  test('returns true for past date', () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1);
    
    expect(isQuoteExpired(pastDate)).toBe(true);
  });
});
