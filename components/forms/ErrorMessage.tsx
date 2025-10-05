'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface ErrorMessageProps {
  message: string
  fieldName: string
}

export function ErrorMessage({ message, fieldName }: ErrorMessageProps) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={`error-${fieldName}`}
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div
            className="flex items-start gap-2 p-3 bg-error-50 border border-error-200 rounded-lg mt-2"
            role="alert"
            aria-live="polite"
            id={`${fieldName}-error`}
          >
            <span className="text-error text-lg flex-shrink-0" aria-hidden="true">⚠️</span>
            <span className="text-sm text-error-700 font-medium">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
