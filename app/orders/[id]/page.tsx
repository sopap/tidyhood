'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

interface Order {
  id: string
  user_id: string
  service_type: 'LAUNDRY' | 'CLEANING'
  partner_id: string
  slot_start: string
  slot_end: string
  status: string
  subtotal_cents: number
  tax_cents: number
  delivery_cents: number
  total_cents: number
  order_details: {
    lbs?: number
    bedrooms?: number
    bathrooms?: number
    deep?: boolean
    addons?: string[]
  }
  address_snapshot: {
    line1: string
    line2?: string
    city: string
    zip: string
    notes?: string
  }
  created_at: string
  updated_at: string
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user && params.id) {
      fetchOrder()
    }
  }, [user, authLoading, params.id])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${params.id}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Order not found')
        } else if (response.status === 403) {
          setError('You do not have permission to view this order')
        } else {
          setError('Failed to load order')
        }
        return
      }

      const data = await response.json()
      setOrder(data)
    } catch (err) {
      console.error('Error fetching order:', err)
      setError('Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  const formatMoney = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CONFIRMED':
        return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS':
        return 'bg-purple-100 text-purple-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatAddonName = (key: string) => {
    const names: Record<string, string> = {
      'LND_RUSH_24HR': 'Rush Service (24hr)',
      'LND_DELICATE': 'Delicate Care',
      'LND_EXTRA_SOFTENER': 'Extra Softener',
      'LND_FOLDING': 'Professional Folding',
      'CLN_FRIDGE_INSIDE': 'Refrigerator Interior',
      'CLN_OVEN_INSIDE': 'Oven Interior',
      'CLN_WINDOWS_INSIDE': 'Interior Windows',
      'CLN_EXTRA_BATHROOM': 'Additional Bathroom',
    }
    return names[key] || key
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error) {
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
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/orders" className="btn-primary">
              Back to Orders
            </Link>
          </div>
        </main>
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-2xl font-bold text-primary-900">
            Tidyhood
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/orders" className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>

          {/* Order Header */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Details</h1>
                <p className="text-gray-600">Order ID: {order.id}</p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                Placed on {formatDateTime(order.created_at)}
              </p>
            </div>
          </div>

          {/* Service Details */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Service Details</h2>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-600">Service Type</span>
                <p className="text-lg text-gray-900">{order.service_type}</p>
              </div>

              {order.service_type === 'LAUNDRY' && order.order_details.lbs && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Weight</span>
                  <p className="text-lg text-gray-900">{order.order_details.lbs} lbs</p>
                </div>
              )}

              {order.service_type === 'CLEANING' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Bedrooms</span>
                      <p className="text-lg text-gray-900">
                        {order.order_details.bedrooms === 0 ? 'Studio' : `${order.order_details.bedrooms} BR`}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Bathrooms</span>
                      <p className="text-lg text-gray-900">{order.order_details.bathrooms} BA</p>
                    </div>
                  </div>
                  {order.order_details.deep && (
                    <div>
                      <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                        Deep Cleaning
                      </span>
                    </div>
                  )}
                </>
              )}

              {order.order_details.addons && order.order_details.addons.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-600 block mb-2">Add-ons</span>
                  <div className="space-y-1">
                    {order.order_details.addons.map((addon, idx) => (
                      <div key={idx} className="text-gray-900">• {formatAddonName(addon)}</div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <span className="text-sm font-medium text-gray-600">Scheduled For</span>
                <p className="text-lg text-gray-900">{formatDateTime(order.slot_start)}</p>
                <p className="text-sm text-gray-600">
                  Until {new Date(order.slot_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Service Address</h2>
            <div className="space-y-2">
              <p className="text-gray-900">{order.address_snapshot.line1}</p>
              {order.address_snapshot.line2 && (
                <p className="text-gray-900">{order.address_snapshot.line2}</p>
              )}
              <p className="text-gray-900">
                {order.address_snapshot.city}, NY {order.address_snapshot.zip}
              </p>
              {order.address_snapshot.notes && (
                <div className="mt-4 pt-4 border-t">
                  <span className="text-sm font-medium text-gray-600 block mb-1">Special Instructions</span>
                  <p className="text-gray-700">{order.address_snapshot.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pricing</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatMoney(order.subtotal_cents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax (8.875%)</span>
                <span className="text-gray-900">{formatMoney(order.tax_cents)}</span>
              </div>
              {order.delivery_cents > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="text-gray-900">{formatMoney(order.delivery_cents)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between text-xl font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-primary-600">{formatMoney(order.total_cents)}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {order.status === 'PENDING' && (
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="text-center">
                <p className="text-gray-600 mb-4">Your order is pending payment</p>
                <button
                  onClick={() => router.push(`/orders/${order.id}/pay`)}
                  className="btn-primary"
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
