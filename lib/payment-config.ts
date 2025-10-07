/**
 * Payment Authorization System Configuration
 * 
 * This file contains all configuration constants for the payment authorization system.
 * These values control authorization amounts, variance thresholds, no-show policies,
 * and retry behavior.
 */

export const PAYMENT_CONFIG = {
  // Auto-charge threshold (when to automatically charge vs request approval)
  VARIANCE_THRESHOLD_PCT: 20, // Auto-charge if quote within ±20% of estimate
  
  // Card validation (Setup Intent approach)
  CARD_VALIDATION_AMOUNT_CENTS: 1, // $0.01 test charge to validate card works
  CARD_VALIDATION_ENABLED: false,  // Disabled - SetupIntent already validates the card
  
  // No-show policy
  NO_SHOW_FEE_CENTS: 2500,         // $25 no-show fee
  NO_SHOW_GRACE_PERIOD_MIN: 30,    // 30 minutes grace period after pickup window
  
  // Cancellation policy
  CANCELLATION_REFUND_HOURS: 2,    // Free cancellation 2+ hours before pickup
  
  // Failed charge recovery
  PAYMENT_RETRY_GRACE_PERIOD_HOURS: 24, // 24 hours to update payment method
  
  // Retry configuration for failed charges
  MAX_CAPTURE_RETRIES: 3,
  RETRY_DELAY_MS: [1000, 5000, 15000], // Exponential backoff: 1s, 5s, 15s
  
  // Stripe API limits
  STRIPE_MAX_REQUESTS_PER_SECOND: 100,
  STRIPE_SAFE_THRESHOLD: 95, // Leave 5 requests as buffer
} as const;

export type ServiceCategory = 'wash_fold' | 'dry_clean' | 'mixed';

/**
 * Validate a payment method with a test charge
 * 
 * This charges $0.01 to confirm the card works and has funds,
 * then immediately refunds it. Customer sees $0.00 net.
 * 
 * @returns The validation amount in cents
 */
export function getCardValidationAmount(): number {
  return PAYMENT_CONFIG.CARD_VALIDATION_ENABLED 
    ? PAYMENT_CONFIG.CARD_VALIDATION_AMOUNT_CENTS 
    : 0;
}

/**
 * Calculate the variance percentage between quote and authorized amount
 * 
 * @param quoteCents - The final quote amount in cents
 * @param authorizedCents - The authorized amount in cents
 * @returns Variance percentage (positive = over estimate, negative = under estimate)
 */
export function calculateVariancePercentage(
  quoteCents: number,
  authorizedCents: number
): number {
  if (authorizedCents === 0) return 0;
  
  return ((quoteCents - authorizedCents) / authorizedCents) * 100;
}

/**
 * Check if quote is within auto-charge threshold
 * 
 * @param quoteCents - The final quote amount in cents
 * @param authorizedCents - The authorized amount in cents
 * @returns True if quote can be auto-charged
 */
export function canAutoCharge(
  quoteCents: number,
  authorizedCents: number
): boolean {
  const variance = Math.abs(calculateVariancePercentage(quoteCents, authorizedCents));
  
  return variance <= PAYMENT_CONFIG.VARIANCE_THRESHOLD_PCT;
}

/**
 * Get the delay for a retry attempt
 * 
 * @param attemptNumber - The attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function getRetryDelay(attemptNumber: number): number {
  if (attemptNumber >= PAYMENT_CONFIG.RETRY_DELAY_MS.length) {
    return PAYMENT_CONFIG.RETRY_DELAY_MS[PAYMENT_CONFIG.RETRY_DELAY_MS.length - 1];
  }
  
  return PAYMENT_CONFIG.RETRY_DELAY_MS[attemptNumber];
}

/**
 * Check if payment retry grace period has expired
 * 
 * @param failedAt - Timestamp when payment failed
 * @returns True if grace period has expired
 */
export function isPaymentGracePeriodExpired(failedAt: string): boolean {
  const failedTime = new Date(failedAt).getTime();
  const now = Date.now();
  const gracePeriodMs = PAYMENT_CONFIG.PAYMENT_RETRY_GRACE_PERIOD_HOURS * 60 * 60 * 1000;
  
  return (now - failedTime) > gracePeriodMs;
}
