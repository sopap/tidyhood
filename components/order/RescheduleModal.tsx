'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCancellationPolicy, formatMoney } from '@/lib/cancellationFees'
import { formatSlotTime } from '@/lib/slots'
import SlotPicker from '@/components/booking/SlotPicker'
import type { Order, BookingSlot } from '@/lib/types'

interface RescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  onSuccess?: () => void
}

export default function RescheduleModal({ isOpen, onClose, order, onSuccess }: RescheduleModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<'select' | 'confirm'>('select')
  const [newSlot, setNewSlot] = useState<{ date: string; slot?: BookingSlot }>({ date: '' })
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const policy = getCancellationPolicy(order as any)

  // Reset state when modal closes
  const handleClose = () => {
    setStep('select')
    setNewSlot({ date: '' })
    setError(null)
    onClose()
  }

  const handleSlotChange = (value: { date: string; slot?: BookingSlot }) => {
    setNewSlot(value)
    setError(null)
  }

  const handleContinue = () => {
    if (!newSlot.slot) {
      setError('Please select a new time slot')
      return
    }
    setStep('confirm')
  }

  const handleReschedule = async () => {
    if (!newSlot.slot) return

    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/orders/${order.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_slot_start: newSlot.slot.slot_start,
          new_slot_end: newSlot.slot.slot_end,
          partner_id: newSlot.slot.partner_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reschedule order')
      }

      // Success! Show toast and redirect
      if (onSuccess) {
        onSuccess()
      }
      
      // Close modal and refresh page
      handleClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  // Extract zip code from order address
  const getZipFromAddress = (address: string): string => {
    const match = address.match(/\b\d{5}\b/)
    return match ? match[0] : ''
  }

  const zip = getZipFromAddress((order as any).service_address || '')
  
  // Format current and new slot times
  const currentSlotTime = formatSlotTime(order.slot_start, order.slot_end)
  const newSlotTime = newSlot.slot 
    ? formatSlotTime(newSlot.slot.slot_start, newSlot.slot.slot_end)
    : ''

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div 
          className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {step === 'select' && (
            <>
              {/* Header */}
              <div className="mb-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-center text-lg font-semibold text-gray-900">
                  Reschedule Pickup
                </h3>
                <p className="mt-2 text-center text-sm text-gray-500">
                  Select a new date and time for your pickup
                </p>
              </div>

              {/* Current Slot Info */}
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-start gap-2">
                  <svg className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm">
                    <p className="text-gray-600">Current pickup time:</p>
                    <p className="font-medium text-gray-900 mt-0.5">
                      {new Date(order.slot_start).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })} at {currentSlotTime}
                    </p>
                  </div>
                </div>
              </div>

              {/* Policy Info */}
              {policy.requiresNotice && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <div className="flex items-start gap-2">
                    <svg className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                      <p className="text-blue-800">
                        {policy.reason}
                        {policy.rescheduleFee > 0 && (
                          <span className="block mt-1 font-medium">
                            A {formatMoney(policy.rescheduleFee)} rescheduling fee will be charged.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Slot Picker */}
              <div className="mb-4">
                <SlotPicker
                  zip={zip}
                  value={newSlot}
                  onChange={handleSlotChange}
                />
              </div>

              {error && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={!newSlot.slot}
                  className="w-full sm:w-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              {/* Confirmation Header */}
              <div className="mb-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-center text-lg font-semibold text-gray-900">
                  Confirm Reschedule
                </h3>
                <p className="mt-2 text-center text-sm text-gray-500">
                  Please review the changes before confirming
                </p>
              </div>

              {/* Comparison */}
              <div className="mb-4 space-y-3">
                {/* Old Slot */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Current Pickup</p>
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">
                        {new Date(order.slot_start).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-gray-600">{currentSlotTime}</p>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>

                {/* New Slot */}
                <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-4">
                  <p className="text-xs font-medium text-blue-600 uppercase mb-2">New Pickup</p>
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">
                        {newSlot.date && new Date(newSlot.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-gray-600">{newSlotTime}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee Info */}
              {policy.rescheduleFee > 0 && (
                <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-orange-900">Rescheduling Fee:</span>
                    <span className="text-sm font-semibold text-orange-900">{formatMoney(policy.rescheduleFee)}</span>
                  </div>
                  <p className="text-xs text-orange-700 mt-1">
                    This fee will be charged to your payment method
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  disabled={isProcessing}
                  className="w-full sm:w-auto rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleReschedule}
                  disabled={isProcessing}
                  className="w-full sm:w-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Rescheduling...</span>
                    </>
                  ) : (
                    `Confirm Reschedule${policy.rescheduleFee > 0 ? ` (${formatMoney(policy.rescheduleFee)})` : ''}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
