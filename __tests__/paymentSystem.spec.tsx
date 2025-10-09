import '@testing-library/jest-dom';

describe('Payment System Utilities', () => {
  describe('Payment Errors', () => {
    it('exports payment error module', () => {
      const paymentErrors = require('@/lib/payment-errors');
      
      expect(paymentErrors).toBeDefined();
    });
  });

  describe('Payment Configuration', () => {
    it('exports payment configuration functions', () => {
      const paymentConfig = require('@/lib/payment-config');
      
      expect(paymentConfig.getCardValidationAmount).toBeDefined();
    });

    it('returns validation amount', () => {
      const { getCardValidationAmount } = require('@/lib/payment-config');
      
      const amount = getCardValidationAmount();
      expect(typeof amount).toBe('number');
      expect(amount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Stripe Quota Manager', () => {
    it('exports quota management module', () => {
      const quotaManager = require('@/lib/stripe-quota-manager');
      
      expect(quotaManager).toBeDefined();
    });
  });
});

describe('Auto Payment Workflow', () => {
  describe('Payment States', () => {
    it('defines valid payment states', () => {
      const { canTransition } = require('@/lib/orderStateMachine');
      
      // Laundry payment flow
      expect(canTransition('at_facility', 'awaiting_payment', 'LAUNDRY')).toBe(true);
      expect(canTransition('awaiting_payment', 'paid_processing', 'LAUNDRY')).toBe(true);
    });

    it('prevents invalid payment transitions', () => {
      const { canTransition } = require('@/lib/orderStateMachine');
      
      expect(canTransition('pending', 'paid_processing', 'LAUNDRY')).toBe(false);
      expect(canTransition('delivered', 'awaiting_payment', 'LAUNDRY')).toBe(false);
    });
  });

  describe('Payment Authorization', () => {
    it('validates payment method requirement', () => {
      const { canTransition } = require('@/lib/orderStateMachine');
      
      // Without payment method
      expect(canTransition('awaiting_payment', 'paid_processing', 'LAUNDRY', {})).toBe(false);
      
      // With payment completed
      const paidOrder = { paid_at: '2025-01-01T00:00:00Z' };
      expect(canTransition('awaiting_payment', 'paid_processing', 'LAUNDRY', paidOrder)).toBe(true);
    });
  });
});
