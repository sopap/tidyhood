'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StatusBadge, { StatusTone } from '@/components/orders/StatusBadge'

interface Order {
  id: string
  service_type: string
  status: string
  total_amount_cents: number
  quote_cents?: number
  created_at: string
  updated_at: string
  scheduled_date?: string
  slot_start?: string
  slot_end?: string
  estimated_weight_lbs?: number
  actual_weight_lbs?: number
  address_snapshot?: any
  profiles?: {
    id: string
    email: string
    phone?: string
    full_name?: string
  }
  partners?: {
    id: string
    name: string
    email: string
  }
  payment_intent_id?: string
  notes?: string
}

function getStatusTone(status: string): StatusTone {
  const toneMap: Record<string, StatusTone> = {
    draft: 'gray',
    pending: 'blue',
    scheduled: 'blue',
    pending_pickup: 'indigo',
    picked_up: 'indigo',
    at_facility: 'indigo',
    awaiting_payment: 'yellow',
    quote_sent: 'yellow',
    paid_processing: 'indigo',
    processing: 'indigo',
    in_progress: 'indigo',
    ready: 'green',
    out_for_delivery: 'green',
    delivered: 'green',
    completed: 'green',
    cleaned: 'green',
    cancelled: 'gray',
    canceled: 'gray',
    refunded: 'gray'
  }
  return toneMap[status] || 'gray'
}

