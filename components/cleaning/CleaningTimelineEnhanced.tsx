'use client';

import { useMemo } from 'react';
import type { CleaningOrder } from '@/types/cleaningOrders';
import { getCleaningStatusConfig } from '@/types/cleaningOrders';

interface TimelineStep {
  id: string;
  label: string;
  icon: string;
  status: 'completed' | 'current' | 'upcoming';
  timestamp?: string;
  description?: string;
  estimatedTime?: string;
}

interface CleaningTimelineProps {
  order: CleaningOrder;
  className?: string;
}

/**
 * Enhanced CleaningTimeline with granular status tracking
 * 
 * Shows 6-7 dynamic steps based on order progression:
 * 1. Order Placed
 * 2. Partner Assignment
 * 3. Cleaner En Route / Scheduled Arrival
 * 4. Arrived On Site
 * 5. Cleaning in Progress
 * 6. Completed
 */
export function CleaningTimeline({ order, className = '' }: CleaningTimelineProps) {
  const steps = useMemo(() => buildTimelineSteps(order), [order]);
  
  return (
    <div className={`cleaning-timeline-enhanced ${className}`}>
      {/* Desktop: Vertical Timeline */}
      <div className="hidden md:block">
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={step.id} className="relative flex gap-6">
              {/* Timeline Track */}
              <div className="flex flex-col items-center">
                {/* Step Icon */}
                <div
                  className={`
                    flex h-12 w-12 items-center justify-center rounded-full text-xl font-semibold z-10 transition-all
                    ${step.status === 'completed' ? 'bg-green-500 text-white shadow-lg' : ''}
                    ${step.status === 'current' ? 'bg-blue-500 text-white shadow-lg ring-4 ring-blue-100 animate-pulse' : ''}
                    ${step.status === 'upcoming' ? 'bg-gray-200 text-gray-500' : ''}
                  `}
                >
                  {step.status === 'completed' ? '✓' : step.icon}
                </div>
                
                {/* Connecting Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`
                      w-0.5 h-full min-h-[60px] -mt-1
                      ${step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}
                    `}
                  />
                )}
              </div>
              
              {/* Step Content */}
              <div className="flex-1 pb-8">
                <div className={`
                  rounded-lg border p-4 transition-all
                  ${step.status === 'current' ? 'border-blue-500 bg-blue-50 shadow-md' : ''}
                  ${step.status === 'completed' ? 'border-green-200 bg-green-50' : ''}
                  ${step.status === 'upcoming' ? 'border-gray-200 bg-white' : ''}
                `}>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`
                      text-base font-semibold
                      ${step.status === 'current' ? 'text-blue-900' : ''}
                      ${step.status === 'completed' ? 'text-green-900' : ''}
                      ${step.status === 'upcoming' ? 'text-gray-700' : ''}
                    `}>
                      {step.label}
                    </h3>
                    
                    {step.timestamp && (
                      <span className="text-xs text-gray-600 font-medium">
                        {formatTimestamp(step.timestamp)}
                      </span>
                    )}
                    
                    {!step.timestamp && step.estimatedTime && step.status === 'upcoming' && (
                      <span className="text-xs text-gray-500 italic">
                        {step.estimatedTime}
                      </span>
                    )}
                  </div>
                  
                  {step.description && (
                    <p className={`
                      text-sm
                      ${step.status === 'current' ? 'text-blue-800' : ''}
                      ${step.status === 'completed' ? 'text-green-800' : ''}
                      ${step.status === 'upcoming' ? 'text-gray-600' : ''}
                    `}>
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile: Horizontal Scroll Timeline */}
      <div className="md:hidden">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex-shrink-0 snap-center w-72 px-2 first:pl-0 last:pr-0"
            >
              <div className={`
                rounded-lg border p-4 transition-all
                ${step.status === 'current' ? 'border-blue-500 bg-blue-50 shadow-md' : ''}
                ${step.status === 'completed' ? 'border-green-200 bg-green-50' : ''}
                ${step.status === 'upcoming' ? 'border-gray-200 bg-white' : ''}
              `}>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`
                      flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold
                      ${step.status === 'completed' ? 'bg-green-500 text-white' : ''}
                      ${step.status === 'current' ? 'bg-blue-500 text-white' : ''}
                      ${step.status === 'upcoming' ? 'bg-gray-300 text-gray-600' : ''}
                    `}
                  >
                    {step.status === 'completed' ? '✓' : step.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {step.label}
                    </h3>
                    {step.timestamp && (
                      <p className="text-xs text-gray-600">
                        {formatTimestamp(step.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
                
                {step.description && (
                  <p className="text-sm text-gray-700">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Exception States */}
      {['cleaner_no_show', 'customer_no_show', 'disputed'].includes(order.status) && (
        <div className="mt-6 rounded-lg border-2 border-orange-500 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h4 className="font-semibold text-orange-900">
                {getCleaningStatusConfig(order.status).label}
              </h4>
              <p className="text-sm text-orange-700 mt-1">
                {getCleaningStatusConfig(order.status).description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Build timeline steps based on order status and timestamps
 */
function buildTimelineSteps(order: CleaningOrder): TimelineStep[] {
  const steps: TimelineStep[] = [];
  const now = new Date();
  const slotStart = new Date(order.slot_start);
  
  // Step 1: Order Placed
  steps.push({
    id: 'placed',
    label: 'Order Placed',
    icon: '📝',
    status: 'completed',
    timestamp: order.created_at,
    description: 'Your cleaning order has been confirmed',
  });
  
  // Step 2: Partner Assignment
  if (order.partner_id || order.assigned_at) {
    steps.push({
      id: 'assigned',
      label: 'Partner Assigned',
      icon: '👤',
      status: 'completed',
      timestamp: order.assigned_at || undefined,
      description: 'A professional cleaner has been assigned to your order',
    });
  } else if (order.status === 'pending') {
    steps.push({
      id: 'assigning',
      label: 'Finding Your Cleaner',
      icon: '🔍',
      status: 'current',
      description: 'Matching you with the best available cleaner in your area',
    });
  }
  
  // Step 3: Cleaner En Route
  if (order.en_route_at) {
    steps.push({
      id: 'en_route',
      label: 'Cleaner En Route',
      icon: '🚗',
      status: 'completed',
      timestamp: order.en_route_at || undefined,
      description: 'Your cleaner is on the way to your location',
    });
  } else if (order.status === 'assigned' && slotStart > now) {
    steps.push({
      id: 'scheduled',
      label: 'Scheduled Arrival',
      icon: '⏰',
      status: 'current',
      description: `Your cleaner will arrive between ${formatTimeWindow(order.slot_start, order.slot_end)}`,
      estimatedTime: getRelativeTime(order.slot_start),
    });
  } else if (['en_route', 'on_site', 'in_progress'].includes(order.status)) {
    steps.push({
      id: 'en_route_pending',
      label: 'Cleaner En Route',
      icon: '🚗',
      status: 'current',
      description: 'Your cleaner is heading to your location',
    });
  }
  
  // Step 4: Arrived On Site
  if (order.on_site_at) {
    steps.push({
      id: 'on_site',
      label: 'Arrived On Site',
      icon: '📍',
      status: order.status === 'on_site' ? 'current' : 'completed',
      timestamp: order.on_site_at || undefined,
      description: 'Your cleaner has arrived and will begin shortly',
    });
  } else if (order.status === 'en_route') {
    steps.push({
      id: 'arriving',
      label: 'Arriving Soon',
      icon: '📍',
      status: 'upcoming',
      description: 'Your cleaner will check in upon arrival',
      estimatedTime: 'Within 15 minutes',
    });
  }
  
  // Step 5: Cleaning in Progress
  if (order.started_at || order.status === 'in_progress') {
    steps.push({
      id: 'in_progress',
      label: 'Cleaning in Progress',
      icon: '🧹',
      status: order.status === 'in_progress' ? 'current' : 'completed',
      timestamp: order.started_at || undefined,
      description: 'Your cleaning is currently underway',
    });
  } else if (['assigned', 'en_route', 'on_site'].includes(order.status)) {
    steps.push({
      id: 'cleaning_upcoming',
      label: 'Cleaning Service',
      icon: '🧹',
      status: 'upcoming',
      description: 'Professional cleaning of your space',
      estimatedTime: getEstimatedDuration(order),
    });
  }
  
  // Step 6: Completed
  if (order.completed_at || order.status === 'completed') {
    steps.push({
      id: 'completed',
      label: 'Cleaning Completed',
      icon: '✨',
      status: 'completed',
      timestamp: order.completed_at || undefined,
      description: 'Your cleaning has been completed successfully!',
    });
  } else if (order.status === 'in_progress') {
    steps.push({
      id: 'completing',
      label: 'Finishing Up',
      icon: '✨',
      status: 'upcoming',
      description: 'Final touches and quality check',
    });
  }
  
  return steps;
}

/**
 * Get estimated cleaning duration based on order details
 */
function getEstimatedDuration(order: CleaningOrder): string {
  const { bedrooms, bathrooms, deep } = order.order_details;
  
  // Base time per bedroom
  let minutes = bedrooms * 30;
  
  // Add time for bathrooms
  minutes += bathrooms * 20;
  
  // Deep clean takes longer
  if (deep) {
    minutes *= 1.5;
  }
  
  const hours = Math.ceil(minutes / 60);
  return `${hours}-${hours + 1} hours`;
}

/**
 * Format time window
 */
function formatTimeWindow(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  return `${startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

/**
 * Get relative time to future event
 */
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === 1) return 'Tomorrow';
  if (diffHours > 1) return `In ${diffHours} hours`;
  if (diffHours === 1) return 'In 1 hour';
  return 'Soon';
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
