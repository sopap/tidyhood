'use client'

import { useState } from 'react'
import { canRescheduleCleaning } from '@/lib/cleaningStatus'

interface RescheduleCleaningModalProps {
  isOpen: boolean
  onClose: () => void
  order: any
}

export function RescheduleCleaningModal({
  isOpen,
  onClose,
  order
}: RescheduleCleaningModalProps) {
  if (!isOpen) return null
  
  // Check if can reschedule
  if (!canRescheduleCleaning(order)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h2 className="text-2xl font-bold mb-4">Cannot Reschedule</h2>
          <p className="text-gray-700 mb-6">
            Orders cannot be rescheduled less than 24 hours before the appointment.
            Please cancel and book a new time instead.
          </p>
          <button onClick={onClose} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Got it
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Reschedule Cleaning</h2>
        
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Current appointment:</div>
            <div className="font-medium">
              {new Date(order.scheduled_time).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              To reschedule your cleaning, please contact our support team at{' '}
              <a href="tel:1-800-TIDYHOOD" className="font-medium underline">
                1-800-TIDYHOOD
              </a>
              {' '}or email{' '}
              <a href="mailto:support@tidyhood.com" className="font-medium underline">
                support@tidyhood.com
              </a>
            </p>
            <p className="text-xs text-blue-800 mt-2">
              Rescheduling is free if done more than 24 hours before your appointment.
            </p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
      </div>
    </div>
  )
}
