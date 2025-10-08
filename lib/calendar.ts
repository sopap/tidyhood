// Calendar utilities for generating ICS calendar events

import { Order } from './types';

interface CalendarEventOptions {
  order: Order;
  includePickup?: boolean;
  includeDelivery?: boolean;
}

// Generate ICS calendar content
export function generateOrderICS(options: CalendarEventOptions): string {
  const { order, includePickup = true, includeDelivery = true } = options;
  
  // Helper to format date for ICS (YYYYMMDDTHHMMSSZ)
  const formatICSDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  // Helper to format address for location
  const formatAddress = () => {
    const addr = order.address_snapshot;
    if (!addr) return '';
    
    let location = addr.line1;
    if (addr.line2) location += `, ${addr.line2}`;
    location += `, ${addr.city}, NY ${addr.zip}`;
    return location;
  };

  const events: string[] = [];
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  // Add pickup event
  if (includePickup && order.slot_start && order.slot_end) {
    const pickupStart = formatICSDate(order.slot_start);
    const pickupEnd = formatICSDate(order.slot_end);
    
    events.push(`BEGIN:VEVENT
UID:pickup-${order.id}@tidyhood.com
DTSTAMP:${now}
DTSTART:${pickupStart}
DTEND:${pickupEnd}
SUMMARY:${order.service_type === 'LAUNDRY' ? 'Laundry' : 'Cleaning'} Pickup - Tidyhood
DESCRIPTION:Order #${order.id}\\n\\nService: ${order.service_type === 'LAUNDRY' ? 'Wash & Fold Laundry' : 'House Cleaning'}\\n\\nQuestions? Contact us at support@tidyhood.com
LOCATION:${formatAddress()}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT`);
  }

  // Add delivery event (for laundry orders)
  if (includeDelivery && order.delivery_slot_start && order.delivery_slot_end && order.service_type === 'LAUNDRY') {
    const deliveryStart = formatICSDate(order.delivery_slot_start);
    const deliveryEnd = formatICSDate(order.delivery_slot_end);
    
    events.push(`BEGIN:VEVENT
UID:delivery-${order.id}@tidyhood.com
DTSTAMP:${now}
DTSTART:${deliveryStart}
DTEND:${deliveryEnd}
SUMMARY:Laundry Delivery - Tidyhood
DESCRIPTION:Order #${order.id}\\n\\nYour clean laundry will be delivered during this window.\\n\\nQuestions? Contact us at support@tidyhood.com
LOCATION:${formatAddress()}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT`);
  }

  if (events.length === 0) {
    return '';
  }

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Tidyhood//Order Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Tidyhood Order #${order.id}
X-WR-TIMEZONE:America/New_York
${events.join('\n')}
END:VCALENDAR`;
}

// Determine if we should show add to calendar button
export function shouldShowAddToCalendar(order: Order): boolean {
  const now = new Date();
  const pickupTime = new Date(order.slot_start);
  
  // Don't show if pickup is more than 30 days away (too early)
  const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
  if (pickupTime > thirtyDaysFromNow) {
    return false;
  }
  
  // For laundry orders, check if we have delivery info
  if (order.service_type === 'LAUNDRY' && order.delivery_slot_start) {
    const deliveryTime = new Date(order.delivery_slot_start);
    const twentyFourHoursFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    
    // Don't show if delivery is less than 24 hours away
    if (deliveryTime <= twentyFourHoursFromNow) {
      return false;
    }
  }
  
  return true;
}

// Determine what events to include based on order status and timing
export function getCalendarEventOptions(order: Order): CalendarEventOptions {
  const now = new Date();
  const pickupTime = new Date(order.slot_start);
  
  // If pickup already happened, only include delivery
  if (pickupTime < now) {
    return {
      order,
      includePickup: false,
      includeDelivery: order.service_type === 'LAUNDRY' && !!order.delivery_slot_start,
    };
  }
  
  // If pickup hasn't happened yet, include both
  return {
    order,
    includePickup: true,
    includeDelivery: order.service_type === 'LAUNDRY' && !!order.delivery_slot_start,
  };
}

// Generate filename for ICS download
export function getCalendarFilename(order: Order): string {
  return `tidyhood-order-${order.id}.ics`;
}

// Create download link for calendar event
export function downloadCalendarEvent(order: Order): void {
  const options = getCalendarEventOptions(order);
  const icsContent = generateOrderICS(options);
  
  if (!icsContent) {
    console.warn('No calendar events to generate');
    return;
  }
  
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = getCalendarFilename(order);
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the object URL
  URL.revokeObjectURL(url);
}
