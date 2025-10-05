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
  const pickup = new Date(pickupISO);
  const delivery = new Date(pickup.getTime() + 48 * 60 * 60 * 1000);
  return delivery.toISOString();
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}
