import type { Order } from '@/lib/types';

/**
 * SMS Response Templates
 * Keep messages short, friendly, and action-oriented
 */

export const responses = {
  // Pickup notifications
  pickupNotification: (order: Order, pickupTime: string, address: string) => 
    `🧺 New ${order.service_type} order #${order.id.slice(-4)}
📍 ${address.split(',')[0]}
⏰ Pickup: ${pickupTime}

Reply CONFIRM or RESCHEDULE`,

  pickupConfirmed: (pickupTime: string) => 
    `✅ Pickup confirmed for ${pickupTime}. Text when picked up!`,

  pickupRescheduled: () => 
    `No problem! Please visit the partner portal to choose a new time.`,

  // After pickup
  requestWeight: (orderShortId: string) => 
    `📊 Order ${orderShortId} - What's the actual weight? (Reply with number, e.g. "18")`,

  weightConfirmed: (weight: number, serviceType: string) => {
    const emoji = serviceType === 'laundry' ? '👕' : '🧹';
    return `${emoji} Got it: ${weight} lbs. Calculating quote...`;
  },

  // Quote submission
  quoteReady: (amount: number, weight: number) => 
    `💰 Quote: $${(amount / 100).toFixed(2)} for ${weight} lbs
    
Reply OK to submit for approval`,

  quoteSubmitted: () => 
    `✅ Quote submitted! Admin will approve & charge customer. I'll text when ready for delivery.`,

  quoteRejected: () => 
    `❌ Uh oh! Admin may need to adjust. Check portal for details.`,

  // Delivery notifications
  deliveryReady: (deliveryTime: string, address: string) => 
    `🚗 Ready for delivery!
⏰ ${deliveryTime}
📍 ${address}

Reply CONFIRM or suggest different time`,

  deliveryConfirmed: (deliveryTime: string) => 
    `✅ Delivery confirmed for ${deliveryTime}. Safe travels!`,

  deliveryRescheduled: () => 
    `👍 What time works better? (e.g. "tomorrow 2pm")`,

  deliveryTimeReceived: (suggestedTime: string) => 
    `Got it! We'll check if ${suggestedTime} works and get back to you.`,

  // Completion
  orderComplete: (orderShortId: string) => 
    `🎉 Order ${orderShortId} marked complete. Great work!`,

  // Errors & fallbacks
  unknown: () => 
    `🤔 I didn't quite get that. Common replies:
- CONFIRM
- OK  
- A number (for weight)
- Or check the partner portal`,

  error: () => 
    `⚠️ Something went wrong. Please use the partner portal or contact support.`,

  notFound: (orderShortId?: string) => {
    if (orderShortId) {
      return `❓ Couldn't find order ${orderShortId}. Check the partner portal?`;
    }
    return `❓ I don't have any active orders for you. Check the partner portal?`;
  },

  // Help
  help: () => 
    `📱 Partner SMS Assistant

I'll text you about:
- New pickups (reply CONFIRM)
- Weight collection (reply with number)
- Quote approval (reply OK)
- Delivery scheduling

For complex tasks, use the partner portal.`,
};

/**
 * Format time for SMS display
 */
export function formatTimeForSMS(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format address for SMS (first line only)
 */
export function formatAddressForSMS(fullAddress: string): string {
  return fullAddress.split(',')[0].trim();
}
