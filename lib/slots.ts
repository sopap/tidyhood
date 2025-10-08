/**
 * Client-side slot and date validation utilities
 */

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
 * Format slot time for display
 */
export function formatSlotTime(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  
  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  const endTime = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  return `${startTime} - ${endTime}`;
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
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Get current time in NY ET timezone
 */
export function getNYTime(): Date {
  const now = new Date()
  // Convert to NY timezone
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  return nyTime
}

/**
 * Check if a slot is within 6 hours from now
 */
export function isSlotWithin6Hours(slotStart: string): boolean {
  const now = getNYTime()
  const slot = new Date(slotStart)
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000)
  return slot <= sixHoursFromNow
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
 * Calculate minimum delivery date based on pickup slot and service type
 * @param pickupSlotEnd - ISO string of pickup slot end time
 * @param isRush - whether rush service is selected
 * @returns ISO date string (YYYY-MM-DD) for minimum delivery date
 */
export function getMinimumDeliveryDate(pickupSlotEnd: string, isRush: boolean): string {
  const pickupEnd = new Date(pickupSlotEnd)
  const minimumHours = isRush ? 24 : 48
  const minDelivery = new Date(pickupEnd.getTime() + minimumHours * 60 * 60 * 1000)
  
  // Convert to NY timezone to get correct date
  const nyDateStr = minDelivery.toLocaleDateString('en-US', { 
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  // Convert MM/DD/YYYY to YYYY-MM-DD
  const [month, day, year] = nyDateStr.split('/')
  return `${year}-${month}-${day}`
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
  const minimumHours = isRush ? 24 : 48
  const minimumDeliveryTime = new Date(pickupEnd.getTime() + minimumHours * 60 * 60 * 1000)
  
  // Filter slots that meet minimum time requirement
  const validSlots = slots.filter(slot => {
    const slotTime = new Date(slot.slot_start)
    return slotTime >= minimumDeliveryTime
  })
  
  if (validSlots.length === 0) return null
  
  // Return the earliest valid slot
  return validSlots.reduce((earliest, current) => {
    return new Date(current.slot_start) < new Date(earliest.slot_start) ? current : earliest
  })
}
