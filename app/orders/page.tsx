'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/Header'

function OrdersContent() {
  const { user, signOut } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [recurringPlans, setRecurringPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
    fetchRecurringPlans()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/orders')
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const data = await response.json()
      setOrders(data.orders || [])
    } catch (err: any) {
      console.error('Error fetching orders:', err)
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const fetchRecurringPlans = async () => {
    try {
      if (!user?.id) return
      const response = await fetch(`/api/recurring/plan?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setRecurringPlans(data.plans || [])
      }
    } catch (err) {
      console.error('Error fetching recurring plans:', err)
    }
  }

  const handlePauseResume = async (planId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/recurring/plan/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentStatus })
      })
      
      if (response.ok) {
        fetchRecurringPlans() // Refresh
      }
    } catch (err) {
      console.error('Error updating plan:', err)
    }
  }
  
  const handleLogout = async () => {
    await signOut()
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      pending_pickup: 'bg-blue-100 text-blue-800',
      at_facility: 'bg-indigo-100 text-indigo-800',
      awaiting_payment: 'bg-yellow-100 text-yellow-800',
      paid_processing: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800'
    }
    
    const labels: Record<string, string> = {
      pending: 'Pending',
      pending_pickup: 'Pickup Scheduled',
      at_facility: 'At Facility',
      awaiting_payment: 'Awaiting Payment',
      paid_processing: 'Processing',
      completed: 'Completed',
      canceled: 'Canceled'
    }

    const statusKey = status.toLowerCase()
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[statusKey] || 'bg-gray-100 text-gray-800'}`}>
        {labels[statusKey] || status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <Link href="/services" className="btn-primary">
              Book New Service
            </Link>
          </div>

          {/* Recurring Plans Section */}
          {recurringPlans.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Recurring Plans</h2>
              <div className="space-y-4">
                {recurringPlans.map((plan) => (
                  <div key={plan.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-md p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {plan.frequency.charAt(0) + plan.frequency.slice(1).toLowerCase()} Cleaning
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            plan.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {plan.active ? 'Active' : 'Paused'}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-600 text-white">
                            {plan.discount_pct * 100}% off visits 2+
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-700">
                          <p>
                            <span className="font-medium">Visits Completed:</span> {plan.visits_completed}
                          </p>
                          {plan.next_date && (
                            <p>
                              <span className="font-medium">Next Scheduled:</span>{' '}
                              {new Date(plan.next_date).toLocaleDateString('en-US', { 
                                weekday: 'long', 
                                month: 'long', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          )}
                          {plan.first_visit_deep && plan.visits_completed === 0 && (
                            <p className="text-blue-700 font-medium">
                              ✨ First visit will be deep clean at regular rate
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Link
                          href={`/orders/recurring/${plan.id}`}
                          className="btn-secondary text-sm whitespace-nowrap"
                        >
                          Manage Plan
                        </Link>
                        <button
                          onClick={() => handlePauseResume(plan.id, plan.active)}
                          className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
                            plan.active
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {plan.active ? 'Pause' : 'Resume'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            // Loading State
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your orders...</p>
            </div>
          ) : error ? (
            // Error State
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Orders</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button onClick={fetchOrders} className="btn-primary">
                Try Again
              </button>
            </div>
          ) : orders.length === 0 ? (
            // Empty State
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No orders yet</h2>
              <p className="text-gray-600 mb-6">
                Start by booking your first laundry or cleaning service
              </p>
              <Link href="/services" className="btn-primary">
                Browse Services
              </Link>
            </div>
          ) : (
            // Orders List
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {order.service_type === 'LAUNDRY' ? 'Laundry' : 'Cleaning'} Service
                        </h3>
                        {getStatusBadge(order.status)}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Order ID:</span> {order.id.slice(0, 8)}
                        </p>
                        <p>
                          <span className="font-medium">Date:</span> {new Date(order.slot_start).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p>
                          <span className="font-medium">Time Slot:</span> {new Date(order.slot_start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })} - {new Date(order.slot_end).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                        <p className="text-lg font-bold text-primary-600 mt-2">
                          Total: ${((order.quote_cents || order.total_cents) / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Link
                        href={`/orders/${order.id}`}
                        className="btn-secondary text-sm"
                      >
                        View Details
                      </Link>
                      {order.status === 'awaiting_payment' && (
                        <Link
                          href={`/orders/${order.id}/pay`}
                          className="btn-primary text-sm"
                        >
                          Pay Now
                        </Link>
                      )}
                      {order.status === 'completed' && (
                        <Link
                          href={`/book/${order.service_type.toLowerCase()}`}
                          className="btn-primary text-sm"
                        >
                          Reorder
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Help Section */}
          <div className="mt-12 bg-primary-50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-gray-600 mb-4">
              Have questions about your order? We're here to help!
            </p>
            <div className="flex gap-4">
              <a href="mailto:support@tidyhood.com" className="text-primary-600 hover:text-primary-700 font-medium">
                Email Support
              </a>
              <span className="text-gray-300">|</span>
              <a href="tel:+1234567890" className="text-primary-600 hover:text-primary-700 font-medium">
                Call Us
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-24 py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2025 Tidyhood. Supporting Harlem businesses.
          </p>
          <div className="mt-4 space-x-4">
            <Link href="/terms" className="text-gray-400 hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="text-gray-400 hover:text-white">
              Privacy
            </Link>
            <a href="mailto:support@tidyhood.com" className="text-gray-400 hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <ProtectedRoute>
      <OrdersContent />
    </ProtectedRoute>
  )
}
