'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, Circle } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { usePrefersReducedMotion } from '@/lib/animations';

interface TimelineSubstate {
  label: string;
  timestamp?: string;
  icon?: string;
}

interface TimelineStage {
  key: string;
  label: string;
  icon: string; // emoji
  description?: string;
  substates?: TimelineSubstate[];
}

interface UnifiedTimelineProps {
  stages: TimelineStage[];
  currentStage: string;
  completedStages: string[];
  variant?: 'standard' | 'detailed';
  orientation?: 'horizontal' | 'vertical' | 'auto';
  onStageClick?: (stage: string) => void;
}

const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

/**
 * UnifiedTimeline - Adaptive 3-stage timeline for both services
 * 
 * Features:
 * - 3-stage model (Scheduled → In Progress/Transit → Completed)
 * - Configurable substates per stage
 * - Progress indicator with visual feedback
 * - Timestamp tracking for milestones
 * - Exception state handling
 * - Responsive layouts (horizontal mobile, vertical desktop)
 * - Smooth animations
 * - Full accessibility with ARIA announcements
 * 
 * @example
 * ```tsx
 * <UnifiedTimeline
 *   stages={[
 *     {
 *       key: 'scheduled',
 *       label: 'Scheduled',
 *       icon: '📅',
 *       description: 'Your order is confirmed',
 *       substates: [
 *         { label: 'Quote received', timestamp: '2025-10-05T10:00:00Z' },
 *         { label: 'Payment confirmed', timestamp: '2025-10-05T10:30:00Z' }
 *       ]
 *     },
 *     {
 *       key: 'in_progress',
 *       label: 'In Progress',
 *       icon: '⚡',
 *       substates: []
 *     },
 *     {
 *       key: 'completed',
 *       label: 'Completed',
 *       icon: '✅'
 *     }
 *   ]}
 *   currentStage="scheduled"
 *   completedStages={[]}
 *   variant="detailed"
 * />
 * ```
 */