function formatStatus(status: string): string {
  return status.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [internalNote, setInternalNote] = useState('')

  useEffect(() => {
    fetchOrder()
  }, [id])

  async function fetchOrder() {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/orders?id=${id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch order')
      }

      const data = await response.json()
      if (data.orders && data.orders.length > 0) {
        setOrder(data.orders[0])
        setNewStatus(data.orders[0].status)
      } else {
        setError('Order not found')
      }
    } catch (err: any) {
      console.error('Error fetching order:', err)
      setError(err.message || 'Failed to load order')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange() {
    if (!newStatus || newStatus === order?.status) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/orders/${id}/force-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update status')
      }

      await fetchOrder()
      alert('Status updated successfully')
    } catch (err: any) {
      alert(err.message || 'Failed to update status')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAddNote() {
    if (!internalNote.trim()) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/orders/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: internalNote })
      })

      if (!response.ok) {
        throw new Error('Failed to add note')
      }

      setInternalNote('')
      await fetchOrder()
      alert('Note added successfully')
    } catch (err: any) {
      alert(err.message || 'Failed to add note')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRefund() {
    if (!confirm('Are you sure you want to refund this order? This action cannot be undone.')) {
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/orders/${id}/refund`, {
        method: 'POST'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to refund order')
      }

      await fetchOrder()
      alert('Order refunded successfully')
    } catch (err: any) {
      alert(err.message || 'Failed to refund order')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders" className="text-blue-600 hover:text-blue-700">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Loading...</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders" className="text-blue-600 hover:text-blue-700">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Order Not Found</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">{error || 'Order not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/orders" className="text-blue-600 hover:text-blue-700 text-sm">
            ← Back to Orders
          </Link>
        </div>
        <div>
          <StatusBadge tone={getStatusTone(order.status)}>
            {formatStatus(order.status)}
          </StatusBadge>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">
        Order #{order.id.substring(0, 8)}...
      </h1>

      {/* Main Content - Responsive Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Order Details (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Service Type</p>
                  <p className="font-medium">{order.service_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Scheduled Date</p>
                  <p className="font-medium">
                    {order.scheduled_date 
                      ? new Date(order.scheduled_date).toLocaleDateString()
                      : 'Not scheduled'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time Slot</p>
                  <p className="font-medium">
                    {order.slot_start && order.slot_end
                      ? `${order.slot_start} - ${order.slot_end}`
                      : 'Not specified'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Estimated Amount</p>
                    <p className="text-lg font-semibold text-gray-900">
                      ${((order.total_amount_cents || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                  {order.quote_cents && (
                    <div>
                      <p className="text-sm text-gray-500">Final Quote</p>
                      <p className="text-lg font-semibold text-blue-600">
                        ${(order.quote_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {(order.estimated_weight_lbs || order.actual_weight_lbs) && (
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {order.estimated_weight_lbs && (
                      <div>
                        <p className="text-sm text-gray-500">Estimated Weight</p>
                        <p className="font-medium">{order.estimated_weight_lbs} lbs</p>
                      </div>
                    )}
                    {order.actual_weight_lbs && (
                      <div>
                        <p className="text-sm text-gray-500">Actual Weight</p>
                        <p className="font-medium">{order.actual_weight_lbs} lbs</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{order.profiles?.full_name || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">
                  <a href={`mailto:${order.profiles?.email}`} className="text-blue-600 hover:text-blue-700">
                    {order.profiles?.email}
                  </a>
                </p>
              </div>
              {order.profiles?.phone && (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">
                    <a href={`tel:${order.profiles.phone}`} className="text-blue-600 hover:text-blue-700">
                      {order.profiles.phone}
                    </a>
                  </p>
                </div>
              )}
              {order.profiles?.id && (
                <div className="pt-3 border-t border-gray-200">
                  <Link 
                    href={`/admin/users/${order.profiles.id}`}
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    View Customer Profile →
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Service Address */}
          {order.address_snapshot && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Service Address</h2>
              </div>
              <div className="p-6">
                <p className="font-medium">{order.address_snapshot.line1}</p>
                {order.address_snapshot.line2 && (
                  <p className="text-gray-600">{order.address_snapshot.line2}</p>
                )}
                <p className="text-gray-600">
                  {order.address_snapshot.city}, {order.address_snapshot.state} {order.address_snapshot.zip}
                </p>
                {order.address_snapshot.instructions && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Instructions:</p>
                    <p className="text-sm">{order.address_snapshot.instructions}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Partner Information */}
          {order.partners && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Assigned Partner</h2>
              </div>
              <div className="p-6">
                <p className="font-medium">{order.partners.name}</p>
                <p className="text-sm text-gray-600">
                  <a href={`mailto:${order.partners.email}`} className="text-blue-600 hover:text-blue-700">
                    {order.partners.email}
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Admin Actions (1/3 width on desktop) */}
        <div className="space-y-6">
          {/* Status Change */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Change Status</h2>
            </div>
            <div className="p-6 space-y-4">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                disabled={actionLoading}
              >
                <option value="pending">Pending</option>
                <option value="pending_pickup">Pending Pickup</option>
                <option value="at_facility">At Facility</option>
                <option value="awaiting_payment">Awaiting Payment</option>
                <option value="paid_processing">Paid Processing</option>
                <option value="in_progress">In Progress</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="completed">Completed</option>
                <option value="canceled">Canceled</option>
              </select>
              <button
                onClick={handleStatusChange}
                disabled={actionLoading || newStatus === order.status}
                className="w-full btn-primary text-sm disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Internal Notes</h2>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Add internal note..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                disabled={actionLoading}
              />
              <button
                onClick={handleAddNote}
                disabled={actionLoading || !internalNote.trim()}
                className="w-full btn-secondary text-sm disabled:opacity-50"
              >
                {actionLoading ? 'Adding...' : 'Add Note'}
              </button>
              {order.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Refund Action */}
          {order.payment_intent_id && order.status !== 'refunded' && order.status !== 'canceled' && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Refund</h2>
              </div>
              <div className="p-6">
                <button
                  onClick={handleRefund}
                  disabled={actionLoading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'Processing...' : 'Issue Refund'}
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  This will refund the customer and mark the order as refunded.
                </p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Metadata</h3>
            <div className="space-y-1 text-xs text-gray-600">
              <p>Order ID: {order.id}</p>
              <p>Customer ID: {order.profiles?.id}</p>
              {order.payment_intent_id && (
                <p>Payment ID: {order.payment_intent_id}</p>
              )}
              <p>Last Updated: {new Date(order.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
