'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { usePrefersReducedMotion } from '@/lib/animations';

interface DetailItem {
  label: string;
  value: string | number | React.ReactNode;
  icon?: string;
  highlight?: boolean;
  tooltip?: string;
}

interface ServiceDetailsCardProps {
  title: string;
  items: DetailItem[];
  grid?: 'auto' | 2 | 3 | 4;
  variant?: 'standard' | 'compact' | 'feature';
  expandable?: boolean;
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * ServiceDetailsCard - Flexible card for displaying service information
 * 
 * Features:
 * - Responsive grid layout (auto, 2, 3, or 4 columns)
 * - Icon support for visual hierarchy
 * - Expandable sections for managing information density
 * - Highlight mode for emphasizing important values
 * - Tooltip support for additional context
 * - Three variants: standard, compact, feature
 * - Loading skeleton states (when items array is empty)
 * - Smooth animations
 * - Fully accessible
 * 
 * @example
 * ```tsx
 * <ServiceDetailsCard
 *   title="Service Details"
 *   items={[
 *     { label: 'Type', value: 'Standard Cleaning', icon: '✨' },
 *     { label: 'Rooms', value: '3 Bedrooms', icon: '🛏️' },
 *     { label: 'Duration', value: '2-3 hours', icon: '⏱️', highlight: true },
 *     { label: 'Price', value: '$150', highlight: true, tooltip: 'Base price' }
 *   ]}
 *   grid={2}
 *   variant="standard"
 *   expandable
 *   defaultExpanded
 * />
 * ```
 */
export function ServiceDetailsCard({
  title,
  items,
  grid = 'auto',
  variant = 'standard',
  expandable = false,
  defaultExpanded = true,
  className = '',
}: ServiceDetailsCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  
  // Determine grid columns
  const gridClass = grid === 'auto' 
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : `grid-cols-1 sm:grid-cols-${grid}`;
  
  // Variant-specific styling
  const variantStyles = {
    standard: {
      card: 'bg-white border border-gray-200 rounded-lg shadow-sm',
      header: 'px-6 py-4 border-b border-gray-200',
      content: 'p-6',
      title: 'text-lg font-semibold text-gray-900',
    },
    compact: {
      card: 'bg-gray-50 rounded-lg',
      header: 'px-4 py-3',
      content: 'p-4',
      title: 'text-base font-medium text-gray-900',
    },
    feature: {
      card: 'bg-gradient-to-br from-primary-50 to-purple-50 border-2 border-primary-200 rounded-xl shadow-md',
      header: 'px-6 py-4',
      content: 'p-6',
      title: 'text-xl font-bold text-gray-900',
    },
  };
  
  const styles = variantStyles[variant];
  
  // Loading state (when no items)
  if (items.length === 0) {
    return (
      <div className={`${styles.card} ${className}`}>
        <div className={styles.header}>
          <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
        </div>
        <div className={styles.content}>
          <div className={`grid ${gridClass} gap-4`}>
            {[...Array(grid === 'auto' ? 3 : Number(grid))].map((_, idx) => (
              <div key={idx} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.3 }}
      className={`${styles.card} ${className}`}
    >
      {/* Header */}
      <div className={styles.header}>
        <div className="flex items-center justify-between">
          <h3 className={styles.title}>{title}</h3>
          
          {expandable && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <AnimatePresence initial={false}>
        {(!expandable || isExpanded) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: 'auto', 
              opacity: 1,
              transition: {
                height: {
                  duration: prefersReducedMotion ? 0 : 0.3,
                },
                opacity: {
                  duration: prefersReducedMotion ? 0 : 0.2,
                  delay: prefersReducedMotion ? 0 : 0.1,
                },
              },
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              transition: {
                height: {
                  duration: prefersReducedMotion ? 0 : 0.2,
                },
                opacity: {
                  duration: prefersReducedMotion ? 0 : 0.1,
                },
              },
            }}
            className="overflow-hidden"
          >
            <div className={styles.content}>
              <div className={`grid ${gridClass} gap-4`}>
                {items.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: prefersReducedMotion ? 1 : 0, x: prefersReducedMotion ? 0 : -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ 
                      duration: prefersReducedMotion ? 0 : 0.2, 
                      delay: prefersReducedMotion ? 0 : index * 0.05 
                    }}
                    className={`space-y-1 ${
                      item.highlight 
                        ? 'p-3 bg-primary-50 border border-primary-200 rounded-lg' 
                        : ''
                    }`}
                  >
                    {/* Label */}
                    <div className="flex items-center space-x-1">
                      {item.icon && (
                        <span className="text-base" role="img" aria-hidden="true">
                          {item.icon}
                        </span>
                      )}
                      <label className="text-sm text-gray-600 font-medium">
                        {item.label}
                      </label>
                      
                      {/* Tooltip */}
                      {item.tooltip && (
                        <div className="relative">
                          <button
                            onMouseEnter={() => setTooltipIndex(index)}
                            onMouseLeave={() => setTooltipIndex(null)}
                            onFocus={() => setTooltipIndex(index)}
                            onBlur={() => setTooltipIndex(null)}
                            className="p-0.5 rounded hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                            aria-label={`More information about ${item.label}`}
                          >
                            <Info className="w-3.5 h-3.5 text-gray-400" />
                          </button>
                          
                          <AnimatePresence>
                            {tooltipIndex === index && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                transition={{ duration: 0.15 }}
                                className="absolute left-0 bottom-full mb-2 z-10 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg"
                                role="tooltip"
                              >
                                {item.tooltip}
                                <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                    
                    {/* Value */}
                    <div 
                      className={`text-base ${
                        item.highlight 
                          ? 'font-bold text-primary-700' 
                          : 'font-semibold text-gray-900'
                      }`}
                    >
                      {typeof item.value === 'string' || typeof item.value === 'number' 
                        ? item.value 
                        : item.value}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * ServiceDetailsCardSkeleton - Loading state for ServiceDetailsCard
 * 
 * @example
 * ```tsx
 * {isLoading ? (
 *   <ServiceDetailsCardSkeleton grid={2} />
 * ) : (
 *   <ServiceDetailsCard {...props} />
 * )}
 * ```
 */
export function ServiceDetailsCardSkeleton({
  grid = 'auto',
  variant = 'standard',
  className = '',
}: Pick<ServiceDetailsCardProps, 'grid' | 'variant' | 'className'>) {
  const gridClass = grid === 'auto' 
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : `grid-cols-1 sm:grid-cols-${grid}`;
  
  const variantStyles = {
    standard: {
      card: 'bg-white border border-gray-200 rounded-lg shadow-sm',
      header: 'px-6 py-4 border-b border-gray-200',
      content: 'p-6',
    },
    compact: {
      card: 'bg-gray-50 rounded-lg',
      header: 'px-4 py-3',
      content: 'p-4',
    },
    feature: {
      card: 'bg-gradient-to-br from-primary-50 to-purple-50 border-2 border-primary-200 rounded-xl shadow-md',
      header: 'px-6 py-4',
      content: 'p-6',
    },
  };
  
  const styles = variantStyles[variant];
  const itemCount = grid === 'auto' ? 3 : Number(grid);

  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.header}>
        <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
      </div>
      <div className={styles.content}>
        <div className={`grid ${gridClass} gap-4`}>
          {[...Array(itemCount)].map((_, idx) => (
            <div key={idx} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
              <div className="h-5 bg-gray-200 rounded w-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
