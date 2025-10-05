'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export function MobileCTABar() {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 z-50 lg:hidden shadow-xl"
      role="navigation"
      aria-label="Mobile booking actions"
    >
      <div className="flex gap-3 max-w-md mx-auto">
        <Link
          href="/book/laundry"
          className="flex-1 bg-primary-600 text-white px-4 py-3 rounded-lg font-semibold text-center hover:bg-primary-700 active:bg-primary-800 transition-colors focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          aria-label="Book laundry pickup service"
        >
          Book Laundry
        </Link>
        <Link
          href="/book/cleaning"
          className="flex-1 bg-white text-primary-600 border-2 border-primary-600 px-4 py-3 rounded-lg font-semibold text-center hover:bg-primary-50 active:bg-primary-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          aria-label="Book home cleaning service"
        >
          Book Cleaning
        </Link>
      </div>
    </motion.div>
  )
}
