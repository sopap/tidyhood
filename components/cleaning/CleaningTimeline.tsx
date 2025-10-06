'use client';

import { useMemo } from 'react';
import type { CleaningOrder, CleaningStatus } from '@/types/cleaningOrders';
import { CLEANING_STAGES, getCleaningStatusConfig } from '@/types/cleaningOrders';

interface CleaningTimelineProps {
  order: CleaningOrder;
  className?: string;
}

/**
 * CleaningTimeline - Visual progress tracker for cleaning orders
 * 
 * Shows 3 primary stages: Scheduled → In Progress → Completed
 * Sub-states (assigned, en_route, on_site) shown as hints below main stages
 * 
 * Mobile: Horizontal scroll with snap points
 * Desktop: Vertical timeline with connecting lines
 */
export function CleaningTimeline({ order, className = '' }: CleaningTimelineProps) {
  const { currentStage, completedStages, hints } = useMemo(() => {
    const status = order.status;
    
    // Determine current stage
    let currentStage: 'scheduled' | 'in_progress' | 'completed' = 'scheduled';
    if (['in_progress'].includes(status)) {
      currentStage = 'in_progress';
    } else if (['completed', 'refunded'].includes(status)) {
      currentStage = 'completed';
    }
    
    // Determine completed stages
    const completedStages: string[] = [];
    if (currentStage === 'in_progress' || currentStage === 'completed') {
      completedStages.push('scheduled');
    }
    if (currentStage === 'completed') {
      completedStages.push('in_progress');
      completedStages.push('completed');
    }
    
    // Build hints for sub-states
    const hints: Record<string, { label: string; timestamp: string }[]> = {
      scheduled: [],
      in_progress: [],
      completed: [],
    };
    
    // Scheduled stage hints
    if (order.assigned_at) {
      hints.scheduled.push({
        label: 'Partner Assigned',
        timestamp: order.assigned_at,
      });
    }
    if (order.en_route_at) {
      hints.scheduled.push({
        label: 'Partner En Route',
        timestamp: order.en_route_at,
      });
    }
    if (order.on_site_at) {
      hints.scheduled.push({
        label: 'Partner Arrived',
        timestamp: order.on_site_at,
      });
    }
    
    // In progress hints
    if (order.started_at) {
      hints.in_progress.push({
        label: 'Cleaning Started',
        timestamp: order.started_at,
      });
    }
    
    // Completed hints
    if (order.completed_at) {
      hints.completed.push({
        label: 'Cleaning Finished',
        timestamp: order.completed_at,
      });
    }
    if (order.disputed_at) {
      hints.completed.push({
        label: 'Dispute Opened',
        timestamp: order.disputed_at,
      });
    }
    if (order.resolved_at) {
      hints.completed.push({
        label: order.resolution_type === 'refund' ? 'Refunded' : 'Dispute Resolved',
        timestamp: order.resolved_at,
      });
    }
    
    return { currentStage, completedStages, hints };
  }, [order]);
  
  return (
    <div className={`cleaning-timeline ${className}`}>
      {/* Mobile: Horizontal Timeline */}
      <div className="md:hidden">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide">
          {CLEANING_STAGES.map((stage, index) => {
            const isCompleted = completedStages.includes(stage.stage);
            const isCurrent = currentStage === stage.stage && !isCompleted;
            const config = getCleaningStatusConfig(order.status);
            
            return (
              <div
                key={stage.stage}
                className="flex-shrink-0 snap-center w-64 px-4 first:pl-0 last:pr-0"
              >
                {/* Stage Card */}
                <div
                  className={`
                    relative rounded-lg border-2 p-4 transition-all
                    ${isCompleted ? 'border-green-500 bg-green-50' : ''}
                    ${isCurrent ? `border-${config.color}-500 bg-${config.color}-50` : ''}
                    ${!isCompleted && !isCurrent ? 'border-gray-200 bg-gray-50' : ''}
                  `}
                >
                  {/* Stage Icon & Label */}
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`
                        flex h-10 w-10 items-center justify-center rounded-full text-xl
                        ${isCompleted ? 'bg-green-500 text-white' : ''}
                        ${isCurrent ? `bg-${config.color}-500 text-white` : ''}
                        ${!isCompleted && !isCurrent ? 'bg-gray-300 text-gray-600' : ''}
                      `}
                    >
                      {isCompleted ? '✓' : stage.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{stage.label}</h3>
                      {isCurrent && (
                        <p className="text-sm text-gray-600">{config.description}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Hints (sub-states) */}
                  {hints[stage.stage].length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                      {hints[stage.stage].map((hint, hintIndex) => (
                        <div key={hintIndex} className="flex items-start gap-2 text-sm">
                          <span className="text-gray-400">•</span>
                          <div className="flex-1">
                            <p className="text-gray-700">{hint.label}</p>
                            <p className="text-xs text-gray-500">
                              {formatTimestamp(hint.timestamp)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Connector */}
                {index < CLEANING_STAGES.length - 1 && (
                  <div className="flex justify-center mt-2">
                    <div
                      className={`
                        h-1 w-8 rounded
                        ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                      `}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Desktop: Vertical Timeline */}
      <div className="hidden md:block">
        <div className="space-y-6">
          {CLEANING_STAGES.map((stage, index) => {
            const isCompleted = completedStages.includes(stage.stage);
            const isCurrent = currentStage === stage.stage && !isCompleted;
            const config = getCleaningStatusConfig(order.status);
            
            return (
              <div key={stage.stage} className="relative flex gap-6">
                {/* Timeline Track */}
                <div className="flex flex-col items-center">
                  {/* Stage Icon */}
                  <div
                    className={`
                      flex h-12 w-12 items-center justify-center rounded-full text-xl font-semibold z-10
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${isCurrent ? `bg-${config.color}-500 text-white` : ''}
                      ${!isCompleted && !isCurrent ? 'bg-gray-300 text-gray-600' : ''}
                    `}
                  >
                    {isCompleted ? '✓' : stage.icon}
                  </div>
                  
                  {/* Connecting Line */}
                  {index < CLEANING_STAGES.length - 1 && (
                    <div
                      className={`
                        w-0.5 h-full min-h-[60px] -mt-1
                        ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                      `}
                    />
                  )}
                </div>
                
                {/* Stage Content */}
                <div className="flex-1 pb-8">
                  <div
                    className={`
                      rounded-lg border-2 p-4 transition-all
                      ${isCompleted ? 'border-green-500 bg-green-50' : ''}
                      ${isCurrent ? `border-${config.color}-500 bg-${config.color}-50` : ''}
                      ${!isCompleted && !isCurrent ? 'border-gray-200 bg-white' : ''}
                    `}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {stage.label}
                    </h3>
                    
                    {isCurrent && (
                      <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                    )}
                    
                    {/* Hints (sub-states) */}
                    {hints[stage.stage].length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                        {hints[stage.stage].map((hint, hintIndex) => (
                          <div key={hintIndex} className="flex items-start gap-3">
                            <span className="text-gray-400 mt-1">•</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-700">{hint.label}</p>
                              <p className="text-xs text-gray-500">
                                {formatTimestamp(hint.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Exception States (no-shows, disputes) */}
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
              {order.status === 'disputed' && order.dispute_reason && (
                <p className="text-sm text-orange-600 mt-2 italic">
                  Reason: {order.dispute_reason}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  
  // Relative time for recent events
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // Absolute time for older events
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
