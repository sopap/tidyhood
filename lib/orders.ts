import { Order, OrderStatus } from './types';

export interface GroupedOrders {
  upcoming: Order[];
  inProgress: Order[];
  completed: Order[];
  past: Order[];
}

export interface StatusUIConfig {
  label: string;
  tone: 'blue' | 'indigo' | 'green' | 'yellow' | 'gray';
}

/**
 * Maps database status to user-friendly UI label and color tone
 */
export function statusToUI(status: OrderStatus): StatusUIConfig {
  const map: Record<OrderStatus, StatusUIConfig> = {
    pending: { label: 'Pending', tone: 'yellow' },
    pending_pickup: { label: 'Pickup Scheduled', tone: 'blue' },
    at_facility: { label: 'In Progress', tone: 'indigo' },
    paid_processing: { label: 'In Progress', tone: 'indigo' },
    awaiting_payment: { label: 'Awaiting Payment', tone: 'yellow' },
    completed: { label: 'Completed', tone: 'green' },
    canceled: { label: 'Canceled', tone: 'gray' },
  };
  
  return map[status] || { label: status, tone: 'gray' };
}

/**
 * Formats cents to dollar string
 */
export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Groups orders into sections based on status and date
 */
export function groupOrders(orders: Order[]): GroupedOrders {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const grouped: GroupedOrders = {
    upcoming: [],
    inProgress: [],
    completed: [],
    past: [],
  };
  
  for (const order of orders) {
    const slotDate = new Date(order.slot_start);
    const isFuture = slotDate > now;
    const isRecent = slotDate > thirtyDaysAgo;
    
    // Upcoming: scheduled orders in the future
    if (order.status === 'pending_pickup' && isFuture) {
      grouped.upcoming.push(order);
    }
    // In Progress: active orders (at facility, being processed)
    else if (order.status === 'at_facility' || order.status === 'paid_processing') {
      grouped.inProgress.push(order);
    }
    // Completed: finished orders from last 30 days
    else if ((order.status === 'completed' || order.status === 'awaiting_payment') && isRecent) {
      grouped.completed.push(order);
    }
    // Past: everything older than 30 days
    else if (!isRecent) {
      grouped.past.push(order);
    }
    // Fallback: put pending/canceled in completed if recent, otherwise past
    else if (isRecent) {
      grouped.completed.push(order);
    } else {
      grouped.past.push(order);
    }
  }
  
  return grouped;
}

/**
 * Formats a date for display
 */
export function formatOrderDate(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a time window for display
 */
export function formatTimeWindow(startISO: string, endISO: string): string {
  const start = new Date(startISO).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const end = new Date(endISO).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${start}–${end}`;
}
