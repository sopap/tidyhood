'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { getAnimation, usePrefersReducedMotion } from '@/lib/animations';

interface OrderHeaderProps {
  orderId: string;
  serviceType: 'LAUNDRY' | 'CLEANING';
  status: string;
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

const SERVICE_ICONS = {
  LAUNDRY: '🧺',
  CLEANING: '✨',
} as const;

const STATUS_CONFIG: Record<string, { color: string; bg: string; emoji: string }> = {
  // Pending states
  PENDING: { 
    color: designTokens.colors.warning[700], 
    bg: designTokens.colors.warning[50], 
    emoji: '⏳' 
  },
  AWAITING_QUOTE: { 
    color: designTokens.colors.warning[700], 
    bg: designTokens.colors.warning[50], 
    emoji: '💭' 
  },
  AWAITING_PAYMENT: { 
    color: designTokens.colors.warning[700], 
    bg: designTokens.colors.warning[50], 
    emoji: '💳' 
  },
  
  // Active states
  SCHEDULED: { 
    color: designTokens.colors.primary[700], 
    bg: designTokens.colors.primary[50], 
    emoji: '📅' 
  },
  EN_ROUTE: { 
    color: designTokens.colors.primary[700], 
    bg: designTokens.colors.primary[50], 
    emoji: '🚗' 
  },
  IN_PROGRESS: { 
    color: designTokens.colors.purple[700], 
    bg: designTokens.colors.purple[50], 
    emoji: '⚡' 
  },
  IN_TRANSIT: { 
    color: designTokens.colors.purple[700], 
    bg: designTokens.colors.purple[50], 
    emoji: '🚚' 
  },
  
  // Complete states
  COMPLETED: { 
    color: designTokens.colors.success[700], 
    bg: designTokens.colors.success[50], 
    emoji: '✅' 
  },
  
  // Problem states
  CANCELLED: { 
    color: designTokens.colors.neutral[600], 
    bg: designTokens.colors.neutral[100], 
    emoji: '❌' 
  },
  DISPUTED: { 
    color: designTokens.colors.error[700], 
    bg: designTokens.colors.error[50], 
    emoji: '⚠️' 
  },
};

const formatCurrency = (cents: number): string => {
  return `$${(cents / 100).toFixed(2)}`;
};

const formatDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date);
};

const formatTime = (time: string): string => {
  // Assume time is in HH:MM format
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

/**
 * OrderHeader - Unified sticky header for all order types
 * 
 * Features:
 * - Sticky positioning on scroll
 * - Service-specific icon and colors
 * - Large, prominent status badge with emoji
 * - Date/time display
 * - Price with currency formatting
 * - Optional back button
 * - Optional action buttons area
 * - Smooth animations
 * - Fully accessible
 * 
 * @example
 * ```tsx
 * <OrderHeader
 *   orderId="ord_123"
 *   serviceType="LAUNDRY"
 *   status="IN_PROGRESS"
 *   dateTime={{
 *     date: "2025-10-06",
 *     startTime: "14:00",
 *     endTime: "16:00"
 *   }}
 *   pricing={{ total: 4500, currency: 'USD' }}
 *   onBack={() => router.back()}
 *   actions={<ActionButtons />}
 * />
 * ```
 */
export function OrderHeader({
  orderId,
  serviceType,
  status,
  dateTime,
  pricing,
  onBack,
  actions,
}: OrderHeaderProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  const statusConfig = STATUS_CONFIG[status] || {
    color: designTokens.colors.neutral[700],
    bg: designTokens.colors.neutral[100],
    emoji: '📦',
  };
  
  const serviceIcon = SERVICE_ICONS[serviceType] || '📦';
  
  // Format date and time
  const formattedDate = formatDate(dateTime.date);
  const timeRange = `${formatTime(dateTime.startTime)} - ${formatTime(dateTime.endTime)}`;
  const formattedPrice = formatCurrency(pricing.total);

  return (
    <motion.header
      initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: [0, 0, 0.2, 1] }}
      className="sticky top-0 z-[1020] bg-white border-b border-gray-200 shadow-sm"
      role="banner"
      aria-label="Order information header"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Mobile Layout */}
        <div className="flex flex-col space-y-4 md:hidden">
          {/* Row 1: Back button + Service type text */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 flex-shrink-0"
                  aria-label="Go back to orders list"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              
              <div className="flex items-center space-x-2 min-w-0">
                <span 
                  className="text-2xl flex-shrink-0" 
                  role="img" 
                  aria-label={`${serviceType.toLowerCase()} service`}
                >
                  {serviceIcon}
                </span>
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {serviceType === 'LAUNDRY' ? 'Laundry' : 'Cleaning'} Service
                </h1>
              </div>
            </div>
            
            <div
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0 ml-3"
              style={{
                backgroundColor: statusConfig.bg,
                color: statusConfig.color,
              }}
              role="status"
              aria-label={`Order status: ${status.replace(/_/g, ' ').toLowerCase()}`}
            >
              <span className="text-base">{statusConfig.emoji}</span>
              <span className="whitespace-nowrap">{status.replace(/_/g, ' ')}</span>
            </div>
          </div>
          
          {/* Row 2: Order ID + Price */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Order</p>
              <p className="text-sm font-mono font-medium text-gray-900">#{orderId.slice(-8)}</p>
            </div>
            
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-lg font-bold text-gray-900">{formattedPrice}</p>
            </div>
          </div>
          
          {/* Row 3: Date and Time */}
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <span className="text-base">📅</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-base">🕐</span>
              <span>{timeRange}</span>
            </div>
          </div>
          
          {/* Row 4: Actions */}
          {actions && (
            <div className="pt-2 border-t border-gray-100">
              {actions}
            </div>
          )}
        </div>
        
        {/* Desktop Layout */}
        <div className="hidden md:flex items-center justify-between">
          {/* Left section */}
          <div className="flex items-center space-x-6">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                aria-label="Go back to orders list"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            
            <div className="flex items-center space-x-4">
              <span 
                className="text-4xl" 
                role="img" 
                aria-label={`${serviceType.toLowerCase()} service`}
              >
                {serviceIcon}
              </span>
              
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold text-gray-900">
                    {serviceType === 'LAUNDRY' ? 'Laundry' : 'Cleaning'} Order
                  </h1>
                  <span className="text-sm text-gray-500 font-mono">
                    #{orderId.slice(-8)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <span>📅</span>
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>🕐</span>
                    <span>{timeRange}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right section */}
          <div className="flex items-center space-x-6">
            <div className="text-right">
              <p className="text-sm text-gray-500 uppercase tracking-wide">Total</p>
              <p className="text-2xl font-bold text-gray-900">{formattedPrice}</p>
            </div>
            
            <div
              className="inline-flex items-center space-x-2 px-5 py-3 rounded-full text-base font-semibold"
              style={{
                backgroundColor: statusConfig.bg,
                color: statusConfig.color,
              }}
              role="status"
              aria-label={`Order status: ${status.replace(/_/g, ' ').toLowerCase()}`}
            >
              <span className="text-xl">{statusConfig.emoji}</span>
              <span>{status.replace(/_/g, ' ')}</span>
            </div>
            
            {actions && (
              <div className="pl-4 border-l border-gray-200">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
