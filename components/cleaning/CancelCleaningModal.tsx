'use client'

import { useState } from 'react'
import { calculateCancellationFee } from '@/lib/cleaningStatus'

interface CancelCleaningModalProps {
  isOpen: boolean
  onClose: () => void
  order: any
  onConfirm: (reason: string) => Promise<void>
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function CancelCleaningModal({
  isOpen,
  onClose,
  order,
  onConfirm
}: CancelCleaningModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  if (!isOpen) return null
  
  const { feeCents, refundCents } = calculateCancellationFee(order)
  const hasFee = feeCents > 0
  
  const handleConfirm = async () => {
    try {
      setLoading(true)
      setError(null)
      await onConfirm(reason)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Cancel Cleaning?</h2>
        
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-700 mb-2">
              Scheduled: {new Date(order.scheduled_time).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
            <div className="text-sm text-gray-700">
              Total: {formatCurrency(order.total_cents)}
            </div>
          </div>
          
          {hasFee ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-amber-900 font-medium mb-2">⚠️ Cancellation Fee</div>
              <div className="text-sm text-amber-800 space-y-1">
                <div>Cancellation fee: {formatCurrency(feeCents)} (15%)</div>
                <div className="font-medium">Refund amount: {formatCurrency(refundCents)}</div>
                <div className="text-xs mt-2">
                  You're canceling less than 24 hours before your appointment.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-900 font-medium mb-1">✓ Full Refund</div>
              <div className="text-sm text-green-800">
                You'll receive a full refund of {formatCurrency(refundCents)}
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select a reason...</option>
              <option value="schedule_conflict">Schedule conflict</option>
              <option value="no_longer_needed">No longer needed</option>
              <option value="found_alternative">Found alternative service</option>
              <option value="emergency">Emergency</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Keep Booking
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Canceling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  )
}
