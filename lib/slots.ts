/**
 * Client-side slot and date validation utilities
 */

import { getNYTime, formatTimeWindow as formatTimeWindowTZ, getMinimumDeliveryDate as getMinimumDeliveryDateTZ, isSlotWithin6Hours as isSlotWithin6HoursTZ } from './timezone';

/**
 * Check if a date should be disabled in the date picker
 */
export function isDateDisabled(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Disable past dates
  const dateToCheck = new Date(date);
  dateToCheck.setHours(0, 0, 0, 0);
  if (dateToCheck < today) {
    return true;
  }
  
  // Disable Sundays (day 0)
  if (date.getDay() === 0) {
    return true;
  }
  
  return false;
}

/**
 * Get minimum selectable date (tomorrow)
 */
export function getMinDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Format slot time for display (uses NY ET timezone)
 */
export function formatSlotTime(startISO: string, endISO: string): string {
  return formatTimeWindowTZ(startISO, endISO);
}

/**
 * Get capacity badge info based on availability
 */
export function getCapacityBadge(availableUnits: number): {
  text: string;
  variant: 'error' | 'warning' | 'success';
} {
  if (availableUnits === 0) {
    return { text: 'Full', variant: 'error' };
  }
  
  if (availableUnits < 5) {
    return { text: `Only ${availableUnits} left`, variant: 'error' };
  }
  
  if (availableUnits < 10) {
    return { text: `${availableUnits} available`, variant: 'warning' };
  }
  
  return { text: `${availableUnits} available`, variant: 'success' };
}

/**
 * Check if a date string is a Sunday
 */
export function isSunday(dateString: string): boolean {
  const date = new Date(dateString);
  return date.getDay() === 0;
}

/**
 * Get delivery date (48 hours after pickup)
 */
export function getDefaultDeliveryDate(pickupISO: string): string {
  const pickup = new Date(pickupISO)
  const delivery = new Date(pickup.getTime() + 48 * 60 * 60 * 1000)
  return delivery.toISOString()
}

/**
 * Format date for display (uses NY ET timezone)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Check if a slot is within 6 hours from now (uses NY ET timezone)
 */
export function isSlotWithin6Hours(slotStart: string): boolean {
  return isSlotWithin6HoursTZ(slotStart);
}

/**
 * Filter out slots that are in the past or within 6 hours
 */
export function filterAvailableSlots<T extends { slot_start: string }>(slots: T[]): T[] {
  const now = getNYTime()
  return slots.filter(slot => {
    const slotTime = new Date(slot.slot_start)
    return slotTime > now && !isSlotWithin6Hours(slot.slot_start)
  })
}

/**
 * Find slot closest to 24 hours from now
 */
export function findSlotClosestTo24Hours<T extends { slot_start: string }>(slots: T[]): T | null {
  if (slots.length === 0) return null
  
  const now = getNYTime()
  const target24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  
  let closest: T | null = null
  let minDiff = Infinity
  
  for (const slot of slots) {
    const slotTime = new Date(slot.slot_start)
    const diff = Math.abs(slotTime.getTime() - target24Hours.getTime())
    
    if (diff < minDiff) {
      minDiff = diff
      closest = slot
    }
  }
  
  return closest
}

/**
 * Calculate minimum delivery date based on pickup slot and service type (uses NY ET timezone)
 * CLIENT-SIDE VERSION: Accepts policy as parameter instead of fetching from database
 * @param pickupSlotEnd - ISO string of pickup slot end time
 * @param isRush - whether rush service is selected
 * @param serviceType - LAUNDRY or CLEANING service type
 * @param policy - Optional delivery policy object (if not provided, uses fallback of 48h)
 * @returns ISO date string (YYYY-MM-DD) for minimum delivery date
 */
