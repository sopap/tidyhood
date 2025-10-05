'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth-context'
import { Header } from '@/components/Header'
import { Order } from '@/lib/types'
import { groupOrders } from '@/lib/orders'
import Section from '@/components/orders/Section'
import StickyActions from '@/components/orders/StickyActions'
import EmptyState from '@/components/orders/EmptyState'

function OrdersContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
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

  const handleOpenOrder = (id: string) => {
    router.push(`/orders/${id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your orders...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Orders</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button onClick={fetchOrders} className="btn-primary">
                Try Again
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const grouped = groupOrders(orders)
  const hasOrders = orders.length > 0

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      <Header />

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-gray-900">My Orders</h1>
            <Link 
              href="/services" 
              className="hidden md:inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Book New Service
            </Link>
          </div>

          {/* Recurring Plans Section */}
          {recurringPlans.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Active Recurring Plans</h2>
              <div className="space-y-3">
                {recurringPlans.map((plan) => (
                  <div key={plan.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg shadow-sm p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-base font-bold text-gray-900">
                            {plan.frequency.charAt(0) + plan.frequency.slice(1).toLowerCase()} Cleaning
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            plan.active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {plan.active ? 'Active' : 'Paused'}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                            {plan.discount_pct * 100}% off visits 2+
                          </span>
                        </div>
                        
                        <div className="space-y-0.5 text-sm text-gray-700">
                          <p>
                            <span className="font-medium">Visits:</span> {plan.visits_completed}
                          </p>
                          {plan.next_date && (
                            <p>
                              <span className="font-medium">Next:</span>{' '}
                              {new Date(plan.next_date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 ml-3 shrink-0">
                        <Link
                          href={`/orders/recurring/${plan.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 bg-white font-medium text-blue-700 hover:bg-blue-50 transition-colors whitespace-nowrap"
                        >
                          Manage
                        </Link>
                        <button
                          onClick={() => handlePauseResume(plan.id, plan.active)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
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

          {/* Orders Sections */}
          {!hasOrders ? (
            <EmptyState />
          ) : (
            <>
              <Section
                title="Upcoming Pickups"
                orders={grouped.upcoming}
                initialCount={3}
                emptyHint="No upcoming pickups scheduled."
                onOpen={handleOpenOrder}
              />
              
              <Section
                title="In Progress"
                orders={grouped.inProgress}
                initialCount={3}
                emptyHint="No orders currently in progress."
                onOpen={handleOpenOrder}
              />
              
              <Section
                title="Completed"
                orders={grouped.completed}
                initialCount={4}
                emptyHint="No recent completed orders."
                onOpen={handleOpenOrder}
              />
              
              <Section
                title="Past Orders"
                orders={grouped.past}
                initialCount={5}
                collapsed
                emptyHint="No older orders."
                onOpen={handleOpenOrder}
              />
            </>
          )}

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 rounded-lg p-4 md:p-6">
            <h3 className="text-base font-bold text-gray-900 mb-1">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-3">
              Have questions about your order? We're here to help!
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <a href="mailto:support@tidyhood.com" className="text-blue-600 hover:text-blue-700 font-medium">
                Email Support
              </a>
              <span className="text-gray-300">|</span>
              <a href="tel:+1234567890" className="text-blue-600 hover:text-blue-700 font-medium">
                Call Us
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky CTA */}
      <StickyActions />
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
