'use client'

import { useState, useEffect } from 'react'

interface UpdateQuoteModalProps {
  order: any
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function UpdateQuoteModal({
  order,
  isOpen,
  onClose,
  onSuccess
}: UpdateQuoteModalProps) {
  // Form state
  const [quoteCents, setQuoteCents] = useState(0)
  const [actualWeightLbs, setActualWeightLbs] = useState(0)
  const [reason, setReason] = useState('')
  const [notifyCustomer, setNotifyCustomer] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [autoCalculated, setAutoCalculated] = useState(false)
  const [ratePerLb, setRatePerLb] = useState<number | null>(null)

  // Fetch the actual pricing rate for laundry
  useEffect(() => {
    if (isOpen && order?.service_type === 'LAUNDRY' && order?.zip) {
      fetchLaundryRate(order.zip)
    }
  }, [isOpen, order])

  // Initialize form with current values
  useEffect(() => {
    if (isOpen && order) {
      // If there's no existing quote, start with a reasonable default based on estimated total
      const initialQuote = order.quote_cents || order.total_cents || 0
      setQuoteCents(initialQuote)
      setActualWeightLbs(order.actual_weight_lbs || 0)
      setReason('')
      setNotifyCustomer(true)
      setError('')
      setAutoCalculated(false)
    }
  }, [isOpen, order])

  // Fetch actual laundry rate from database
  async function fetchLaundryRate(zip: string) {
    try {
      const response = await fetch(`/api/price/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: 'laundry',
          zip,
          lbs: 1, // Query for 1lb to get the rate
          addons: [],
          rushService: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Extract per-lb rate from the first item
        const perLbItem = data.breakdown?.items?.find((item: any) => 
          item.key === 'LND_WF_PERLB'
        )
        if (perLbItem) {
          setRatePerLb(perLbItem.unit_price_cents / 100) // Convert cents to dollars
        }
      }
    } catch (err) {
      console.error('Error fetching laundry rate:', err)
    }
  }

  // Auto-calculate quote when weight changes (for LAUNDRY orders)
  const handleWeightChange = async (newWeight: number) => {
    setActualWeightLbs(newWeight)
    
    // Only auto-calculate for LAUNDRY service type and if weight is valid
    if (order?.service_type === 'LAUNDRY' && newWeight > 0 && order?.zip) {
      try {
        // Use the real pricing API to get accurate quote
        const response = await fetch(`/api/price/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceType: 'laundry',
            zip: order.zip,
            lbs: newWeight,
            addons: order.addons || [],
            rushService: order.rush_service || false
          })
        })

