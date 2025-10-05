/**
 * Order State Machine Tests
 * Phase 1, Week 1, Day 4
 * Target: 95%+ test coverage
 */

import {
  OrderStatus,
  ServiceType,
  canTransition,
  getNextStatuses,
  getAvailableActions,
  isTerminal,
  isCancellable,
  getStatusLabel,
  getStatusColor,
  getStatusSection,
  validateTransition,
  getProgress,
  mapLegacyStatus,
  mapToLegacyStatus,
  TERMINAL_STATUSES,
  CANCELLABLE_STATUSES
} from '../orderStateMachine';

describe('orderStateMachine', () => {
  describe('canTransition', () => {
    describe('Laundry transitions', () => {
      it('allows scheduled → picked_up', () => {
        expect(canTransition('scheduled', 'picked_up', 'LAUNDRY')).toBe(true);
      });

      it('allows picked_up → at_facility', () => {
        expect(canTransition('picked_up', 'at_facility', 'LAUNDRY')).toBe(true);
      });

      it('allows at_facility → quote_sent', () => {
        expect(canTransition('at_facility', 'quote_sent', 'LAUNDRY')).toBe(true);
      });

      it('allows quote_sent → awaiting_payment', () => {
        expect(canTransition('quote_sent', 'awaiting_payment', 'LAUNDRY')).toBe(true);
      });

      it('allows awaiting_payment → processing when paid', () => {
        const paidOrder = { paid_at: '2025-01-01T00:00:00Z' };
        expect(canTransition('awaiting_payment', 'processing', 'LAUNDRY', paidOrder)).toBe(true);
      });

      it('blocks awaiting_payment → processing when not paid', () => {
        const unpaidOrder = { paid_at: null };
        expect(canTransition('awaiting_payment', 'processing', 'LAUNDRY', unpaidOrder)).toBe(false);
      });

      it('allows processing → out_for_delivery', () => {
        expect(canTransition('processing', 'out_for_delivery', 'LAUNDRY')).toBe(true);
      });

      it('allows out_for_delivery → delivered', () => {
        expect(canTransition('out_for_delivery', 'delivered', 'LAUNDRY')).toBe(true);
      });

      it('blocks invalid laundry transitions', () => {
        expect(canTransition('scheduled', 'at_facility', 'LAUNDRY')).toBe(false);
        expect(canTransition('picked_up', 'processing', 'LAUNDRY')).toBe(false);
        expect(canTransition('delivered', 'processing', 'LAUNDRY')).toBe(false);
      });
    });

    describe('Cleaning transitions', () => {
      it('allows scheduled → processing', () => {
        expect(canTransition('scheduled', 'processing', 'CLEANING')).toBe(true);
      });

      it('allows processing → cleaned', () => {
        expect(canTransition('processing', 'cleaned', 'CLEANING')).toBe(true);
      });

      it('blocks invalid cleaning transitions', () => {
        expect(canTransition('scheduled', 'at_facility', 'CLEANING')).toBe(false);
        expect(canTransition('scheduled', 'picked_up', 'CLEANING')).toBe(false);
        expect(canTransition('processing', 'delivered', 'CLEANING')).toBe(false);
      });
    });

    describe('Cancellation transitions', () => {
      it('allows cancellation from scheduled', () => {
        expect(canTransition('scheduled', 'canceled', 'LAUNDRY')).toBe(true);
        expect(canTransition('scheduled', 'canceled', 'CLEANING')).toBe(true);
      });

      it('allows cancellation from pre-terminal laundry statuses', () => {
        expect(canTransition('picked_up', 'canceled', 'LAUNDRY')).toBe(true);
        expect(canTransition('at_facility', 'canceled', 'LAUNDRY')).toBe(true);
        expect(canTransition('quote_sent', 'canceled', 'LAUNDRY')).toBe(true);
        expect(canTransition('awaiting_payment', 'canceled', 'LAUNDRY')).toBe(true);
      });

      it('blocks cancellation from terminal statuses', () => {
        expect(canTransition('delivered', 'canceled', 'LAUNDRY')).toBe(false);
        expect(canTransition('cleaned', 'canceled', 'CLEANING')).toBe(false);
      });

      it('blocks cancellation from late-stage statuses', () => {
        expect(canTransition('processing', 'canceled', 'LAUNDRY')).toBe(false);
        expect(canTransition('out_for_delivery', 'canceled', 'LAUNDRY')).toBe(false);
      });
    });
  });

  describe('getNextStatuses', () => {
    it('returns correct next statuses for laundry', () => {
      expect(getNextStatuses('scheduled', 'LAUNDRY')).toEqual(['picked_up', 'canceled']);
      expect(getNextStatuses('picked_up', 'LAUNDRY')).toEqual(['at_facility', 'canceled']);
      expect(getNextStatuses('processing', 'LAUNDRY')).toEqual(['out_for_delivery']);
    });

    it('returns correct next statuses for cleaning', () => {
      expect(getNextStatuses('scheduled', 'CLEANING')).toEqual(['processing', 'canceled']);
      expect(getNextStatuses('processing', 'CLEANING')).toEqual(['cleaned']);
    });

    it('returns empty array for terminal statuses', () => {
      expect(getNextStatuses('delivered', 'LAUNDRY')).toEqual([]);
      expect(getNextStatuses('cleaned', 'CLEANING')).toEqual([]);
      expect(getNextStatuses('canceled', 'LAUNDRY')).toEqual([]);
    });
  });

  describe('getAvailableActions', () => {
    it('includes view action for all statuses', () => {
      const statuses: OrderStatus[] = ['scheduled', 'processing', 'delivered', 'canceled'];
      statuses.forEach(status => {
        expect(getAvailableActions(status, 'LAUNDRY')).toContain('view');
      });
    });

    it('includes edit and cancel for scheduled', () => {
      const actions = getAvailableActions('scheduled', 'LAUNDRY');
      expect(actions).toContain('edit');
      expect(actions).toContain('cancel');
    });

    it('includes pay_quote for awaiting_payment', () => {
      const actions = getAvailableActions('awaiting_payment', 'LAUNDRY');
      expect(actions).toContain('pay_quote');
    });

    it('includes track for in-progress statuses', () => {
      const trackStatuses: OrderStatus[] = ['picked_up', 'at_facility', 'processing', 'out_for_delivery'];
      trackStatuses.forEach(status => {
        expect(getAvailableActions(status, 'LAUNDRY')).toContain('track');
      });
    });

    it('includes rate and rebook for completed statuses', () => {
      const deliveredActions = getAvailableActions('delivered', 'LAUNDRY');
      expect(deliveredActions).toContain('rate');
      expect(deliveredActions).toContain('rebook');

      const cleanedActions = getAvailableActions('cleaned', 'CLEANING');
      expect(cleanedActions).toContain('rate');
      expect(cleanedActions).toContain('rebook');
    });
  });

  describe('isTerminal', () => {
    it('returns true for terminal statuses', () => {
      expect(isTerminal('delivered')).toBe(true);
      expect(isTerminal('cleaned')).toBe(true);
      expect(isTerminal('canceled')).toBe(true);
    });

    it('returns false for non-terminal statuses', () => {
      expect(isTerminal('scheduled')).toBe(false);
      expect(isTerminal('processing')).toBe(false);
      expect(isTerminal('awaiting_payment')).toBe(false);
    });
  });

  describe('isCancellable', () => {
    it('returns true for cancellable statuses', () => {
      const cancellable: OrderStatus[] = [
        'scheduled',
        'picked_up',
        'at_facility',
        'quote_sent',
        'awaiting_payment'
      ];
      cancellable.forEach(status => {
        expect(isCancellable(status)).toBe(true);
      });
    });

    it('returns false for non-cancellable statuses', () => {
      const nonCancellable: OrderStatus[] = [
        'processing',
        'out_for_delivery',
        'delivered',
        'cleaned',
        'canceled'
      ];
      nonCancellable.forEach(status => {
        expect(isCancellable(status)).toBe(false);
      });
    });
  });

  describe('getStatusLabel', () => {
    it('returns correct labels for all statuses', () => {
      expect(getStatusLabel('scheduled')).toBe('Scheduled');
      expect(getStatusLabel('awaiting_payment')).toBe('Awaiting Payment');
      expect(getStatusLabel('delivered')).toBe('Delivered');
      expect(getStatusLabel('cleaned')).toBe('Completed');
    });
  });

  describe('getStatusColor', () => {
    it('returns correct colors for all statuses', () => {
      expect(getStatusColor('scheduled')).toBe('blue');
      expect(getStatusColor('awaiting_payment')).toBe('orange');
      expect(getStatusColor('delivered')).toBe('green');
      expect(getStatusColor('canceled')).toBe('red');
    });
  });

  describe('getStatusSection', () => {
    it('returns upcoming for scheduled', () => {
      expect(getStatusSection('scheduled')).toBe('upcoming');
    });

    it('returns in_progress for active statuses', () => {
      const inProgress: OrderStatus[] = [
        'picked_up',
        'at_facility',
        'quote_sent',
        'awaiting_payment',
        'processing',
        'out_for_delivery'
      ];
      inProgress.forEach(status => {
        expect(getStatusSection(status)).toBe('in_progress');
      });
    });

    it('returns completed for terminal success statuses', () => {
      expect(getStatusSection('delivered')).toBe('completed');
      expect(getStatusSection('cleaned')).toBe('completed');
    });

    it('returns canceled for canceled status', () => {
      expect(getStatusSection('canceled')).toBe('canceled');
    });
  });

  describe('validateTransition', () => {
    it('allows valid transitions', () => {
      const result = validateTransition('scheduled', 'picked_up', 'LAUNDRY');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('blocks invalid transitions with error message', () => {
      const result = validateTransition('delivered', 'processing', 'LAUNDRY');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('terminal');
    });

    it('allows no-op transitions', () => {
      const result = validateTransition('scheduled', 'scheduled', 'LAUNDRY');
      expect(result.valid).toBe(true);
    });

    it('provides specific error for invalid service transitions', () => {
      const result = validateTransition('scheduled', 'at_facility', 'LAUNDRY');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });
  });

  describe('getProgress', () => {
    it('calculates correct progress for laundry flow', () => {
      expect(getProgress('scheduled', 'LAUNDRY')).toBe(0);
      expect(getProgress('picked_up', 'LAUNDRY')).toBeGreaterThan(0);
      expect(getProgress('delivered', 'LAUNDRY')).toBe(100);
    });

    it('calculates correct progress for cleaning flow', () => {
      expect(getProgress('scheduled', 'CLEANING')).toBe(0);
      expect(getProgress('processing', 'CLEANING')).toBe(50);
      expect(getProgress('cleaned', 'CLEANING')).toBe(100);
    });

    it('returns 0 for canceled status', () => {
      expect(getProgress('canceled', 'LAUNDRY')).toBe(0);
      expect(getProgress('canceled', 'CLEANING')).toBe(0);
    });
  });

  describe('mapLegacyStatus', () => {
    it('maps legacy statuses to unified statuses', () => {
      expect(mapLegacyStatus('pending_pickup')).toBe('scheduled');
      expect(mapLegacyStatus('paid_processing')).toBe('processing');
      expect(mapLegacyStatus('completed')).toBe('delivered');
    });

    it('returns status as-is if no mapping exists', () => {
      expect(mapLegacyStatus('picked_up')).toBe('picked_up');
      expect(mapLegacyStatus('canceled')).toBe('canceled');
    });
  });

  describe('mapToLegacyStatus', () => {
    it('maps unified statuses back to legacy', () => {
      expect(mapToLegacyStatus('scheduled')).toBe('pending_pickup');
      expect(mapToLegacyStatus('processing')).toBe('paid_processing');
      expect(mapToLegacyStatus('delivered')).toBe('completed');
      expect(mapToLegacyStatus('cleaned')).toBe('completed');
    });

    it('returns status as-is if no mapping exists', () => {
      expect(mapToLegacyStatus('picked_up')).toBe('picked_up');
      expect(mapToLegacyStatus('at_facility')).toBe('at_facility');
    });
  });

  describe('Constants', () => {
    it('exports correct terminal statuses', () => {
      expect(TERMINAL_STATUSES).toHaveLength(3);
      expect(TERMINAL_STATUSES).toContain('delivered');
      expect(TERMINAL_STATUSES).toContain('cleaned');
      expect(TERMINAL_STATUSES).toContain('canceled');
    });

    it('exports correct cancellable statuses', () => {
      expect(CANCELLABLE_STATUSES).toHaveLength(5);
      expect(CANCELLABLE_STATUSES).toContain('scheduled');
      expect(CANCELLABLE_STATUSES).toContain('awaiting_payment');
    });
  });
});
