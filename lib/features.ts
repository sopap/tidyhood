/**
 * Feature flags for gradual rollout and safe deployment
 * Control which features are enabled via environment variables
 * 
 * @version 2.0 - Added Unified Order Detail Design System flags
 * @see UNIFIED_ORDER_DETAIL_DESIGN_SPEC.md
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
  
  /**
   * Cleaning V2 - Enhanced cleaning order workflow
   * Enables: Granular status tracking, disputes, partner location tracking, no-shows
   */
  CLEANING_V2: process.env.NEXT_PUBLIC_FLAG_CLEANING_V2 === '1',
  
  // ========================================
  // UNIFIED ORDER DETAIL DESIGN SYSTEM
  // ========================================
  
  /**
   * Unified Order UI - New unified design for order detail pages
   * Enables: New order header, unified timeline, enhanced components for both laundry & cleaning
   */
  UNIFIED_ORDER_UI: process.env.NEXT_PUBLIC_UNIFIED_ORDER_UI === 'true',
  
  /**
   * Unified Timeline - New 3-stage timeline component
   * Enables: Enhanced timeline with substates for both services
   */
  UNIFIED_TIMELINE: process.env.NEXT_PUBLIC_UNIFIED_TIMELINE === 'true',
  
  /**
   * Enhanced Animations - Smooth animations with reduced motion support
   * Enables: Motion design system from lib/animations.ts
   */
  ENHANCED_ANIMATIONS: process.env.NEXT_PUBLIC_ENHANCED_ANIMATIONS === 'true',
  
  /**
   * Analytics Tracking - Event tracking and performance monitoring
   * Enables: User interaction tracking, conversion funnels, Core Web Vitals monitoring
   */
  ANALYTICS_TRACKING: process.env.NEXT_PUBLIC_ANALYTICS === 'true',
  
  /**
   * Unified UI Rollout Percentage (0-100)
   * Controls what percentage of users see the new unified UI
   * 0 = disabled, 100 = all users
   */
  UNIFIED_UI_ROLLOUT: parseInt(process.env.NEXT_PUBLIC_UNIFIED_ROLLOUT || '0', 10),
  
  // Individual component flags for granular control
  /**
   * New Order Header - Enhanced sticky header component
   */
  NEW_HEADER: process.env.NEXT_PUBLIC_NEW_HEADER === 'true',
  
  /**
   * New Timeline - Enhanced timeline component
   */
  NEW_TIMELINE: process.env.NEXT_PUBLIC_NEW_TIMELINE === 'true',
  
  /**
   * New Details Card - Enhanced service details card
   */
  NEW_DETAILS_CARD: process.env.NEXT_PUBLIC_NEW_DETAILS_CARD === 'true',
} as const;

/**
 * Check if a specific feature is enabled
 * @param feature - Feature key from FEATURES object
 * @returns boolean indicating if feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FEATURES): boolean {
  const value = FEATURES[feature];
  // Handle number values (like UNIFIED_UI_ROLLOUT)
  if (typeof value === 'number') {
    return value > 0;
  }
  return Boolean(value);
}

/**
 * Get all enabled features (useful for debugging/admin view)
 * @returns Object with all feature flags and their current status
 */
export function getEnabledFeatures(): Record<string, boolean | number> {
  return Object.entries(FEATURES).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, boolean | number>);
}

/**
 * Simple hash function for consistent user bucketing
 * Used for gradual rollout of features to specific percentage of users
 * 
 * @param str - String to hash (typically user ID)
 * @returns Hash value
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if a user is in a percentage-based rollout
 * Uses consistent hashing to ensure same user always gets same result
 * 
 * @param userId - User ID for bucketing
 * @param percentage - Rollout percentage (0-100)
 * @returns true if user is in the rollout group
 */
export function isInRollout(userId: string, percentage: number): boolean {
  if (percentage === 0) return false;
  if (percentage === 100) return true;
  if (percentage < 0 || percentage > 100) return false;
  
  const hash = simpleHash(userId);
  return (hash % 100) < percentage;
}

/**
 * Check if unified order UI should be shown for a specific user
 * Combines feature flag check with rollout percentage
 * 
 * @param userId - User ID for rollout check
 * @returns true if user should see unified UI
 */
export function shouldShowUnifiedUI(userId: string): boolean {
  return FEATURES.UNIFIED_ORDER_UI && isInRollout(userId, FEATURES.UNIFIED_UI_ROLLOUT);
}

/**
 * Get the UI version to show for a user
 * Useful for analytics and debugging
 * 
 * @param userId - User ID
 * @param serviceType - 'LAUNDRY' or 'CLEANING'
 * @returns 'unified' | 'cleaning_v2' | 'legacy'
 */
export function getUIVersion(userId: string, serviceType: 'LAUNDRY' | 'CLEANING'): 'unified' | 'cleaning_v2' | 'legacy' {
  if (shouldShowUnifiedUI(userId)) {
    return 'unified';
  }
  
  if (serviceType === 'CLEANING' && FEATURES.CLEANING_V2) {
    return 'cleaning_v2';
  }
  
  return 'legacy';
}
