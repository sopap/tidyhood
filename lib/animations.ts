/**
 * Animation System for Unified Order Detail Design
 * 
 * Provides consistent animations with reduced motion support
 * for accessibility.
 * 
 * @version 2.0
 * @see UNIFIED_ORDER_DETAIL_DESIGN_SPEC.md
 */

import { designTokens } from './design-tokens';

export const animations = {
  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { 
      duration: 0.2,
      ease: [0, 0, 0.2, 1], // easeOut as bezier array
    },
  },
  
  fadeOut: {
    initial: { opacity: 1 },
    animate: { opacity: 0 },
    transition: { 
      duration: 0.2,
      ease: [0.4, 0, 1, 1], // easeIn as bezier array
    },
  },
  
  // Slide animations
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
    transition: { 
      duration: 0.2,
      ease: [0, 0, 0.2, 1], // easeOut
    },
  },
  
  slideDown: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
    transition: { 
      duration: 0.2,
      ease: [0, 0, 0.2, 1], // easeOut
    },
  },
  
  slideLeft: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
    transition: { 
      duration: 0.2,
      ease: [0, 0, 0.2, 1], // easeOut
    },
  },
  
  slideRight: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
    transition: { 
      duration: 0.2,
      ease: [0, 0, 0.2, 1], // easeOut
    },
  },
  
  // Scale animations
  scaleIn: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { 
      duration: 0.15,
      ease: [0, 0, 0.2, 1], // easeOut
    },
  },
  
  scaleOut: {
    initial: { scale: 1, opacity: 1 },
    animate: { scale: 0.95, opacity: 0 },
    transition: { 
      duration: 0.15,
      ease: [0.4, 0, 1, 1], // easeIn
    },
  },
  
  // Progress animations
  progressPulse: {
    animate: { 
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
    },
    transition: { 
      duration: 0.5,
      repeat: Infinity,
      ease: [0.4, 0, 0.2, 1], // easeInOut
    },
  },
  
  // Bounce animation
  bounce: {
    animate: {
      y: [0, -10, 0],
    },
    transition: {
      duration: 0.3,
      repeat: Infinity,
      ease: [0.4, 0, 0.2, 1], // easeInOut
    },
  },
  
  // Spin animation
  spin: {
    animate: {
      rotate: 360,
    },
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
} as const;

/**
 * Hook to check if user prefers reduced motion
 */
export const usePrefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get animation config with reduced motion support
 * 
 * @param animation - The animation key from the animations object
 * @param prefersReducedMotion - Whether the user prefers reduced motion
 * @returns Animation configuration object
 */
export const getAnimation = (
  animation: keyof typeof animations,
  prefersReducedMotion: boolean = false
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

/**
 * CSS transition classes for non-framer-motion elements
 */
export const transitionClasses = {
  base: `transition-all duration-${designTokens.animation.duration.normal} ease-${designTokens.animation.easing.easeOut}`,
  fast: `transition-all duration-${designTokens.animation.duration.fast} ease-${designTokens.animation.easing.easeOut}`,
  slow: `transition-all duration-${designTokens.animation.duration.slow} ease-${designTokens.animation.easing.easeOut}`,
  colors: `transition-colors duration-${designTokens.animation.duration.normal} ease-${designTokens.animation.easing.easeOut}`,
  opacity: `transition-opacity duration-${designTokens.animation.duration.normal} ease-${designTokens.animation.easing.easeOut}`,
  transform: `transition-transform duration-${designTokens.animation.duration.normal} ease-${designTokens.animation.easing.easeOut}`,
} as const;

/**
 * Stagger animation helper for lists
 */
export const staggerChildren = (
  delayMs: number = 50,
  prefersReducedMotion: boolean = false
) => {
  if (prefersReducedMotion) {
    return {
      staggerChildren: 0,
    };
  }
  
  return {
    staggerChildren: delayMs / 1000,
  };
};

/**
 * Timeline animation variants for order status progression
 */
export const timelineVariants = {
  container: (prefersReducedMotion: boolean) => ({
    hidden: { opacity: prefersReducedMotion ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.2,
      },
    },
  }),
  
  item: (prefersReducedMotion: boolean) => ({
    hidden: { 
      opacity: prefersReducedMotion ? 1 : 0,
      y: prefersReducedMotion ? 0 : 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0 : 0.3,
        ease: designTokens.animation.easing.easeOut,
      },
    },
  }),
};

/**
 * Status badge animation variants
 */
export const statusBadgeVariants = {
  initial: (prefersReducedMotion: boolean) => ({
    scale: prefersReducedMotion ? 1 : 0.9,
    opacity: prefersReducedMotion ? 1 : 0,
  }),
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.2,
      ease: designTokens.animation.easing.easeOut,
    },
  },
  tap: {
    scale: 0.95,
  },
};

/**
 * Card entrance animation variants
 */
export const cardVariants = {
  hidden: (prefersReducedMotion: boolean) => ({
    opacity: prefersReducedMotion ? 1 : 0,
    y: prefersReducedMotion ? 0 : 30,
  }),
  visible: (prefersReducedMotion: boolean) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: prefersReducedMotion ? 0 : 0.4,
      ease: designTokens.animation.easing.easeOut,
    },
  }),
};

export type AnimationVariant = keyof typeof animations;