export function UnifiedTimeline({
  stages,
  currentStage,
  completedStages,
  variant = 'standard',
  orientation = 'auto',
  onStageClick,
}: UnifiedTimelineProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  // Determine actual orientation
  const isHorizontal = orientation === 'horizontal' || 
    (orientation === 'auto' && typeof window !== 'undefined' && window.innerWidth < 768);
  
  // Calculate progress percentage
  const totalStages = stages.length;
  const currentIndex = stages.findIndex(s => s.key === currentStage);
  const completedCount = completedStages.length;
  const progressPercent = (completedCount / totalStages) * 100;
  
  const getStageStatus = (stageKey: string): 'completed' | 'current' | 'upcoming' => {
    if (completedStages.includes(stageKey)) return 'completed';
    if (stageKey === currentStage) return 'current';
    return 'upcoming';
  };
  
  const getStageColors = (status: 'completed' | 'current' | 'upcoming') => {
    switch (status) {
      case 'completed':
        return {
          bg: designTokens.colors.success[50],
          border: designTokens.colors.success[500],
          text: designTokens.colors.success[700],
          icon: designTokens.colors.success[600],
        };
      case 'current':
        return {
          bg: designTokens.colors.primary[50],
          border: designTokens.colors.primary[500],
          text: designTokens.colors.primary[700],
          icon: designTokens.colors.primary[600],
        };
      case 'upcoming':
        return {
          bg: designTokens.colors.neutral[50],
          border: designTokens.colors.neutral[300],
          text: designTokens.colors.neutral[600],
          icon: designTokens.colors.neutral[400],
        };
    }
  };

  if (isHorizontal) {
    // Mobile Horizontal Layout
    return (
      <div 
        className="w-full overflow-x-auto pb-4"
        role="group"
        aria-label="Order progress timeline"
      >
        <div className="flex items-start space-x-4 min-w-max px-4">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage.key);
            const colors = getStageColors(status);
            const isClickable = onStageClick && status !== 'upcoming';
            
            return (
              <React.Fragment key={stage.key}>
                {/* Stage */}
                <motion.button
                  initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: index * 0.1 }}
                  onClick={() => isClickable && onStageClick?.(stage.key)}
                  disabled={!isClickable}
                  className={`flex flex-col items-center space-y-2 min-w-[120px] ${
                    isClickable ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  role="button"
                  aria-label={`${stage.label} stage - ${status}`}
                  aria-current={status === 'current' ? 'step' : undefined}
                >
                  {/* Icon Circle */}
                  <div
                    className="relative w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-200"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                    }}
                  >
                    {status === 'completed' ? (
                      <Check className="w-8 h-8" style={{ color: colors.icon }} />
                    ) : status === 'current' ? (
                      <motion.div
                        animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
                        className="text-3xl"
                      >
                        {stage.icon}
                      </motion.div>
                    ) : (
                      <Circle className="w-6 h-6" style={{ color: colors.icon }} />
                    )}
                  </div>
                  
                  {/* Label */}
                  <div className="text-center">
                    <p 
                      className="text-sm font-semibold"
                      style={{ color: colors.text }}
                    >
                      {stage.label}
                    </p>
                    {variant === 'detailed' && stage.description && (
                      <p className="text-xs text-gray-500 mt-1">
                        {stage.description}
                      </p>
                    )}
                    
                    {/* Substates */}
                    {variant === 'detailed' && stage.substates && stage.substates.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {stage.substates.map((substate, subIdx) => (
                          <div key={subIdx} className="text-xs text-left">
                            <span className="text-gray-600">{substate.icon || '•'} {substate.label}</span>
                            {substate.timestamp && (
                              <span className="block text-gray-400 text-[10px] ml-3">
                                {formatTimestamp(substate.timestamp)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.button>
                
                {/* Connector */}
                {index < stages.length - 1 && (
                  <div className="flex items-center pt-8">
                    <div 
                      className="h-0.5 w-8 transition-colors duration-300"
                      style={{
                        backgroundColor: completedStages.includes(stage.key) && completedStages.includes(stages[index + 1].key)
                          ? designTokens.colors.success[500]
                          : designTokens.colors.neutral[300]
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6 px-4">
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: [0, 0, 0.2, 1] }}
              className="h-full rounded-full"
              style={{ backgroundColor: designTokens.colors.primary[500] }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Order progress"
            />
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            {Math.round(progressPercent)}% Complete
          </p>
        </div>
      </div>
    );
  }

  // Desktop Vertical Layout
  return (
    <div 
      className="w-full"
      role="group"
      aria-label="Order progress timeline"
    >
      <div className="space-y-0">
        {stages.map((stage, index) => {
          const status = getStageStatus(stage.key);
          const colors = getStageColors(status);
          const isClickable = onStageClick && status !== 'upcoming';
          
          return (
            <React.Fragment key={stage.key}>
              {/* Stage */}
              <motion.button
                initial={{ opacity: prefersReducedMotion ? 1 : 0, x: prefersReducedMotion ? 0 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: index * 0.1 }}
                onClick={() => isClickable && onStageClick?.(stage.key)}
                disabled={!isClickable}
                className={`w-full flex items-start space-x-4 p-4 rounded-lg transition-colors ${
                  isClickable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'
                }`}
                role="button"
                aria-label={`${stage.label} stage - ${status}`}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                {/* Icon Circle + Connector */}
                <div className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all duration-200"
                    style={{
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                    }}
                  >
                    {status === 'completed' ? (
                      <Check className="w-6 h-6" style={{ color: colors.icon }} />
                    ) : status === 'current' ? (
                      <motion.div
                        animate={prefersReducedMotion ? {} : { scale: [1, 1.1, 1] }}
                        transition={{ duration: 1, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
                        className="text-2xl"
                      >
                        {stage.icon}
                      </motion.div>
                    ) : (
                      <Circle className="w-5 h-5" style={{ color: colors.icon }} />
                    )}
                  </div>
                  
                  {/* Vertical Connector */}
                  {index < stages.length - 1 && (
                    <div 
                      className="w-0.5 h-16 mt-2 transition-colors duration-300"
                      style={{
                        backgroundColor: completedStages.includes(stage.key)
                          ? designTokens.colors.success[500]
                          : designTokens.colors.neutral[300]
                      }}
                    />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 text-left pb-8">
                  <h3 
                    className="text-lg font-semibold"
                    style={{ color: colors.text }}
                  >
                    {stage.label}
                  </h3>
                  
                  {variant === 'detailed' && stage.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {stage.description}
                    </p>
                  )}
                  
                  {/* Substates */}
                  {variant === 'detailed' && stage.substates && stage.substates.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {stage.substates.map((substate, subIdx) => (
                        <div key={subIdx} className="flex items-start space-x-2 text-sm">
                          <span className="text-gray-400 mt-0.5">{substate.icon || '•'}</span>
                          <div className="flex-1">
                            <span className="text-gray-700">{substate.label}</span>
                            {substate.timestamp && (
                              <span className="block text-gray-400 text-xs mt-0.5">
                                {formatTimestamp(substate.timestamp)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.button>
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Progress Indicator */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-semibold text-primary-600">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: [0, 0, 0.2, 1] }}
            className="h-full rounded-full"
            style={{ backgroundColor: designTokens.colors.primary[500] }}
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Order progress"
          />
        </div>
      </div>
    </div>
  );
}
