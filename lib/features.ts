/**
 * Feature flags for gradual rollout and safe deployment
 * Control which features are enabled via environment variables
 */

export const FEATURES = {
  /**
   * Partner Portal - Complete partner self-service interface
   * Enables: /partner routes, partner authentication, order management
   */
  PARTNER_PORTAL: process.env.NEXT_PUBLIC_ENABLE_PARTNER_PORTAL === 'true',
  
  /**
   * Capacity Calendar - Visual capacity management
   * Enables: Calendar view, drag-drop scheduling, visual capacity indicators
   */
  CAPACITY_CALENDAR: process.env.NEXT_PUBLIC_ENABLE_CAPACITY_CALENDAR === 'true',
  
  /**
   * Auto-Assign - Automatic order-to-partner assignment
   * Enables: Smart routing algorithm, load balancing, auto-assignment API
   */
  AUTO_ASSIGN: process.env.NEXT_PUBLIC_ENABLE_AUTO_ASSIGN === 'true',
  
  /**
   * Automated Notifications - Background notification processing
   * Enables: Cron jobs for reminders, quote expiration, SLA alerts
   */
  AUTOMATED_NOTIFICATIONS: process.env.NEXT_PUBLIC_ENABLE_AUTO_NOTIFICATIONS === 'true',
} as const;

/**
 * Check if a specific feature is enabled
 * @param feature - Feature key from FEATURES object
 * @returns boolean indicating if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  return FEATURES[feature] || false;
}

/**
 * Get all enabled features (useful for debugging/admin view)
 * @returns Object with all feature flags and their current status
 */
export function getEnabledFeatures(): Record<string, boolean> {
  return Object.entries(FEATURES).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, boolean>);
}
