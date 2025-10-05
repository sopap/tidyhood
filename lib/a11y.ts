/**
 * Accessibility utilities for announcements and focus management
 */

/**
 * Announce a message to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof window === 'undefined') return;
  
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Move focus to an element by ID
 */
export function moveFocusToElement(elementId: string): void {
  if (typeof window === 'undefined') return;
  
  setTimeout(() => {
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
    }
  }, 100);
}

/**
 * Trap focus within a container (for modals, tooltips)
 */
export function trapFocus(containerElement: HTMLElement): () => void {
  const focusableElements = containerElement.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  
  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
  
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  };
  
  containerElement.addEventListener('keydown', handleTabKey);
  
  // Return cleanup function
  return () => {
    containerElement.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Get accessible label for a weight tier
 */
export function getWeightTierLabel(tier: string, description: string, price: string): string {
  return `${tier}, ${description}, approximately ${price}`;
}

/**
 * Get accessible label for a time slot
 */
export function getSlotLabel(startTime: string, endTime: string, available: number, isFull: boolean): string {
  if (isFull) {
    return `${startTime} to ${endTime}, fully booked`;
  }
  return `${startTime} to ${endTime}, ${available} slots available`;
}

/**
 * Create a unique ID for accessibility
 */
let idCounter = 0;
export function generateA11yId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}
