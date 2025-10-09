import {
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
  TERMINAL_STATUSES,
  CANCELLABLE_STATUSES,
  type OrderStatus,
  type ServiceType,
} from '../orderStateMachine';

describe('orderStateMachine', () => {
  describe('canTransition', () => {
    describe('Laundry transitions', () => {
      it('allows pending → pending_pickup', () => {
        expect(canTransition('pending', 'pending_pickup', 'LAUNDRY')).toBe(true);
      });

      it('allows pending_pickup → at_facility', () => {
        expect(canTransition('pending_pickup', 'at_facility', 'LAUNDRY')).toBe(true);
      });

      it('allows at_facility → awaiting_payment', () => {
        expect(canTransition('at_facility', 'awaiting_payment', 'LAUNDRY')).toBe(true);
      });

      it('allows awaiting_payment → paid_processing when paid', () => {
        const paidOrder = { paid_at: '2025-01-01T00:00:00Z' };
        expect(canTransition('awaiting_payment', 'paid_processing', 'LAUNDRY', paidOrder)).toBe(true);
      });

      it('blocks awaiting_payment → paid_processing when not paid', () => {
        const unpaidOrder = {};
        expect(canTransition('awaiting_payment', 'paid_processing', 'LAUNDRY', unpaidOrder)).toBe(false);
      });

      it('allows paid_processing → in_progress', () => {
        expect(canTransition('paid_processing', 'in_progress', 'LAUNDRY')).toBe(true);
      });

      it('allows in_progress → out_for_delivery', () => {
        expect(canTransition('in_progress', 'out_for_delivery', 'LAUNDRY')).toBe(true);
      });

      it('allows out_for_delivery → delivered', () => {
        expect(canTransition('out_for_delivery', 'delivered', 'LAUNDRY')).toBe(true);
      });

      it('blocks invalid laundry transitions', () => {
        expect(canTransition('pending', 'delivered', 'LAUNDRY')).toBe(false);
        expect(canTransition('at_facility', 'delivered', 'LAUNDRY')).toBe(false);
      });
    });

    describe('Cleaning transitions', () => {
      it('allows pending → paid_processing (upfront payment)', () => {
        expect(canTransition('pending', 'paid_processing', 'CLEANING')).toBe(true);
      });

      it('allows paid_processing → pending_pickup', () => {
        expect(canTransition('paid_processing', 'pending_pickup', 'CLEANING')).toBe(true);
      });

      it('allows pending_pickup → in_progress', () => {
        expect(canTransition('pending_pickup', 'in_progress', 'CLEANING')).toBe(true);
      });

      it('allows in_progress → completed', () => {
        expect(canTransition('in_progress', 'completed', 'CLEANING')).toBe(true);
      });

      it('blocks invalid cleaning transitions', () => {
        expect(canTransition('pending', 'completed', 'CLEANING')).toBe(false);
        expect(canTransition('pending', 'pending_pickup', 'CLEANING')).toBe(false); // Must pay first
        expect(canTransition('in_progress', 'delivered', 'CLEANING')).toBe(false);
      });
    });

    describe('Cancellation transitions', () => {
      it('allows cancellation from pending', () => {
        expect(canTransition('pending', 'canceled', 'LAUNDRY')).toBe(true);
      });

      it('allows cancellation from pending_pickup', () => {
        expect(canTransition('pending_pickup', 'canceled', 'CLEANING')).toBe(true);
      });

      it('allows cancellation from at_facility', () => {
        expect(canTransition('at_facility', 'canceled', 'LAUNDRY')).toBe(true);
      });

      it('allows cancellation from awaiting_payment', () => {
        expect(canTransition('awaiting_payment', 'canceled', 'LAUNDRY')).toBe(true);
      });

      it('blocks cancellation from terminal statuses', () => {
        expect(canTransition('delivered', 'canceled', 'LAUNDRY')).toBe(false);
        expect(canTransition('completed', 'canceled', 'CLEANING')).toBe(false);
      });
    });
  });

  describe('getNextStatuses', () => {
    it('returns correct next statuses for laundry pending', () => {
      const next = getNextStatuses('pending', 'LAUNDRY');
      expect(next).toContain('pending_pickup');
      expect(next).toContain('canceled');
    });

    it('returns correct next statuses for awaiting_payment', () => {
      const next = getNextStatuses('awaiting_payment', 'LAUNDRY');
      expect(next).toContain('paid_processing');
      expect(next).toContain('canceled');
    });

    it('returns correct next statuses for cleaning in_progress', () => {
      const next = getNextStatuses('in_progress', 'CLEANING');
      expect(next).toContain('completed');
    });

    it('returns empty array for terminal statuses', () => {
      expect(getNextStatuses('delivered', 'LAUNDRY')).toHaveLength(0);
      expect(getNextStatuses('completed', 'CLEANING')).toHaveLength(0);
      expect(getNextStatuses('canceled', 'LAUNDRY')).toHaveLength(0);
    });
  });

  describe('getAvailableActions', () => {
    it('includes view for all statuses', () => {
      expect(getAvailableActions('pending', 'LAUNDRY')).toContain('view');
      expect(getAvailableActions('delivered', 'LAUNDRY')).toContain('view');
      expect(getAvailableActions('canceled', 'CLEANING')).toContain('view');
    });

    it('includes edit and cancel for early statuses', () => {
      const actions = getAvailableActions('pending', 'LAUNDRY');
      expect(actions).toContain('edit');
      expect(actions).toContain('cancel');
    });

    it('includes pay_quote for awaiting_payment', () => {
      const actions = getAvailableActions('awaiting_payment', 'LAUNDRY');
      expect(actions).toContain('pay_quote');
    });

    it('includes track for in-progress statuses', () => {
      expect(getAvailableActions('paid_processing', 'LAUNDRY')).toContain('track');
      expect(getAvailableActions('in_progress', 'CLEANING')).toContain('track');
      expect(getAvailableActions('out_for_delivery', 'LAUNDRY')).toContain('track');
    });

    it('includes rate and rebook for completed orders', () => {
      const deliveredActions = getAvailableActions('delivered', 'LAUNDRY');
      expect(deliveredActions).toContain('rate');
      expect(deliveredActions).toContain('rebook');

      const completedActions = getAvailableActions('completed', 'CLEANING');
      expect(completedActions).toContain('rate');
      expect(completedActions).toContain('rebook');
    });
  });

  describe('isTerminal', () => {
    it('returns true for terminal statuses', () => {
      expect(isTerminal('delivered')).toBe(true);
      expect(isTerminal('completed')).toBe(true);
      expect(isTerminal('canceled')).toBe(true);
    });

    it('returns false for non-terminal statuses', () => {
      expect(isTerminal('pending')).toBe(false);
      expect(isTerminal('pending_pickup')).toBe(false);
      expect(isTerminal('at_facility')).toBe(false);
      expect(isTerminal('awaiting_payment')).toBe(false);
      expect(isTerminal('in_progress')).toBe(false);
    });
  });

  describe('isCancellable', () => {
    it('returns true for cancellable statuses', () => {
      const cancellable: OrderStatus[] = [
        'pending',
        'pending_pickup',
        'at_facility',
        'awaiting_payment'
      ];
      cancellable.forEach(status => {
        expect(isCancellable(status)).toBe(true);
      });
    });

    it('returns false for non-cancellable statuses', () => {
      const nonCancellable: OrderStatus[] = [
        'paid_processing',
        'in_progress',
        'out_for_delivery',
        'delivered',
        'completed',
        'canceled'
      ];
      nonCancellable.forEach(status => {
        expect(isCancellable(status)).toBe(false);
      });
    });
  });

  describe('getStatusLabel', () => {
    it('returns correct labels for all statuses', () => {
      expect(getStatusLabel('pending')).toBe('Pending');
      expect(getStatusLabel('pending_pickup')).toBe('Pending Pickup');
      expect(getStatusLabel('awaiting_payment')).toBe('Awaiting Payment');
      expect(getStatusLabel('delivered')).toBe('Delivered');
      expect(getStatusLabel('completed')).toBe('Completed');
    });
  });

  describe('getStatusColor', () => {
    it('returns correct colors for all statuses', () => {
      expect(getStatusColor('pending')).toBe('blue');
      expect(getStatusColor('awaiting_payment')).toBe('orange');
      expect(getStatusColor('delivered')).toBe('green');
      expect(getStatusColor('canceled')).toBe('red');
    });
  });

  describe('getStatusSection', () => {
    it('returns upcoming for early statuses', () => {
      expect(getStatusSection('pending')).toBe('upcoming');
      expect(getStatusSection('pending_pickup')).toBe('upcoming');
    });

    it('returns in_progress for active statuses', () => {
      const inProgressStatuses: OrderStatus[] = [
        'at_facility',
        'awaiting_payment',
        'paid_processing',
        'in_progress',
        'out_for_delivery'
      ];
      inProgressStatuses.forEach(status => {
        expect(getStatusSection(status)).toBe('in_progress');
      });
    });

    it('returns completed for terminal success statuses', () => {
      expect(getStatusSection('delivered')).toBe('completed');
      expect(getStatusSection('completed')).toBe('completed');
    });

    it('returns canceled for canceled status', () => {
      expect(getStatusSection('canceled')).toBe('canceled');
    });
  });

  describe('validateTransition', () => {
    it('allows valid transitions', () => {
      const result = validateTransition('pending', 'pending_pickup', 'LAUNDRY');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('blocks invalid transitions', () => {
      const result = validateTransition('pending', 'delivered', 'LAUNDRY');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('blocks transitions from terminal statuses', () => {
      const result = validateTransition('delivered', 'pending', 'LAUNDRY');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('terminal');
    });

    it('allows no-op transitions', () => {
      const result = validateTransition('pending', 'pending', 'LAUNDRY');
      expect(result.valid).toBe(true);
    });
  });

  describe('getProgress', () => {
    it('calculates correct progress for laundry flow', () => {
      expect(getProgress('pending', 'LAUNDRY')).toBe(0);
      expect(getProgress('pending_pickup', 'LAUNDRY')).toBeGreaterThan(0);
      expect(getProgress('delivered', 'LAUNDRY')).toBe(100);
    });

    it('calculates correct progress for cleaning flow', () => {
      expect(getProgress('pending', 'CLEANING')).toBe(0);
      expect(getProgress('pending_pickup', 'CLEANING')).toBe(33); // 1 of 3 steps
      expect(getProgress('in_progress', 'CLEANING')).toBe(67); // 2 of 3 steps
      expect(getProgress('completed', 'CLEANING')).toBe(100);
    });

    it('returns 0 for canceled orders', () => {
      expect(getProgress('canceled', 'LAUNDRY')).toBe(0);
      expect(getProgress('canceled', 'CLEANING')).toBe(0);
    });
  });

  describe('Constants', () => {
    it('exports correct terminal statuses', () => {
      expect(TERMINAL_STATUSES).toHaveLength(3);
      expect(TERMINAL_STATUSES).toContain('delivered');
      expect(TERMINAL_STATUSES).toContain('completed');
      expect(TERMINAL_STATUSES).toContain('canceled');
    });

    it('exports correct cancellable statuses', () => {
      expect(CANCELLABLE_STATUSES).toHaveLength(4);
      expect(CANCELLABLE_STATUSES).toContain('pending');
      expect(CANCELLABLE_STATUSES).toContain('pending_pickup');
      expect(CANCELLABLE_STATUSES).toContain('awaiting_payment');
    });
  });
});
