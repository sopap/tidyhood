/**
 * Unit Tests for Pricing Logic
 * Tests all pricing calculations for laundry and cleaning services
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import type { LaundryQuoteParams, CleaningQuoteParams } from '../pricing';

// Mock the database module before any imports
jest.mock('../db');

// Mock pricing rules data
const mockLaundryRules = [
  {
    id: 1,
    service_type: 'LAUNDRY',
    unit_type: 'PER_LB',
    unit_key: 'LND_WF_PERLB',
    unit_price_cents: 150, // $1.50 per lb
    active: true,
    priority: 1,
    geozone: null,
  },
  {
    id: 2,
    service_type: 'LAUNDRY',
    unit_type: 'ADDON',
    unit_key: 'LND_DELICATE',
    unit_price_cents: 500, // $5.00
    active: true,
    priority: 2,
    geozone: null,
  },
  {
    id: 3,
    service_type: 'LAUNDRY',
    unit_type: 'ADDON',
    unit_key: 'LND_EXTRA_SOFTENER',
    unit_price_cents: 200, // $2.00
    active: true,
    priority: 3,
    geozone: null,
  },
];

const mockCleaningRules = [
  {
    id: 10,
    service_type: 'CLEANING',
    unit_type: 'FLAT',
    unit_key: 'CLN_STD_STUDIO',
    unit_price_cents: 8000, // $80
    active: true,
    priority: 1,
    geozone: null,
  },
  {
    id: 11,
    service_type: 'CLEANING',
    unit_type: 'FLAT',
    unit_key: 'CLN_STD_1BR',
    unit_price_cents: 10000, // $100
    active: true,
    priority: 2,
    geozone: null,
  },
  {
    id: 12,
    service_type: 'CLEANING',
    unit_type: 'FLAT',
    unit_key: 'CLN_STD_2BR',
    unit_price_cents: 12000, // $120
    active: true,
    priority: 3,
    geozone: null,
  },
  {
    id: 13,
    service_type: 'CLEANING',
    unit_type: 'FLAT',
    unit_key: 'CLN_STD_3BR',
    unit_price_cents: 14000, // $140
    active: true,
    priority: 4,
    geozone: null,
  },
  {
    id: 14,
    service_type: 'CLEANING',
    unit_type: 'FLAT',
    unit_key: 'CLN_STD_4BR',
    unit_price_cents: 16000, // $160
    active: true,
    priority: 5,
    geozone: null,
  },
  {
    id: 15,
    service_type: 'CLEANING',
    unit_type: 'MULTIPLIER',
    unit_key: 'CLN_DEEP_MULTI',
    multiplier: 1.5, // 50% more for deep clean
    active: true,
    priority: 6,
    geozone: null,
  },
  {
    id: 16,
    service_type: 'CLEANING',
    unit_type: 'ADDON',
    unit_key: 'CLN_FRIDGE_INSIDE',
    unit_price_cents: 2500, // $25
    active: true,
    priority: 7,
    geozone: null,
  },
  {
    id: 17,
    service_type: 'CLEANING',
    unit_type: 'ADDON',
    unit_key: 'CLN_OVEN_INSIDE',
    unit_price_cents: 3000, // $30
    active: true,
    priority: 8,
    geozone: null,
  },
];

describe('Pricing Module', () => {
  let quoteLaundry: any;
  let quoteCleaning: any;
  let formatMoney: any;
  let mockGetServiceClient: jest.Mock;
  
  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Get the mocked db module
    const db = await import('../db');
    mockGetServiceClient = db.getServiceClient as jest.Mock;
    
    // Import the pricing module after mocking
    const pricing = await import('../pricing');
    quoteLaundry = pricing.quoteLaundry;
    quoteCleaning = pricing.quoteCleaning;
    formatMoney = pricing.formatMoney;
  });
  
  describe('formatMoney', () => {
    it('should format cents to dollars correctly', () => {
      expect(formatMoney(0)).toBe('$0.00');
      expect(formatMoney(100)).toBe('$1.00');
      expect(formatMoney(1050)).toBe('$10.50');
      expect(formatMoney(123456)).toBe('$1234.56');
    });

    it('should handle negative amounts', () => {
      expect(formatMoney(-500)).toBe('$-5.00');
    });

    it('should always show 2 decimal places', () => {
      expect(formatMoney(1)).toBe('$0.01');
      expect(formatMoney(10)).toBe('$0.10');
      expect(formatMoney(100)).toBe('$1.00');
    });
  });

  describe('quoteLaundry', () => {
    beforeEach(() => {
      // Set up the mock to return laundry pricing rules
      mockGetServiceClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({ data: mockLaundryRules, error: null })),
              })),
            })),
          })),
        })),
      });
    });

    describe('Basic Pricing', () => {
      it('should calculate price for exact weight', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 20,
        };

        const result = await quoteLaundry(params);

        expect(result.subtotal_cents).toBe(3000); // 20 lbs * $1.50 = $30.00
        expect(result.tax_cents).toBe(0); // Laundry is tax-exempt
        expect(result.total_cents).toBe(3000);
        expect(result.items).toHaveLength(1);
        expect(result.items[0].key).toBe('LND_WF_PERLB');
        expect(result.items[0].quantity).toBe(20);
      });

      it('should enforce 15 lbs minimum', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 10, // Below minimum
        };

        const result = await quoteLaundry(params);

        // Should charge for 15 lbs even though only 10 lbs requested
        expect(result.subtotal_cents).toBe(2250); // 15 lbs * $1.50 = $22.50
        expect(result.items[0].quantity).toBe(15);
        expect(result.items[0].label).toContain('15 lbs');
      });

      it('should not apply minimum when weight is above minimum', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 25,
        };

        const result = await quoteLaundry(params);

        expect(result.subtotal_cents).toBe(3750); // 25 lbs * $1.50 = $37.50
        expect(result.items[0].quantity).toBe(25);
      });
    });

    describe('Add-ons', () => {
      it('should add delicate care addon', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 15,
          addons: ['LND_DELICATE'],
        };

        const result = await quoteLaundry(params);

        expect(result.subtotal_cents).toBe(2750); // $22.50 + $5.00 = $27.50
        expect(result.items).toHaveLength(2);
        expect(result.items[1].key).toBe('LND_DELICATE');
        expect(result.items[1].total_cents).toBe(500);
      });

      it('should add multiple addons', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 15,
          addons: ['LND_DELICATE', 'LND_EXTRA_SOFTENER'],
        };

        const result = await quoteLaundry(params);

        // $22.50 + $5.00 + $2.00 = $29.50
        expect(result.subtotal_cents).toBe(2950);
        expect(result.items).toHaveLength(3);
      });

      it('should skip unknown addons', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 15,
          addons: ['UNKNOWN_ADDON'],
        };

        const result = await quoteLaundry(params);

        expect(result.subtotal_cents).toBe(2250); // Just base price
        expect(result.items).toHaveLength(1);
      });
    });

    describe('Rush Service', () => {
      it('should add 25% rush service fee', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 20, // $30.00 base
          rushService: true,
        };

        const result = await quoteLaundry(params);

        const rushFee = Math.round(3000 * 0.25); // 25% of $30 = $7.50
        expect(result.subtotal_cents).toBe(3750); // $30 + $7.50 = $37.50
        expect(result.items).toHaveLength(2);
        expect(result.items[1].key).toBe('LND_RUSH_24HR');
        expect(result.items[1].total_cents).toBe(rushFee);
      });

      it('should calculate rush fee on base price + addons', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 20, // $30.00
          addons: ['LND_DELICATE'], // +$5.00 = $35.00
          rushService: true, // +25% = $8.75
        };

        const result = await quoteLaundry(params);

        const baseWithAddons = 3500; // $35.00
        const rushFee = Math.round(baseWithAddons * 0.25); // $8.75
        expect(result.subtotal_cents).toBe(4375); // $35 + $8.75 = $43.75
        expect(result.items).toHaveLength(3);
      });

      it('should not add rush fee when rushService is false', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 20,
          rushService: false,
        };

        const result = await quoteLaundry(params);

        expect(result.subtotal_cents).toBe(3000);
        expect(result.items).toHaveLength(1);
        expect(result.items.find((i: any) => i.key === 'LND_RUSH_24HR')).toBeUndefined();
      });
    });

    describe('Tax Calculation', () => {
      it('should not charge tax on laundry services', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 20,
        };

        const result = await quoteLaundry(params);

        expect(result.tax_cents).toBe(0);
        expect(result.tax_breakdown.taxable_subtotal_cents).toBe(0);
        expect(result.tax_breakdown.tax_exempt_subtotal_cents).toBe(3000);
      });

      it('should mark all laundry items as non-taxable', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 20,
          addons: ['LND_DELICATE'],
          rushService: true,
        };

        const result = await quoteLaundry(params);

        // All items should be tax-exempt
        result.items.forEach((item: any) => {
          expect(item.taxable).toBe(false);
        });
      });
    });

    describe('Edge Cases', () => {
      it('should handle 0 lbs (apply minimum)', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 0,
        };

        const result = await quoteLaundry(params);

        expect(result.subtotal_cents).toBe(2250); // 15 lbs minimum
      });

      it('should handle very large weights', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 100,
        };

        const result = await quoteLaundry(params);

        expect(result.subtotal_cents).toBe(15000); // 100 * $1.50 = $150
      });

      it('should handle empty addons array', async () => {
        const params: LaundryQuoteParams = {
          zip: '10027',
          lbs: 15,
          addons: [],
        };

        const result = await quoteLaundry(params);

        expect(result.items).toHaveLength(1);
      });
    });
  });

  describe('quoteCleaning', () => {
    beforeEach(() => {
      // Set up the mock to return cleaning pricing rules
      mockGetServiceClient.mockReturnValue({
        from: jest.fn(() => ({
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => Promise.resolve({ data: mockCleaningRules, error: null })),
              })),
            })),
          })),
        })),
      });
    });

    describe('Basic Pricing', () => {
      it('should price studio correctly', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 0,
          bathrooms: 1,
        };

        const result = await quoteCleaning(params);

        expect(result.items[0].key).toBe('CLN_STD_STUDIO');
        expect(result.items[0].unit_price_cents).toBe(8000);
        expect(result.items[0].label).toContain('Studio');
      });

      it('should price 1BR correctly', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 1,
          bathrooms: 1,
        };

        const result = await quoteCleaning(params);

        expect(result.items[0].key).toBe('CLN_STD_1BR');
        expect(result.items[0].unit_price_cents).toBe(10000);
      });

      it('should price 2BR correctly', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
        };

        const result = await quoteCleaning(params);

        expect(result.items[0].key).toBe('CLN_STD_2BR');
        expect(result.items[0].unit_price_cents).toBe(12000);
      });

      it('should price 3BR correctly', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 3,
          bathrooms: 2,
        };

        const result = await quoteCleaning(params);

        expect(result.items[0].key).toBe('CLN_STD_3BR');
        expect(result.items[0].unit_price_cents).toBe(14000);
      });

      it('should price 4+BR correctly', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 5, // 4+ bedrooms
          bathrooms: 3,
        };

        const result = await quoteCleaning(params);

        expect(result.items[0].key).toBe('CLN_STD_4BR');
        expect(result.items[0].unit_price_cents).toBe(16000);
      });
    });

    describe('Deep Clean', () => {
      it('should apply 1.5x multiplier for deep clean', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          deep: true,
        };

        const result = await quoteCleaning(params);

        // $120 * 1.5 = $180
        expect(result.items[0].unit_price_cents).toBe(18000);
        expect(result.items[0].label).toContain('Deep');
      });

      it('should not apply multiplier when deep=false', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          deep: false,
        };

        const result = await quoteCleaning(params);

        expect(result.items[0].unit_price_cents).toBe(12000);
        expect(result.items[0].label).toContain('Standard');
      });
    });

    describe('Recurring Discounts', () => {
      it('should NOT apply discount on first visit (visit #0)', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          frequency: 'weekly',
          visitsCompleted: 0,
        };

        const result = await quoteCleaning(params);

        expect(result.items[0].total_cents).toBe(12000);
        // Should have info line about future discount
        const infoItem = result.items.find((i: any) => i.key === 'RECURRING_INFO');
        expect(infoItem).toBeDefined();
        expect(infoItem?.label).toContain('weekly discount starts next visit');
      });

      it('should apply 20% weekly discount from visit #1 onward', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          frequency: 'weekly',
          visitsCompleted: 1, // Second visit
        };

        const result = await quoteCleaning(params);

        const discountItem = result.items.find((i: any) => i.key === 'RECURRING_DISCOUNT');
        expect(discountItem).toBeDefined();
        expect(discountItem?.total_cents).toBe(-2400); // 20% of $120 = $24
        expect(discountItem?.label).toContain('20%');
        
        // Subtotal should be reduced
        expect(result.subtotal_cents).toBe(9600); // $120 - $24 = $96
      });

      it('should apply 15% biweekly discount', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          frequency: 'biweekly',
          visitsCompleted: 2,
        };

        const result = await quoteCleaning(params);

        const discountItem = result.items.find((i: any) => i.key === 'RECURRING_DISCOUNT');
        expect(discountItem?.total_cents).toBe(-1800); // 15% of $120 = $18
        expect(discountItem?.label).toContain('15%');
      });

      it('should apply 10% monthly discount', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          frequency: 'monthly',
          visitsCompleted: 3,
        };

        const result = await quoteCleaning(params);

        const discountItem = result.items.find((i: any) => i.key === 'RECURRING_DISCOUNT');
        expect(discountItem?.total_cents).toBe(-1200); // 10% of $120 = $12
        expect(discountItem?.label).toContain('10%');
      });

      it('should not apply discount for one-time service', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          frequency: 'oneTime',
          visitsCompleted: 0,
        };

        const result = await quoteCleaning(params);

        const discountItem = result.items.find((i: any) => i.key === 'RECURRING_DISCOUNT');
        expect(discountItem).toBeUndefined();
      });
    });

    describe('First Visit Deep Clean (Recurring Plans)', () => {
      it('should apply deep multiplier on first visit when firstVisitDeep=true', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          frequency: 'weekly',
          visitsCompleted: 0,
          firstVisitDeep: true,
        };

        const result = await quoteCleaning(params);

        // $120 * 1.5 = $180 (deep clean on first visit)
        expect(result.items[0].unit_price_cents).toBe(18000);
        expect(result.items[0].label).toContain('Deep');
      });

      it('should not apply deep multiplier after first visit', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          frequency: 'weekly',
          visitsCompleted: 1, // Second visit
          firstVisitDeep: true, // This should not matter after first visit
        };

        const result = await quoteCleaning(params);

        // Should be standard clean price with 20% discount
        expect(result.items[0].unit_price_cents).toBe(12000);
        expect(result.items[0].label).toContain('Standard');
      });
    });

    describe('Add-ons', () => {
      it('should add fridge cleaning addon', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          addons: ['CLN_FRIDGE_INSIDE'],
        };

        const result = await quoteCleaning(params);

        const addonItem = result.items.find((i: any) => i.key === 'CLN_FRIDGE_INSIDE');
        expect(addonItem).toBeDefined();
        expect(addonItem?.total_cents).toBe(2500);
      });

      it('should add multiple addons', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          addons: ['CLN_FRIDGE_INSIDE', 'CLN_OVEN_INSIDE'],
        };

        const result = await quoteCleaning(params);

        expect(result.items.length).toBeGreaterThan(2);
        expect(result.items.find((i: any) => i.key === 'CLN_FRIDGE_INSIDE')).toBeDefined();
        expect(result.items.find((i: any) => i.key === 'CLN_OVEN_INSIDE')).toBeDefined();
      });
    });

    describe('Tax Calculation', () => {
      it('should charge 8.875% tax on cleaning services', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2, // $120
          bathrooms: 1,
        };

        const result = await quoteCleaning(params);

        const expectedTax = Math.round(12000 * 0.08875); // $10.65
        expect(result.tax_cents).toBe(expectedTax);
        expect(result.total_cents).toBe(12000 + expectedTax);
      });

      it('should calculate tax after discount', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2, // $120 base
          bathrooms: 1,
          frequency: 'weekly', // 20% discount from visit #1
          visitsCompleted: 1,
        };

        const result = await quoteCleaning(params);

        // $120 - $24 discount = $96 taxable
        const expectedTax = Math.round(9600 * 0.08875); // $8.52
        expect(result.tax_cents).toBe(expectedTax);
      });

      it('should mark all cleaning items as taxable', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 2,
          bathrooms: 1,
          addons: ['CLN_FRIDGE_INSIDE'],
        };

        const result = await quoteCleaning(params);

        // All non-info items should be taxable
        result.items.forEach((item: any) => {
          if (item.key !== 'RECURRING_INFO') {
            expect(item.taxable).toBe(true);
          }
        });
      });
    });

    describe('Complex Scenarios', () => {
      it('should handle deep clean + addons + recurring discount correctly', async () => {
        const params: CleaningQuoteParams = {
          zip: '10027',
          bedrooms: 3, // $140 base
          bathrooms: 2,
          deep: true, // x1.5 = $210
          addons: ['CLN_FRIDGE_INSIDE', 'CLN_OVEN_INSIDE'], // +$25 +$30 = $265
          frequency: 'weekly', // 20% discount
          visitsCompleted: 5, // Apply discount
        };

        const result = await quoteCleaning(params);

        // Base: $140 * 1.5 = $210
        // Addons: +$55 = $265
        // Discount: 20% off = -$53 = $212
        // Tax: $212 * 0.08875 = $18.82
        // Total: $212 + $18.82 = $230.82

        expect(result.subtotal_cents).toBe(21200); // $212
        const expectedTax = Math.round(21200 * 0.08875);
        expect(result.tax_cents).toBe(expectedTax);
      });
    });
  });
});
