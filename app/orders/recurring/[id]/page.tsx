'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Header } from '@/components/Header'
import { Toast } from '@/components/Toast'

function RecurringPlanContent() {
  const params = useParams()
  const router = useRouter()
  const planId = params.id as string

  const [plan, setPlan] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  // Edit states
  const [frequency, setFrequency] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  useEffect(() => {
    fetchPlan()
    fetchPlanOrders()
  }, [planId])

  const fetchPlan = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/recurring/plan/${planId}`)
      if (response.ok) {
        const data = await response.json()
        setPlan(data.plan)
        setFrequency(data.plan.frequency)
      } else {
        setToast({ message: 'Plan not found', type: 'error' })
      }
    } catch (err) {
      console.error('Error fetching plan:', err)
      setToast({ message: 'Failed to load plan', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const fetchPlanOrders = async () => {
    try {
      // Fetch orders associated with this subscription
      const response = await fetch(`/api/orders`)
      if (response.ok) {
        const data = await response.json()
        const planOrders = data.orders.filter((o: any) => o.subscription_id === planId)
        setOrders(planOrders)
      }
    } catch (err) {
      console.error('Error fetching orders:', err)
    }
  }

  const handleSaveChanges = async () => {
    try {
      setSaving(true)
      const response = await fetch(`/api/recurring/plan/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency })
      })

      if (response.ok) {
        setToast({ message: 'Plan updated successfully!', type: 'success' })
        fetchPlan()
        setIsEditing(false)
      } else {
        throw new Error('Failed to update plan')
      }
    } catch (err) {
      setToast({ message: 'Failed to update plan', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handlePauseResume = async () => {
    try {
      const response = await fetch(`/api/recurring/plan/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !plan.active })
      })

      if (response.ok) {
        setToast({ 
          message: plan.active ? 'Plan paused successfully' : 'Plan resumed successfully', 
          type: 'success' 
        })
        fetchPlan()
      }
    } catch (err) {
      setToast({ message: 'Failed to update plan status', type: 'error' })
    }
  }

  const handleCancelPlan = async () => {
    try {
      const response = await fetch(`/api/recurring/plan/${planId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setToast({ message: 'Plan canceled successfully', type: 'success' })
        setTimeout(() => router.push('/orders'), 2000)
      } else {
        throw new Error('Failed to cancel plan')
      }
    } catch (err) {
      setToast({ message: 'Failed to cancel plan', type: 'error' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading plan details...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Plan Not Found</h2>
              <p className="text-gray-600 mb-6">This recurring plan doesn't exist or has been deleted.</p>
              <Link href="/orders" className="btn-primary">
                Back to Orders
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const frequencyLabel = plan.frequency.charAt(0) + plan.frequency.slice(1).toLowerCase()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link href="/orders" className="text-primary-600 hover:text-primary-700 flex items-center gap-2 mb-4">
              ← Back to Orders
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Manage Recurring Plan</h1>
          </div>

          {/* Plan Details Card */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {frequencyLabel} Cleaning Plan
                </h2>
                <div className="flex items-center gap-2">
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
              </div>
              <button
                onClick={handlePauseResume}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  plan.active
                    ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                {plan.active ? 'Pause Plan' : 'Resume Plan'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Visits Completed</h3>
                <p className="text-2xl font-bold text-gray-900">{plan.visits_completed}</p>
              </div>
              {plan.next_date && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Next Scheduled</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(plan.next_date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Frequency Editor */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Plan Settings</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                  >
                    Edit Frequency
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cleaning Frequency
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="input-field"
                    >
                      <option value="WEEKLY">Weekly (20% off visits 2+)</option>
                      <option value="BIWEEKLY">Bi-weekly (15% off visits 2+)</option>
                      <option value="MONTHLY">Monthly (10% off visits 2+)</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveChanges}
                      disabled={saving}
                      className="btn-primary"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setFrequency(plan.frequency)
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Frequency:</span> {frequencyLabel}
                  </p>
                  {plan.first_visit_deep && (
                    <p className="text-blue-700 font-medium">
                      ✨ First visit is deep clean at regular rate
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Visit History */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Visit History</h3>
            {orders.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No visits yet</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order, index) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">
                        Visit #{index + 1}
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.slot_start).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${((order.quote_cents || order.total_cents) / 100).toFixed(2)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cancel Plan */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-red-900 mb-2">Cancel Plan</h3>
            <p className="text-sm text-red-700 mb-4">
              Once canceled, you'll need to create a new plan to resume recurring cleanings.
              Your visit history will be preserved.
            </p>
            {!showCancelConfirm ? (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
              >
                Cancel This Plan
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelPlan}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Confirm Cancellation
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Never Mind
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default function RecurringPlanPage() {
  return (
    <ProtectedRoute>
      <RecurringPlanContent />
    </ProtectedRoute>
  )
}
