import { Order, OrderStatus } from './types';
import { 
  getStatusLabel, 
  getStatusColor, 
  getStatusSection,
  isTerminal,
  mapLegacyStatus 
} from './orderStateMachine';

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
 * Uses unified state machine helpers
 */
export function statusToUI(status: OrderStatus): StatusUIConfig {
  const label = getStatusLabel(status);
  const color = getStatusColor(status);
  
  // Map state machine colors to UI tones
  const colorMap: Record<string, StatusUIConfig['tone']> = {
    'blue': 'blue',
    'yellow': 'yellow',
    'purple': 'indigo',
    'orange': 'yellow',
    'indigo': 'indigo',
    'green': 'green',
    'red': 'gray',
    'gray': 'gray'
  };
  
  return {
    label,
    tone: colorMap[color] || 'gray'
  };
}

/**
 * Backward compatibility: convert legacy status to unified status
 */
export function normalizeLegacyStatus(status: string): OrderStatus {
  return mapLegacyStatus(status);
}

/**
 * Formats cents to dollar string
 */
export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Groups orders into sections based on status and date
 * Uses unified state machine helpers
 * 
 * IMPORTANT: Orders are only "completed" when:
 * - LAUNDRY: Status is 'delivered' (items returned to customer)
 * - CLEANING: Status is 'cleaned' (service finished)
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
    
    // Use state machine helper to categorize
    const section = getStatusSection(order.status);
    const terminal = isTerminal(order.status);
    
    // Upcoming: scheduled orders in the future
    if (section === 'upcoming' && isFuture) {
      grouped.upcoming.push(order);
    }
    // In Progress: orders actively being worked on
    else if (section === 'in_progress') {
      grouped.inProgress.push(order);
    }
    // Completed: terminal success states (delivered/cleaned) that are recent
    else if (section === 'completed' && isRecent) {
      grouped.completed.push(order);
    }
    // Past: older completed orders, canceled orders, or terminal states that aren't recent
    else if (!isRecent || section === 'canceled' || terminal) {
      grouped.past.push(order);
    }
    // Fallback: scheduled orders in the past go to inProgress
    else if (section === 'upcoming' && !isFuture) {
      grouped.inProgress.push(order);
    }
    // Final fallback
    else {
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
