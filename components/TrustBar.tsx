'use client'

import { motion } from 'framer-motion'
import { fadeInVariants } from '@/lib/motionVariants'

export function TrustBar() {
  return (
    <motion.div
      variants={fadeInVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center justify-center gap-3 py-4 px-4 bg-primary-50 border-y border-primary-100"
      role="status"
      aria-label="Customer satisfaction and service statistics"
    >
      <div className="flex items-center gap-2 text-sm md:text-base text-text-secondary">
        <span className="text-lg" role="img" aria-label="Star rating">⭐</span>
        <span className="font-semibold">4.9</span>
        <span className="hidden sm:inline">Harlem Resident Rating</span>
        <span className="sm:hidden">Customer Rating</span>
      </div>
      <span className="text-gray-400">•</span>
      <div className="text-sm md:text-base text-text-secondary">
        <span className="font-semibold">Over 500</span> happy homes served
      </div>
    </motion.div>
  )
}