export function getMinimumDeliveryDate(
  pickupSlotEnd: string,
  isRush: boolean,
  serviceType: 'LAUNDRY' | 'CLEANING' = 'LAUNDRY',
  policy?: { standard_minimum_hours: number; rush_cutoff_hour: number; rush_early_pickup_hours: number; rush_late_pickup_hours: number }
): string {
  // Use provided policy or fallback to 48h standard
  const deliveryPolicy = policy || {
    standard_minimum_hours: 48,
    rush_cutoff_hour: 11,
    rush_early_pickup_hours: 0,
    rush_late_pickup_hours: 24
  };
  
  const pickupEnd = new Date(pickupSlotEnd);
  
  // Get the full date/time parts in NY timezone
  const nyDateTimeStr = pickupEnd.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Parse: "MM/DD/YYYY, HH:mm:ss"
  const [datePart, timePart] = nyDateTimeStr.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour] = timePart.split(':');
  const pickupEndHourNY = parseInt(hour);
  
  console.log('🚀 [getMinimumDeliveryDate - CLIENT]', {
    pickupSlotEnd,
    pickupEndHourNY,
    isRush,
    serviceType,
    nyDateTimeStr,
    policy: deliveryPolicy
  });
  
  // Determine minimum hours based on service type and pickup time
  let minimumHours: number;
  if (isRush && pickupEndHourNY <= deliveryPolicy.rush_cutoff_hour) {
    // Same day service: if pickup ends at or before cutoff hour, can deliver same day
    minimumHours = deliveryPolicy.rush_early_pickup_hours; // Typically 0 for same day
  } else if (isRush) {
    // Same day service: if pickup after cutoff hour, deliver next day
    minimumHours = deliveryPolicy.rush_late_pickup_hours; // Typically 24h
  } else {
    // Standard service
    minimumHours = deliveryPolicy.standard_minimum_hours; // Your 26h setting
  }
  
  console.log('📦 Minimum hours required:', minimumHours);
  
  const minDelivery = new Date(pickupEnd.getTime() + minimumHours * 60 * 60 * 1000);
  
  // Convert to NY timezone to get correct date
  const nyDateStr = minDelivery.toLocaleDateString('en-US', { 
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  
  console.log('📅 Minimum delivery date (NY):', nyDateStr);
  
  // Convert MM/DD/YYYY to YYYY-MM-DD
  const [minMonth, minDay, minYear] = nyDateStr.split('/');
  const result = `${minYear}-${minMonth.padStart(2, '0')}-${minDay.padStart(2, '0')}`;
  
  console.log('✅ Final minimum delivery date:', result);
  
  return result;
}

/**
 * Find delivery slot closest to the minimum allowed time
 */
export function findEarliestDeliverySlot<T extends { slot_start: string }>(
  slots: T[],
  pickupSlotEnd: string,
  isRush: boolean
): T | null {
  if (slots.length === 0) return null
  
  const pickupEnd = new Date(pickupSlotEnd)
  
  // Get pickup end hour in NY timezone
  const pickupEndHourNY = parseInt(pickupEnd.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    hour12: false
  }))
  
  // Determine minimum hours based on service type and pickup time
  let minimumHours: number
  let requireEveningSlot = false
  
  if (isRush && pickupEndHourNY <= 11) {
    // Same day service: if pickup ends at or before 11 AM, can deliver same day
    // BUT delivery must be in evening slots (6 PM or later)
    minimumHours = 0 // Allow same-day date
    requireEveningSlot = true // Only evening slots (18:00+)
  } else if (isRush) {
    // Same day service: if pickup after 11 AM, deliver next day (24h)
    minimumHours = 24
  } else {
    // Standard service: 48 hours
    minimumHours = 48
  }
  
  const minimumDeliveryTime = new Date(pickupEnd.getTime() + minimumHours * 60 * 60 * 1000)
  
  // Filter slots that meet minimum time requirement
  const validSlots = slots.filter(slot => {
    const slotTime = new Date(slot.slot_start)
    
    // Check time requirement
    if (slotTime < minimumDeliveryTime) {
      return false
    }
    
    // For same-day delivery, ensure slot starts at 6 PM or later (18:00 in NY timezone)
    if (requireEveningSlot) {
      const slotHourNY = parseInt(slotTime.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        hour12: false
      }))
      
      // Must be 6 PM (18:00) or later
      if (slotHourNY < 18) {
        return false
      }
    }
    
    return true
  })
  
  if (validSlots.length === 0) return null
  
  // Return the earliest valid slot
  return validSlots.reduce((earliest, current) => {
    return new Date(current.slot_start) < new Date(earliest.slot_start) ? current : earliest
  })
}
