/**
 * Centralized timezone utilities for consistent NY ET timezone handling
 * across admin, partner, and user interfaces
 */

export const NY_TIMEZONE = 'America/New_York';

/**
 * Get current time in NY ET timezone
 */
export function getNYTime(): Date {
  const now = new Date();
  // Convert to NY timezone string, then parse back to Date object
  const nyTimeString = now.toLocaleString('en-US', { timeZone: NY_TIMEZONE });
  return new Date(nyTimeString);
}

/**
 * Format a date/time to NY ET timezone
 */
export function toNYTime(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  const nyTimeString = d.toLocaleString('en-US', { timeZone: NY_TIMEZONE });
  return new Date(nyTimeString);
}

/**
 * Format date for display in NY ET timezone
 * Example: "Monday, October 8, 2025"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    timeZone: NY_TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date for short display in NY ET timezone
 * Example: "Mon, Oct 8, 2025"
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    timeZone: NY_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date without year in NY ET timezone
 * Example: "Mon, Oct 8"
 */
export function formatDateNoYear(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    timeZone: NY_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time for display in NY ET timezone
 * Example: "2:30 PM"
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    timeZone: NY_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date and time for display in NY ET timezone
 * Example: "Mon, Oct 8, 2:30 PM"
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    timeZone: NY_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date and time with year in NY ET timezone
 * Example: "Mon, Oct 8, 2025, 2:30 PM"
 */
export function formatDateTimeFull(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    timeZone: NY_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a time window (start - end) in NY ET timezone
 * Example: "2:00 PM - 4:00 PM"
 */
export function formatTimeWindow(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  
  const startTime = start.toLocaleTimeString('en-US', {
    timeZone: NY_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  const endTime = end.toLocaleTimeString('en-US', {
    timeZone: NY_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  
  return `${startTime} - ${endTime}`;
}

/**
 * Format order date in NY ET timezone
 * Example: "Mon, Oct 8, 2025"
 */
export function formatOrderDate(dateISO: string): string {
  return new Date(dateISO).toLocaleDateString('en-US', {
    timeZone: NY_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get minimum delivery date based on pickup slot and service type in NY ET timezone
 * @param pickupSlotEnd - ISO string of pickup slot end time
 * @param isRush - whether rush service (same day) is selected
 * @returns ISO date string (YYYY-MM-DD) for minimum delivery date
 */
export function getMinimumDeliveryDate(pickupSlotEnd: string, isRush: boolean): string {
  const pickupEnd = new Date(pickupSlotEnd);
  
  // Get the full date/time parts in NY timezone
  const nyDateTimeStr = pickupEnd.toLocaleString('en-US', {
    timeZone: NY_TIMEZONE,
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
  
  console.log('🚀 [getMinimumDeliveryDate]', {
    pickupSlotEnd,
    pickupEndHourNY,
    isRush,
    nyDateTimeStr
  });
  
  // Determine minimum hours based on service type and pickup time
  let minimumHours: number;
  if (isRush && pickupEndHourNY <= 11) {
    // Same day service: if pickup ends at or before 11 AM, can deliver same day
    // Delivery slots must be evening (6 PM or later), but we set minimum to 0
    // to allow same-day date, then filter for evening slots elsewhere
    minimumHours = 0; // Same day delivery allowed
  } else if (isRush) {
    // Same day service: if pickup after 11 AM, deliver next day (24h)
    minimumHours = 24;
  } else {
    // Standard service: 48 hours
    minimumHours = 48;
  }
  
  console.log('📦 Minimum hours required:', minimumHours);
  
  const minDelivery = new Date(pickupEnd.getTime() + minimumHours * 60 * 60 * 1000);
  
  // Convert to NY timezone to get correct date
  const nyDateStr = minDelivery.toLocaleDateString('en-US', { 
    timeZone: NY_TIMEZONE,
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
 * Check if a slot is within 6 hours from now (in NY ET timezone)
 */
export function isSlotWithin6Hours(slotStart: string): boolean {
  const now = getNYTime();
  const slot = new Date(slotStart);
  const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  return slot <= sixHoursFromNow;
}

/**
 * Check if a slot is in the past (in NY ET timezone)
 */
export function isSlotInPast(slotStart: string): boolean {
  const now = getNYTime();
  return new Date(slotStart) < now;
}

/**
 * Format cancellation deadline in NY ET timezone
 * Example: "4:30 PM on Mon, Oct 7"
 */
export function formatCancellationDeadline(deadline: Date): string {
  const timeStr = deadline.toLocaleTimeString('en-US', {
    timeZone: NY_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const dateStr = deadline.toLocaleDateString('en-US', {
    timeZone: NY_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return `${timeStr} on ${dateStr}`;
}
