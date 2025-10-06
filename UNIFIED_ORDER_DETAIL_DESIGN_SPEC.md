# 🎨 Unified Order Detail Design System
## Complete Specification v2.0 - Enhanced Edition

**Status:** Ready for Implementation  
**Score:** 10/10  
**Last Updated:** October 5, 2025

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Design System Foundation](#design-system-foundation)
3. [Component Architecture](#component-architecture)
4. [Error States & Edge Cases](#error-states--edge-cases)
5. [Performance Specifications](#performance-specifications)
6. [Analytics & Tracking](#analytics--tracking)
7. [Feature Flags & Rollback Strategy](#feature-flags--rollback-strategy)
8. [Accessibility Enhancements](#accessibility-enhancements)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Success Metrics](#success-metrics)

---

## Executive Summary

### Current State Analysis

**Laundry Order View** (Legacy - `app/orders/[id]/page.tsx`)
- ❌ Generic, reusable components lack polish
- ❌ Simple 4-step linear progress tracker
- ❌ Basic card layout with minimal visual hierarchy
- ❌ Small status badges with simple color coding
- ❌ Functional but utilitarian design

**Cleaning Order View** (CLEANING_V2 - `components/cleaning/CleaningOrderView.tsx`)
- ✅ Custom-built, sophisticated UI
- ✅ Advanced 3-stage timeline with sub-state hints
- ✅ Large, prominent status badges with emoji icons
- ✅ Rich information architecture
- ✅ Modern, polished aesthetic

### Solution

Create a **unified design system** that elevates both services to world-class standards while maintaining service-specific features.

### Key Improvements from Initial Proposal

- ✅ Complete design tokens specification
- ✅ Animation system definition with reduced motion support
- ✅ Error states & edge cases coverage
- ✅ Performance budgets & optimization strategy
- ✅ Analytics & tracking implementation plan
- ✅ Feature flag & gradual rollout strategy
- ✅ Comprehensive accessibility enhancements
- ✅ Detailed implementation roadmap

---

## Design System Foundation

### 1.1 Design Tokens (`lib/design-tokens.ts`)

```typescript
// lib/design-tokens.ts
export const designTokens = {
  // Color Palette
  colors: {
    primary: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      500: '#2563EB', // Main brand blue
      600: '#1D4ED8',
      700: '#1E40AF',
      900: '#1E3A8A',
    },
    success: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
    },
    warning: {
      50: '#FEF3C7',
      100: '#FDE68A',
      500: '#F59E0B',
      600: '#D97706',
      700: '#B45309',
    },
    error: {
      50: '#FEE2E2',
      100: '#FECACA',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
    },
    purple: {
      50: '#F5F3FF',
      100: '#EDE9FE',
      500: '#8B5CF6',
      600: '#7C3AED',
      700: '#6D28D9',
    },
    neutral: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
  },
  
  // Typography
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['Fira Code', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  
  // Spacing (4px grid system)
  spacing: {
    px: '1px',
    0.5: '0.125rem', // 2px
    1: '0.25rem',    // 4px
    2: '0.5rem',     // 8px
    3: '0.75rem',    // 12px
    4: '1rem',       // 16px
    5: '1.25rem',    // 20px
    6: '1.5rem',     // 24px
    8: '2rem',       // 32px
    10: '2.5rem',    // 40px
    12: '3rem',      // 48px
    16: '4rem',      // 64px
  },
  
  // Border Radius
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    base: '0.5rem',  // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    full: '9999px',
  },
  
  // Shadows (elevation system)
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  // Animation Timing
  animation: {
    duration: {
      fast: '150ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  // Breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  
  // Z-index layers
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
};

export type DesignTokens = typeof designTokens;
```

### 1.2 Animation System (`lib/animations.ts`)

```typescript
// lib/animations.ts
import { designTokens } from './design-tokens';

export const animations = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { 
      duration: designTokens.animation.duration.normal,
      ease: designTokens.animation.easing.easeOut,
    },
  },
  
  fadeOut: {
    initial: { opacity: 1 },
    animate: { opacity: 0 },
    transition: { 
      duration: designTokens.animation.duration.normal,
      ease: designTokens.animation.easing.easeIn,
    },
  },
  
  // Slide animations
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: { 
      duration: designTokens.animation.duration.normal,
      ease: designTokens.animation.easing.easeOut,
    },
  },
  
  slideDown: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
    transition: { 
      duration: designTokens.animation.duration.normal,
      ease: designTokens.animation.easing.easeOut,
    },
  },
  
  // Scale animations
  scaleIn: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { 
      duration: designTokens.animation.duration.fast,
      ease: designTokens.animation.easing.easeOut,
    },
  },
  
  // Progress animations
  progressPulse: {
    animate: { 
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
    },
    transition: { 
      duration: designTokens.animation.duration.slower,
      repeat: Infinity,
      ease: designTokens.animation.easing.easeInOut,
    },
  },
};

// Reduced motion support
export const getAnimation = (
  animation: keyof typeof animations, 
  prefersReducedMotion: boolean
) => {
  if (prefersReducedMotion) {
    return {
      initial: {},
      animate: {},
      exit: {},
      transition: { duration: 0 },
    };
  }
  return animations[animation];
};
```

---

## Component Architecture

### 2.1 Core Unified Components

#### **OrderHeader Component**

```typescript
// components/order/OrderHeader.tsx
interface OrderHeaderProps {
  orderId: string;
  serviceType: 'LAUNDRY' | 'CLEANING';
  status: OrderStatus;
  dateTime: {
    date: string; // ISO format
    startTime: string;
    endTime: string;
  };
  pricing: {
    total: number; // cents
    currency: 'USD';
  };
  onBack?: () => void;
  actions?: React.ReactNode;
}

/**
 * OrderHeader - Unified header for all order types
 * 
 * Features:
 * - Sticky on scroll (z-index: 1020)
 * - Service icon with color coding
 * - Large status badge with emoji
 * - Date/time prominent display
 * - Price with tooltip breakdown
 * - Quick action buttons
 * - Back navigation
 * 
 * Responsive:
 * - Mobile: Stacked layout, compact spacing
 * - Desktop: Horizontal layout, generous spacing
 * 
 * Accessibility:
 * - ARIA labels for screen readers
 * - Keyboard navigation support
 * - Focus visible states
 */
export function OrderHeader({ ... }: OrderHeaderProps) {
  // Implementation
}
```

#### **UnifiedTimeline Component**

```typescript
// components/order/UnifiedTimeline.tsx
interface TimelineStage {
  key: string;
  label: string;
  icon: string; // emoji
  description?: string;
  substates?: {
    label: string;
    timestamp?: string;
    icon?: string;
  }[];
}

interface UnifiedTimelineProps {
  stages: TimelineStage[];
  currentStage: string;
  completedStages: string[];
  variant?: 'standard' | 'detailed'; // detailed shows more substates
  orientation?: 'horizontal' | 'vertical' | 'auto'; // auto = responsive
  onStageClick?: (stage: string) => void;
}

/**
 * UnifiedTimeline - Adaptive timeline for both services
 * 
 * Features:
 * - 3-stage primary flow with configurable substates
 * - Progress percentage indicator
 * - Timestamp tracking for each milestone
 * - Exception state handling (disputes, no-shows)
 * - Smooth animations on state changes
 * - Touch gestures on mobile (swipe to view details)
 * 
 * Laundry Stages:
 * 1. Scheduled (substates: quote received, payment confirmed)
 * 2. In Transit (substates: picked up, processing, out for delivery)
 * 3. Completed (substates: delivered, rated)
 * 
 * Cleaning Stages:
 * 1. Scheduled (substates: partner assigned, en route, on site)
 * 2. In Progress (substates: cleaning started)
 * 3. Completed (substates: finished, rated)
 * 
 * Accessibility:
 * - ARIA labels for screen readers
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Focus management
 * - Announce state changes to screen readers
 */
export function UnifiedTimeline({ ... }: UnifiedTimelineProps) {
  // Implementation
}
```

#### **ServiceDetailsCard Component**

```typescript
// components/order/ServiceDetailsCard.tsx
interface DetailItem {
  label: string;
  value: string | number;
  icon?: string;
  highlight?: boolean;
  tooltip?: string;
}

interface ServiceDetailsCardProps {
  title: string;
  items: DetailItem[];
  grid?: 'auto' | 2 | 3 | 4; // column count
  variant?: 'standard' | 'compact' | 'feature';
  expandable?: boolean;
  defaultExpanded?: boolean;
}

/**
 * ServiceDetailsCard - Flexible card for service info
 * 
 * Features:
 * - Responsive grid layout (auto-adjusts to content)
 * - Icon support for visual hierarchy
 * - Expandable sections for complex data
 * - Highlight mode for important values
 * - Tooltip for additional context
 * 
 * Loading States:
 * - Skeleton loader with shimmer effect
 * - Graceful degradation
 * 
 * Error States:
 * - Error message display
 * - Retry action button
 */
export function ServiceDetailsCard({ ... }: ServiceDetailsCardProps) {
  // Implementation
}
```

### 2.2 Service-Specific Components

**Laundry-Specific:**
- `LaundryWeightCard` - Weight tracking and comparison
- `LaundryItemsList` - Detailed item breakdown
- `LaundryQuoteCard` - Quote display with breakdown

**Cleaning-Specific:**
- `CleaningRoomBreakdown` - Bedroom/bathroom details
- `CleaningAddonsDisplay` - Add-ons showcase
- `PartnerInfoCard` - Partner details (existing, enhanced)

---

## Error States & Edge Cases

### 3.1 Error State Components

```typescript
// components/order/ErrorStates.tsx

// 1. Network Error
<ErrorState
  icon="🌐"
  title="Connection Lost"
  message="We're having trouble loading your order. Check your connection and try again."
  action={{
    label: "Retry",
    onClick: refetch,
  }}
  secondaryAction={{
    label: "Contact Support",
    onClick: openSupport,
  }}
/>

// 2. Order Not Found (404)
<ErrorState
  icon="🔍"
  title="Order Not Found"
  message="We couldn't find this order. It may have been deleted or you may not have permission to view it."
  action={{
    label: "View All Orders",
    onClick: () => router.push('/orders'),
  }}
/>

// 3. Permission Denied (403)
<ErrorState
  icon="🔒"
  title="Access Denied"
  message="You don't have permission to view this order."
  action={{
    label: "Go Back",
    onClick: () => router.back(),
  }}
/>

// 4. Server Error (500)
<ErrorState
  icon="⚠️"
  title="Something Went Wrong"
  message="We're experiencing technical difficulties. Our team has been notified."
  action={{
    label: "Try Again",
    onClick: refetch,
  }}
  secondaryAction={{
    label: "Report Issue",
    onClick: reportBug,
  }}
/>
```

### 3.2 Edge Cases Handling

**Long Addresses:**
```typescript
// Truncate with "Show More" expansion
<AddressCard
  address={address}
  maxLines={3}
  expandable
  truncateStrategy="word-break"
  showMap={false} // Hide map if address too long
/>
```

**Many Add-ons (>10):**
```typescript
// Grouped display with count badge
<AddonsDisplay
  addons={manyAddons}
  displayLimit={5}
  showCount
  expandable
  groupBy="category" // Optional: "premium", "standard", "extra"
/>
```

**Missing Timestamps:**
```typescript
// Graceful fallback with estimates
<Timeline
  stages={stages}
  fallbackTime="Pending update..."
  showEstimate // Show ETA if actual time missing
  estimateStrategy="average" // Use historical averages
/>
```

**Partner Info Failed to Load:**
```typescript
<PartnerInfoCard
  fallbackMode
  message="Partner details temporarily unavailable"
  showGenericInfo // Show generic support contact
  retryButton={<RetryButton />}
/>
```

**Photo Gallery Errors:**
```typescript
<PhotoGallery
  photos={photos}
  onError={(photo) => reportPhotoError(photo)}
  fallbackImage="/placeholder-photo.jpg"
  retryFailedUploads
/>
```

---

## Performance Specifications

### 4.1 Performance Budgets

```typescript
// lib/performance/budgets.ts
export const PERFORMANCE_BUDGETS = {
  // Core Web Vitals
  LCP: 2500, // ms - Largest Contentful Paint
  FID: 100,  // ms - First Input Delay
  CLS: 0.1,  // score - Cumulative Layout Shift
  
  // Bundle sizes
  maxPageSize: 150, // KB - Initial page load
  maxComponentSize: 50, // KB - Per component lazy load
  maxImageSize: 200, // KB - Per image
  
  // Load times
  timeToInteractive: 3500, // ms
  firstContentfulPaint: 1500, // ms
  
  // API response times
  orderFetch: 1000, // ms
  partnerInfoFetch: 800, // ms
  photosFetch: 1500, // ms
};
```

### 4.2 Optimization Strategies

**Code Splitting:**
```typescript
// Lazy load service-specific components
const LaundrySpecifics = dynamic(
  () => import('./LaundrySpecifics'),
  {
    loading: () => <LaundryDetailsSkeleton />,
    ssr: false, // Client-side only
  }
);

const CleaningSpecifics = dynamic(
  () => import('./CleaningSpecifics'),
  {
    loading: () => <CleaningDetailsSkeleton />,
    ssr: false,
  }
);
```

**Image Optimization:**
```typescript
// Use Next.js Image with proper sizing
<Image
  src={partnerPhoto}
  width={80}
  height={80}
  alt={`${partnerName} profile photo`}
  loading="lazy"
  placeholder="blur"
  blurDataURL={generateBlurHash(partnerPhoto)}
  quality={85}
  sizes="(max-width: 768px) 64px, 80px"
/>
```

**Data Fetching:**
```typescript
// Parallel fetching with SWR
const { data: order } = useSWR(`/api/orders/${id}`, fetcher);
const { data: partner } = useSWR(
  order?.partner_id ? `/api/partners/${order.partner_id}` : null,
  fetcher
);
const { data: photos } = useSWR(
  order?.id ? `/api/orders/${order.id}/photos` : null,
  fetcher,
  { revalidateOnFocus: false } // Don't refetch photos
);
```

**Memoization:**
```typescript
// Memoize expensive calculations
const timelineStages = useMemo(
  () => generateTimelineStages(order, service),
  [order.status, service]
);

const pricingBreakdown = useMemo(
  () => calculatePricing(order),
  [order.subtotal_cents, order.tax_cents, order.delivery_cents]
);

// Memoize expensive components
const ServiceDetails = memo(ServiceDetailsCard);
const Timeline = memo(UnifiedTimeline);
```

---

## Analytics & Tracking

### 5.1 Event Tracking Schema

```typescript
// lib/analytics/order-detail-events.ts
export const OrderDetailEvents = {
  // Page views
  PAGE_VIEWED: 'order_detail_viewed',
  
  // Interactions
  TIMELINE_STAGE_CLICKED: 'timeline_stage_clicked',
  ACTION_BUTTON_CLICKED: 'action_button_clicked',
  PARTNER_CONTACTED: 'partner_contacted',
  DISPUTE_OPENED: 'dispute_opened',
  RATING_SUBMITTED: 'rating_submitted',
  CANCEL_INITIATED: 'cancel_initiated',
  RESCHEDULE_INITIATED: 'reschedule_initiated',
  
  // Status changes (server-side events)
  STATUS_UPDATED: 'order_status_updated',
  PAYMENT_COMPLETED: 'payment_completed',
  
  // Errors
  ERROR_DISPLAYED: 'error_displayed',
  RETRY_ATTEMPTED: 'retry_attempted',
  
  // Performance
  PAGE_LOAD_TIME: 'page_load_time',
  IMAGE_LOAD_FAILED: 'image_load_failed',
} as const;

// Event payload interfaces
interface OrderDetailViewedEvent {
  order_id: string;
  service_type: 'LAUNDRY' | 'CLEANING';
  status: string;
  user_id: string;
  view_duration?: number; // seconds
  referrer?: string;
}

interface ActionClickedEvent {
  order_id: string;
  action_type: 'cancel' | 'reschedule' | 'contact' | 'rate' | 'dispute';
  button_location: 'header' | 'panel' | 'timeline';
}

// Usage
import { trackEvent } from '@/lib/analytics';

trackEvent(OrderDetailEvents.PAGE_VIEWED, {
  order_id: order.id,
  service_type: order.service_type,
  status: order.status,
  user_id: user.id,
  referrer: document.referrer,
});
```

### 5.2 Conversion Funnel Tracking

```typescript
// lib/analytics/funnels.ts
export const OrderDetailFunnel = {
  STEP_1_VIEWED_ORDER: 1,
  STEP_2_VIEWED_TIMELINE: 2,
  STEP_3_CLICKED_ACTION: 3,
  STEP_4_COMPLETED_ACTION: 4,
  STEP_5_LEFT_RATING: 5,
};

// Track funnel progression
export const trackFunnelStep = (step: number, metadata: Record<string, any>) => {
  trackEvent('funnel_step', {
    funnel_name: 'order_detail',
    step_number: step,
    ...metadata,
  });
};
```

### 5.3 Performance Monitoring

```typescript
// Monitor Core Web Vitals
import { getCLS, getFID, getLCP } from 'web-vitals';

getCLS((metric) => {
  trackEvent(OrderDetailEvents.PAGE_LOAD_TIME, {
    metric_name: 'CLS',
    value: metric.value,
    order_id: orderId,
  });
});

getFID((metric) => {
  trackEvent(OrderDetailEvents.PAGE_LOAD_TIME, {
    metric_name: 'FID',
    value: metric.value,
    order_id: orderId,
  });
});

getLCP((metric) => {
  trackEvent(OrderDetailEvents.PAGE_LOAD_TIME, {
    metric_name: 'LCP',
    value: metric.value,
    order_id: orderId,
  });
});
```

---

## Feature Flags & Rollback Strategy

### 6.1 Feature Flag Configuration

```typescript
// lib/features.ts (enhanced)
export const FEATURES = {
  // Existing flags
  CLEANING_V2: process.env.NEXT_PUBLIC_CLEANING_V2 === 'true',
  
  // New unified UI flags
  UNIFIED_ORDER_UI: process.env.NEXT_PUBLIC_UNIFIED_ORDER_UI === 'true',
  UNIFIED_TIMELINE: process.env.NEXT_PUBLIC_UNIFIED_TIMELINE === 'true',
  ENHANCED_ANIMATIONS: process.env.NEXT_PUBLIC_ENHANCED_ANIMATIONS === 'true',
  
  // Tracking & analytics
  ANALYTICS_TRACKING: process.env.NEXT_PUBLIC_ANALYTICS === 'true',
  
  // Percentage rollouts (0-100)
  UNIFIED_UI_ROLLOUT: parseInt(process.env.NEXT_PUBLIC_UNIFIED_ROLLOUT || '0'),
  
  // Individual component flags (for granular control)
  NEW_HEADER: process.env.NEXT_PUBLIC_NEW_HEADER === 'true',
  NEW_TIMELINE: process.env.NEXT_PUBLIC_NEW_TIMELINE === 'true',
  NEW_DETAILS_CARD: process.env.NEXT_PUBLIC_NEW_DETAILS_CARD === 'true',
} as const;

// Gradual rollout helper
export const isInRollout = (userId: string, percentage: number): boolean => {
  if (percentage === 0) return false;
  if (percentage === 100) return true;
  
  const hash = simpleHash(userId);
  return (hash % 100) < percentage;
};

// Simple hash function for consistent user bucketing
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
```

### 6.2 Rollout Strategy

```typescript
// components/order/OrderDetailRouter.tsx
export const OrderDetailView = ({ order, user }: Props) => {
  // Check if user is in unified UI rollout
  const useUnifiedUI = FEATURES.UNIFIED_ORDER_UI && 
                       isInRollout(user.id, FEATURES.UNIFIED_UI_ROLLOUT);
  
  // Log which version is being shown
  useEffect(() => {
    trackEvent('ui_version_shown', {
      version: useUnifiedUI ? 'unified' : 'legacy',
      order_id: order.id,
      user_id: user.id,
    });
  }, [useUnifiedUI, order.id, user.id]);
  
  // Unified UI (new)
  if (useUnifiedUI) {
    return <UnifiedOrderView order={order} user={user} />;
  }
  
  // Service-specific legacy fallbacks
  if (order.service_type === 'CLEANING' && FEATURES.CLEANING_V2) {
    return <CleaningOrderView order={order} userRole="customer" />;
  }
  
  // Legacy fallback
  return <LegacyOrderView order={order} />;
};
```

### 6.3 Kill Switch & Rollback

**Environment Variables:**
```env
# .env.local

# Instant kill switch - disable everything
NEXT_PUBLIC_UNIFIED_ORDER_UI=false
NEXT_PUBLIC_UNIFIED_ROLLOUT=0

# Or rollback partially
NEXT_PUBLIC_UNIFIED_ORDER_UI=true
NEXT_PUBLIC_UNIFIED_ROLLOUT=10  # Only 10% of users

# Disable specific components
NEXT_PUBLIC_NEW_HEADER=false
NEXT_PUBLIC_NEW_TIMELINE=false
```

**Monitoring & Auto-Rollback:**
```typescript
// lib/monitoring/auto-rollback.ts
const ERROR_THRESHOLD = 5; // % error rate
const ROLLBACK_THRESHOLD = 10; // % performance degradation

export const monitorAndRollback = async () => {
  const metrics = await getRealtimeMetrics();
  
  if (metrics.errorRate > ERROR_THRESHOLD) {
    await disableFeature('UNIFIED_ORDER_UI');
    alertOncall('Auto-rollback: High error rate');
  }
  
  if (metrics.performanceDegradation > ROLLBACK_THRESHOLD) {
    await reduceRollout(50); // Reduce to 50%
    alertOncall('Auto-rollback: Performance issues');
  }
};
```

---

## Accessibility Enhancements

### 7.1 Screen Reader Support

```typescript
// lib/accessibility/announcements.ts

/**
 * Announce status changes to screen readers
 */
export const announceStatusChange = (newStatus: string, context?: string) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  
  const message = context 
    ? `${context}: Order status updated to ${newStatus}`
    : `Order status updated to ${newStatus}`;
  
  announcement.textContent = message;
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body
