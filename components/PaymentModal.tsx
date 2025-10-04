'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  orderId: string
  amount: number
  onSuccess: () => void
  onError: (error: string) => void
}

function PaymentForm({ orderId, amount, onSuccess, onError }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setProcessing(true)

    try {
      // Call backend to create PaymentIntent
      const response = await fetch(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `pay-${orderId}-${Date.now()}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Payment failed')
      }

      const { client_secret } = await response.json()

      // Confirm payment with Stripe
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        clientSecret: client_secret,
        confirmParams: {
          return_url: `${window.location.origin}/orders/${orderId}/success`
        },
        redirect: 'if_required'
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }

      onSuccess()
    } catch (err: any) {
      console.error('Payment error:', err)
      onError(err.message || 'Payment failed. Please try again.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      <div className="pt-4">
        <button
          type="submit"
          disabled={!stripe || processing}
          className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : `Pay $${(amount / 100).toFixed(2)}`}
        </button>
      </div>
    </form>
  )
}

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  amount: number
  onSuccess: () => void
}

export function PaymentModal({ isOpen, onClose, orderId, amount, onSuccess }: PaymentModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && orderId) {
      // Fetch client secret when modal opens
      fetch(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `setup-${orderId}-${Date.now()}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.client_secret) {
            setClientSecret(data.client_secret)
          } else {
            setError('Failed to initialize payment')
          }
        })
        .catch(err => {
          console.error('Payment setup error:', err)
          setError('Failed to initialize payment')
        })
    }
  }, [isOpen, orderId])

  if (!isOpen) return null

  const handleSuccess = () => {
    setError(null)
    onSuccess()
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Complete Payment</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={clientSecret !== null}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!clientSecret ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing payment...</p>
          </div>
        ) : (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#2563eb'
                }
              }
            }}
          >
            <PaymentForm
              orderId={orderId}
              amount={amount}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </Elements>
        )}

        <div className="mt-4 text-xs text-gray-500 text-center">
          <p>🔒 Secure payment powered by Stripe</p>
          <p className="mt-1">Test card: 4242 4242 4242 4242</p>
        </div>
      </div>
    </div>
  )
}
