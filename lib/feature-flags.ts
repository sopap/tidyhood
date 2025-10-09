/**
 * Feature Flag System
 * 
 * Provides a safe rollout mechanism for the payment authorization system.
 * Allows gradual rollout by percentage and includes test user overrides.
 */

import crypto from 'crypto';

export interface FeatureConfig {
  enabled: boolean;
  percentage: number;
  testUsers: string[];
}

/**
 * Feature flag configurations
 * 
 * Configure via environment variables:
 * - ENABLE_PAYMENT_AUTH: 'true' to enable the feature
 * - PAYMENT_AUTH_PERCENTAGE: '0' to '100' for percentage rollout
 * - PAYMENT_AUTH_TEST_USERS: comma-separated user IDs who always get the feature
 */
export const FEATURES = {
  PAYMENT_AUTHORIZATION: {
    enabled: process.env.ENABLE_PAYMENT_AUTH === 'true',
    percentage: parseInt(process.env.PAYMENT_AUTH_PERCENTAGE || '0', 10),
    testUsers: process.env.PAYMENT_AUTH_TEST_USERS?.split(',').filter(Boolean) || [],
  }
} as const;

/**
 * Hash a user ID to get a deterministic number for percentage rollout
 * 
 * @param userId - The user ID to hash
 * @returns A number between 0 and 2^32
 */
function hashUserId(userId: string): number {
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  return parseInt(hash.substring(0, 8), 16);
}

/**
 * Check if a feature is enabled for a specific user
 * 
 * @param feature - The feature key
 * @param userId - The user ID to check
 * @returns True if the feature is enabled for this user
 */
export function isFeatureEnabled(
  feature: keyof typeof FEATURES,
  userId: string
): boolean {
  const config = FEATURES[feature];
  
  // Feature disabled globally
  if (!config.enabled) {
    return false;
  }
  
  // Test users always get the feature
  if (config.testUsers.includes(userId)) {
    return true;
  }
  
  // Percentage rollout (deterministic based on user ID)
  // This ensures the same user always gets the same result
  const hash = hashUserId(userId);
  const bucket = hash % 100; // Maps to 0-99
  
  return bucket < config.percentage;
}

/**
 * Check if payment authorization is enabled for a user
 * 
 * @param userId - The user ID to check
 * @returns True if the user should use payment authorization
 */
export function canUsePaymentAuthorization(userId: string): boolean {
  return isFeatureEnabled('PAYMENT_AUTHORIZATION', userId);
}

/**
 * Check if Setup Intent flow is enabled (client-side compatible)
 * 
 * @deprecated Setup Intent is now the ONLY payment flow for laundry orders.
 * This function always returns true and will be removed in a future version.
 * 
 * @returns Always returns true
 */
export async function isSetupIntentEnabled(): Promise<boolean> {
  // Setup Intent is now the only flow for laundry orders
  // This function kept for backward compatibility but always returns true
  return true;
}

/**
 * Get feature status for debugging/monitoring
 * 
 * @returns Object with feature configuration status
 */
export function getFeatureStatus() {
  return {
    payment_authorization: {
      enabled: FEATURES.PAYMENT_AUTHORIZATION.enabled,
      percentage: FEATURES.PAYMENT_AUTHORIZATION.percentage,
      test_user_count: FEATURES.PAYMENT_AUTHORIZATION.testUsers.length,
    }
  };
}

/**
 * Validate feature flag environment variables
 * 
 * @throws Error if environment variables are invalid
 */
export function validateFeatureFlags() {
  const percentage = FEATURES.PAYMENT_AUTHORIZATION.percentage;
  
  if (isNaN(percentage) || percentage < 0 || percentage > 100) {
    throw new Error(
      `Invalid PAYMENT_AUTH_PERCENTAGE: ${process.env.PAYMENT_AUTH_PERCENTAGE}. Must be 0-100.`
    );
  }
  
  // Warn if feature is enabled but percentage is 0
  if (FEATURES.PAYMENT_AUTHORIZATION.enabled && percentage === 0 && FEATURES.PAYMENT_AUTHORIZATION.testUsers.length === 0) {
    console.warn(
      'WARNING: ENABLE_PAYMENT_AUTH is true but PAYMENT_AUTH_PERCENTAGE is 0 and no test users configured. Feature will not be accessible.'
    );
  }
}

// Validate on module load
if (typeof window === 'undefined') {
  // Only validate on server side
  try {
    validateFeatureFlags();
  } catch (error) {
    console.error('Feature flag validation failed:', error);
  }
}