        if (response.ok) {
          const data = await response.json()
          setQuoteCents(data.total_cents)
          setAutoCalculated(true)
        }
      } catch (err) {
        console.error('Error calculating quote:', err)
      }
    }
  }

  if (!isOpen || !order) return null

  const currentQuoteCents = order.quote_cents || 0
  const variancePercent = currentQuoteCents > 0
    ? ((quoteCents - currentQuoteCents) / currentQuoteCents) * 100
    : 0
  const hasLargeVariance = Math.abs(variancePercent) > 20

  const quoteDollars = quoteCents / 100
  const currentQuoteDollars = currentQuoteCents / 100

  const isValid = quoteCents > 0 && reason.trim().length >= 10

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!isValid) {
      setError('Please provide a valid quote amount and reason (min 10 characters)')
      return
    }

    // Confirmation for large variance
    if (Math.abs(variancePercent) > 30) {
      const confirmed = window.confirm(
        `This quote differs by ${Math.abs(variancePercent).toFixed(1)}% from the current amount. Are you sure you want to proceed?`
      )
      if (!confirmed) return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const payload: any = {
        quote_cents: quoteCents,
        reason: reason.trim(),
        notify_customer: notifyCustomer
      }

      // Add service-specific fields
      if (order.service_type === 'LAUNDRY' && actualWeightLbs > 0) {
        payload.actual_weight_lbs = actualWeightLbs
      }

      const response = await fetch(`/api/admin/orders/${order.id}/update-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update quote')
      }

      // Show warning if payment intent exists
      if (data.payment_warning) {
        alert(`⚠️ Warning: ${data.payment_warning.message}\n\nPayment Intent: ${data.payment_warning.payment_intent_id}`)
      }

      onSuccess()
    } catch (err: any) {
      console.error('Error updating quote:', err)
      setError(err.message || 'Failed to update quote')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Update Quote</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Order #{order.id.substring(0, 8)}... • {order.service_type}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Quote Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Service Type</p>
                <p className="font-medium capitalize">{order.service_type.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-gray-500">Current Quote</p>
                <p className="font-medium text-lg">
                  {currentQuoteCents > 0 
                    ? `$${currentQuoteDollars.toFixed(2)}`
                    : 'Not set'}
                </p>
              </div>
              {order.actual_weight_lbs && (
                <div>
                  <p className="text-gray-500">Current Weight</p>
                  <p className="font-medium">{order.actual_weight_lbs} lbs</p>
                </div>
              )}
              {order.status && (
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-medium capitalize">{order.status.replace(/_/g, ' ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Intent Warning */}
          {order.status === 'awaiting_payment' && order.payment_intent_id && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-900">Active Payment Intent</h4>
                  <p className="text-sm text-yellow-800 mt-1">
                    This order has an active payment intent. Changing the quote may require manual payment intent update.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quote Amount Input */}
          <div>
            <label htmlFor="quote" className="block text-sm font-medium text-gray-700 mb-1">
              New Quote Amount * <span className="text-gray-500 font-normal">(in dollars)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                id="quote"
                type="number"
                min="0.01"
                step="0.01"
                value={quoteDollars || ''}
                onChange={(e) => setQuoteCents(Math.round(parseFloat(e.target.value || '0') * 100))}
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                  quoteCents <= 0 ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="0.00"
                required
                disabled={isSubmitting}
              />
            </div>
            {quoteCents <= 0 && (
              <p className="text-xs text-red-600 mt-1">⚠️ Quote amount must be greater than $0</p>
            )}
          </div>

          {/* Weight Input (for laundry) */}
          {order.service_type === 'LAUNDRY' && (
            <div>
              <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
                Actual Weight <span className="text-gray-500 font-normal">(lbs, optional)</span>
              </label>
              <input
                id="weight"
                type="number"
                min="0"
                step="0.1"
                value={actualWeightLbs || ''}
                onChange={(e) => handleWeightChange(parseFloat(e.target.value || '0'))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                placeholder="0.0"
                disabled={isSubmitting}
              />
              <p className="text-xs text-gray-600 mt-1">
                💡 Quote will auto-calculate based on entered weight
                {ratePerLb && ` (${ratePerLb.toFixed(2)}/lb + addons)`}
              </p>
              {autoCalculated && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                  Quote auto-calculated based on weight and service details
                </p>
              )}
            </div>
          )}

          {/* Variance Display */}
          {currentQuoteCents > 0 && quoteCents !== currentQuoteCents && (
            <div className={`rounded-lg p-4 ${hasLargeVariance ? 'bg-yellow-50 border border-yellow-300' : 'bg-blue-50 border border-blue-200'}`}>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                {hasLargeVariance && (
                  <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                )}
                Price Variance
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Previous:</span>
                  <span className="font-medium">${currentQuoteDollars.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">New:</span>
                  <span className="font-medium">${quoteDollars.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t">
                  <span className="text-gray-600">Variance:</span>
                  <span className={`font-semibold ${hasLargeVariance ? 'text-yellow-700' : 'text-blue-700'}`}>
                    {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%
                  </span>
                </div>
              </div>
              {hasLargeVariance && (
                <p className="text-xs text-yellow-700 mt-2">
                  ⓘ Variance exceeds 20%. Please ensure this is intentional.
                </p>
              )}
            </div>
          )}

          {/* Reason Input */}
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Update * <span className="text-gray-500 font-normal">(min 10 characters)</span>
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                reason.trim().length > 0 && reason.trim().length < 10 ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="e.g., Customer requested rush service, Correcting partner error, Additional items added..."
              required
              disabled={isSubmitting}
            />
            <p className={`text-xs mt-1 ${
              reason.trim().length < 10 ? 'text-red-600' : 'text-green-600'
            }`}>
              {reason.length < 10 && '⚠️ '}
              {reason.length}/10 characters minimum • Required for audit trail
              {reason.length >= 10 && ' ✓'}
            </p>
          </div>

          {/* Notify Customer Checkbox */}
          <div className="flex items-center">
            <input
              id="notify"
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <label htmlFor="notify" className="ml-2 text-sm text-gray-700">
              Send SMS notification to customer
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              title={!isValid ? 'Please enter a quote amount > $0 and a reason with at least 10 characters' : ''}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Quote'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
