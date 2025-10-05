/**
 * GPU-optimized Framer Motion animation variants
 * - Uses transform and opacity only (composite properties)
 * - Includes GPU acceleration hints
 * - Respects prefers-reduced-motion
 */
import type { Variants } from 'framer-motion'

// Check if user prefers reduced motion
const prefersReducedMotion = 
  typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

// Force GPU acceleration with translateZ
const gpuAcceleration = {
  translateZ: 0,
  backfaceVisibility: 'hidden' as const,
  perspective: 1000,
}

// Helper to disable animations if needed
export const withReducedMotion = (variants: Variants): Variants => {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 1 },
      visible: { opacity: 1 },
      rest: {},
      hover: {},
    }
  }
  return variants
}

export const fadeInVariants: Variants = {
  hidden: { 
    opacity: 0,
    ...gpuAcceleration,
  },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as const,
    }
  }
}

export const fadeInUpVariants: Variants = {
  hidden: { 
    opacity: 0,
    y: 20,
    ...gpuAcceleration,
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    }
  }
}

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,  // Increased from 0.05 for smoother feel
      delayChildren: 0.2,
    }
  }
}

export const staggerItemVariants: Variants = {
  hidden: { 
    opacity: 0,
    y: 15,  // Reduced from 20 for subtlety
    ...gpuAcceleration,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as const,
    }
  }
}

export const scaleOnHoverVariants: Variants = {
  rest: { 
    scale: 1,
    ...gpuAcceleration,
  },
  hover: { 
    scale: 1.015,  // Reduced from 1.02 for subtlety
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.6, 1] as const,
    }
  }
}

export const cardHoverVariants: Variants = {
  rest: { 
    scale: 1,
    y: 0,
    ...gpuAcceleration,
  },
  hover: { 
    scale: 1.015,  // Reduced from 1.02 for subtlety
    y: -3,         // Reduced from -4
    transition: {
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1] as const,
    }
  }
}

// New: Optimized slide-in variant
export const slideInVariants: Variants = {
  hidden: {
    x: -20,
    opacity: 0,
    ...gpuAcceleration,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1] as const,
    }
  }
}
