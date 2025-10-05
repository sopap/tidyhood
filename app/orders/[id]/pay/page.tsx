'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PaymentModal } from '@/components/PaymentModal'
import Link from 'next/link'

interface Order {
  id: string
  service_type: string
  status: string
  actual_weight_lbs?: number
  quote_cents?: number
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  order_details: any
  address_snapshot: any
}

export default function PayOrderPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    fetchOrder()
  }, [params.id])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Order not found')
      }
      
      const data = await response.json()
      setOrder(data)
      
      // Check if order is payable
      if (data.status !== 'awaiting_payment') {
        setError('This order is not ready for payment')
      } else {
        setShowPayment(true)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    router.push(`/orders/${params.id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Process Payment</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/" className="btn-primary inline-block">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const amount = order.quote_cents || order.total_cents

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-primary-900">
            Tidyhood
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Complete Payment</h1>
            
            {/* Order Summary */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{order.service_type === 'LAUNDRY' ? 'Laundry' : 'Cleaning'}</span>
                </div>
                
                {order.actual_weight_lbs && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Weight:</span>
                    <span className="font-medium">{order.actual_weight_lbs} lbs</span>
                  </div>
                )}
                
                {order.order_details?.addons && order.order_details.addons.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Add-ons:</span>
                    <span className="font-medium">{order.order_details.addons.length} selected</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Address:</span>
                  <span className="font-medium text-right">
                    {order.address_snapshot.line1}<br />
                    {order.address_snapshot.city}, {order.address_snapshot.zip}
                  </span>
                </div>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="mb-8 pb-8 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>${(order.subtotal_cents / 100).toFixed(2)}</span>
                </div>
                
                {order.tax_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax (8.875%):</span>
                    <span>${(order.tax_cents / 100).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-lg font-bold pt-3 border-t">
                  <span>Total:</span>
                  <span className="text-primary-600">${(amount / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Payment Button */}
            {showPayment && (
              <PaymentModal
                isOpen={true}
                onClose={() => router.push(`/orders/${params.id}`)}
                orderId={order.id}
                amount={amount}
                onSuccess={handlePaymentSuccess}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
