'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { useAuth } from '@/lib/auth-context'

// Mock data for demonstration
const mockOrders = [
  {
    id: 'ORD-001',
    service: 'Laundry',
    status: 'in_progress',
    date: '2025-01-05',
    total: 32.24,
    pickup: '9:00 AM - 11:00 AM'
  },
  {
    id: 'ORD-002',
    service: 'Cleaning',
    status: 'completed',
    date: '2025-01-03',
    total: 149.00,
    pickup: '1:00 PM - 3:00 PM'
  }
]

function OrdersContent() {
  const { user, signOut } = useAuth()
  const [orders] = useState(mockOrders)
  
  const handleLogout = async () => {
    await signOut()
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    
    const labels = {
      pending: 'Pending',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-primary-900">
              Tidyhood
            </Link>
            <nav className="space-x-4">
              <Link href="/services" className="text-gray-600 hover:text-primary-600">
                Book Service
              </Link>
              <Link href="/orders" className="text-primary-600 font-medium">
                My Orders
              </Link>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {user?.email}
                </span>
                <button 
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-primary-600"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
            <Link href="/services" className="btn-primary">
              Book New Service
            </Link>
          </div>

          {orders.length === 0 ? (
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
                          {order.service} Service
                        </h3>
                        {getStatusBadge(order.status)}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Order ID:</span> {order.id}
                        </p>
                        <p>
                          <span className="font-medium">Date:</span> {new Date(order.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p>
                          <span className="font-medium">Time Slot:</span> {order.pickup}
                        </p>
                        <p className="text-lg font-bold text-primary-600 mt-2">
                          Total: ${order.total.toFixed(2)}
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
                      {order.status === 'completed' && (
                        <button className="btn-primary text-sm">
                          Reorder
                        </button>
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
