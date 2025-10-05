import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { estimateLaundry, validatePromoCode } from '@/lib/estimate';
import { isDateDisabled, getCapacityBadge, formatSlotTime } from '@/lib/slots';

// Mock the pricing module
jest.mock('@/lib/pricing', () => ({
  quoteLaundry: jest.fn().mockImplementation(({ addons }) => {
    const items = [
      {
        key: 'LND_WF_PERLB',
        label: 'Wash & Fold',
        total_cents: 2600,
        unit_price_cents: 175,
      },
    ];
    
    // Add addon items if provided
    if (addons && addons.includes('LND_RUSH_24HR')) {
      items.push({
        key: 'LND_RUSH_24HR',
        label: 'Rush Service (24h)',
        total_cents: 1000,
        unit_price_cents: 1000,
      });
    }
    
    if (addons && addons.includes('LND_DELICATE')) {
      items.push({
        key: 'LND_DELICATE',
        label: 'Delicate Care',
        total_cents: 1000,
        unit_price_cents: 1000,
      });
    }
    
    const subtotal = items.reduce((sum, item) => sum + item.total_cents, 0);
    
    return Promise.resolve({
      subtotal_cents: subtotal,
      tax_cents: 0,
      delivery_cents: 0,
      total_cents: subtotal,
      items,
    });
  }),
}));

describe('Booking Flow Utilities', () => {
  describe('estimateLaundry', () => {
    it('should calculate estimate for small tier', async () => {
      const result = await estimateLaundry({
        serviceType: 'washFold',
        weightTier: 'small',
        addons: {},
        zip: '10027',
      });

      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('breakdown');
      expect(result.breakdown.length).toBeGreaterThan(0);
    });

    it('should apply WELCOME10 promo code correctly', async () => {
      const result = await estimateLaundry({
        serviceType: 'washFold',
        weightTier: 'medium',
        addons: {},
        promoCode: 'WELCOME10',
        zip: '10027',
      });

      expect(result.discount).toBeGreaterThan(0);
      expect(result.total).toBeLessThan(result.subtotal);
    });

    it('should include add-ons in calculation', async () => {
      const result = await estimateLaundry({
        serviceType: 'washFold',
        weightTier: 'medium',
        addons: { LND_RUSH_24HR: true, LND_DELICATE: true },
        zip: '10027',
      });

      const hasRush = result.breakdown.some((item) => item.label.includes('Rush'));
      const hasDelicate = result.breakdown.some((item) => item.label.includes('Delicate'));
      
      expect(hasRush).toBe(true);
      expect(hasDelicate).toBe(true);
    });
  });

  describe('validatePromoCode', () => {
    it('should validate WELCOME10 code', () => {
      const result = validatePromoCode('WELCOME10');
      expect(result.valid).toBe(true);
    });

    it('should validate HARLEM5 code', () => {
      const result = validatePromoCode('HARLEM5');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid codes', () => {
      const result = validatePromoCode('INVALID');
      expect(result.valid).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('isDateDisabled', () => {
    it('should disable past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isDateDisabled(yesterday)).toBe(true);
    });

    it('should disable Sundays', () => {
      // Find next Sunday
      const date = new Date();
      while (date.getDay() !== 0) {
        date.setDate(date.getDate() + 1);
      }
      expect(isDateDisabled(date)).toBe(true);
    });

    it('should allow future weekdays', () => {
      // Find next Monday
      const date = new Date();
      date.setDate(date.getDate() + 1);
      while (date.getDay() === 0) {
        date.setDate(date.getDate() + 1);
      }
      expect(isDateDisabled(date)).toBe(false);
    });
  });

  describe('getCapacityBadge', () => {
    it('should show "Full" for 0 availability', () => {
      const badge = getCapacityBadge(0);
      expect(badge.text).toBe('Full');
      expect(badge.variant).toBe('error');
    });

    it('should show warning for low availability', () => {
      const badge = getCapacityBadge(3);
      expect(badge.text).toContain('Only');
      expect(badge.variant).toBe('error');
    });

    it('should show warning for medium availability', () => {
      const badge = getCapacityBadge(7);
      expect(badge.text).toContain('available');
      expect(badge.variant).toBe('warning');
    });

    it('should show success for high availability', () => {
      const badge = getCapacityBadge(15);
      expect(badge.text).toContain('available');
      expect(badge.variant).toBe('success');
    });
  });

  describe('formatSlotTime', () => {
    it('should format time slots correctly', () => {
      const start = '2024-01-15T10:00:00Z';
      const end = '2024-01-15T12:00:00Z';
      const formatted = formatSlotTime(start, end);
      
      expect(formatted).toContain('-');
      expect(formatted).toContain('AM');
    });
  });
});

describe('Accessibility Features', () => {
  it('should provide ARIA labels for weight tiers', () => {
    const { WEIGHT_TIER_INFO } = require('@/lib/types');
    const info = WEIGHT_TIER_INFO.medium;
    
    expect(info.label).toBeDefined();
    expect(info.description).toBeDefined();
    expect(info.price).toBeDefined();
  });

  it('should provide addon descriptions for tooltips', () => {
    const { ADDON_INFO } = require('@/lib/types');
    const addon = ADDON_INFO.LND_RUSH_24HR;
    
    expect(addon.label).toBeDefined();
    expect(addon.description).toBeDefined();
    expect(addon.price).toBeGreaterThan(0);
  });
});
