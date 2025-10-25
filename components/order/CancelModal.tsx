'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCancellationPolicy, formatMoney } from '@/lib/cancellationFees'
import type { Order } from '@/lib/types'
import type { CancellationPolicy } from '@/lib/cancellationFees'

interface CancelModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order
  onSuccess?: () => void
}

const CANCELLATION_REASONS = [
  { value: 'schedule_conflict', label: 'Schedule conflict' },
  { value: 'no_longer_needed', label: 'No longer needed' },
  { value: 'found_alternative', label: 'Found alternative service' },
  { value: 'price_concerns', label: 'Price concerns' },
  { value: 'other', label: 'Other' },
]

export default function CancelModal({ isOpen, onClose, order, onSuccess }: CancelModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<'reason' | 'confirm'>('reason')
  const [reason, setReason] = useState('')
  const [otherReason, setOtherReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null)

  // Fetch policy when modal opens
  useEffect(() => {
    if (isOpen && order) {
      getCancellationPolicy(order as any).then(setPolicy).catch(console.error)
    }
  }, [isOpen, order])

  // Reset state when modal closes
  const handleClose = () => {
    setStep('reason')
    setReason('')
    setOtherReason('')
    setError(null)
    onClose()
  }

  const handleReasonSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason) return
    if (reason === 'other' && !otherReason.trim()) return
    setStep('confirm')
  }

  const handleCancel = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reason === 'other' ? otherReason : reason,
          canceled_by: 'customer',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel order')
      }

      // Success! Show toast and redirect
      if (onSuccess) {
        onSuccess()
      }
      
      // Redirect to orders page after brief delay
      setTimeout(() => {
        router.push('/orders')
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

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
          className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {step === 'reason' && (
            <>
              {/* Header */}
              <div className="mb-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="mt-4 text-center text-lg font-semibold text-gray-900">
                  Cancel Order
                </h3>
                <p className="mt-2 text-center text-sm text-gray-500">
                  We're sorry to see you go. Please let us know why you're canceling.
                </p>
              </div>

              {/* Policy Info */}
              {policy && (
                <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-start gap-2">
                    <svg className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm">
                      {policy.refundAmount > 0 ? (
                      <p className="text-gray-700">
                        You'll receive a refund of <strong>{formatMoney(policy.refundAmount)}</strong> within 5-10 business days.
                        {policy.cancellationFee > 0 && (
                          <span className="block mt-1 text-orange-600">
                            A {formatMoney(policy.cancellationFee)} cancellation fee will be deducted.
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-gray-700">
                        Your order will be canceled at no charge.
                      </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Reason Form */}
              <form onSubmit={handleReasonSubmit} className="space-y-4">
                <div>
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Cancellation Reason *
                  </label>
                  <select
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a reason</option>
                    {CANCELLATION_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {reason === 'other' && (
                  <div>
                    <label htmlFor="otherReason" className="block text-sm font-medium text-gray-700 mb-2">
                      Please specify *
                    </label>
                    <textarea
                      id="otherReason"
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                      required
                      rows={3}
                      maxLength={500}
                      placeholder="Tell us more..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {otherReason.length}/500 characters
                    </p>
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-red-50 border border-red-200 p-3">
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
                    Keep Order
                  </button>
                  <button
                    type="submit"
                    disabled={!reason || (reason === 'other' && !otherReason.trim())}
                    className="w-full sm:w-auto rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 'confirm' && (
            <>
              {/* Confirmation Header */}
              <div className="mb-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
                  <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-center text-lg font-semibold text-gray-900">
                  Are you sure?
                </h3>
                <p className="mt-2 text-center text-sm text-gray-500">
                  This action cannot be undone. Your order will be permanently canceled.
                </p>
              </div>

              {/* Order Summary */}
              <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {order.service_type.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Scheduled:</span>
                  <span className="font-medium text-gray-900">
                    {new Date(order.slot_start).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {policy && policy.refundAmount > 0 && (
                  <>
                    <div className="border-t border-gray-200 my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Original Amount:</span>
                      <span className="font-medium text-gray-900">
                        {formatMoney((order as any).total_cents || 0)}
                      </span>
                    </div>
                    {policy.cancellationFee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Cancellation Fee:</span>
                        <span className="font-medium text-red-600">
                          -{formatMoney(policy.cancellationFee)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-900">Refund Amount:</span>
                      <span className="text-green-600">
                        {formatMoney(policy.refundAmount)}
                      </span>
                    </div>
                  </>
                )}
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
                  onClick={() => setStep('reason')}
                  disabled={isProcessing}
                  className="w-full sm:w-auto rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isProcessing}
                  className="w-full sm:w-auto rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Canceling...</span>
                    </>
                  ) : (
                    'Cancel Order'
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
