'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface ValidationIndicatorProps {
  isValid: boolean
  hasError: boolean
  className?: string
}

export function ValidationIndicator({ isValid, hasError, className = '' }: ValidationIndicatorProps) {
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {isValid && (
          <motion.div
            key="valid"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-5 h-5 bg-success-500 rounded-full flex items-center justify-center"
            aria-label="Valid input"
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        )}
        
        {hasError && (
          <motion.div
            key="error"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-5 h-5 bg-error-500 rounded-full flex items-center justify-center"
            aria-label="Invalid input"
          >
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
