'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import StatusBadge, { StatusTone } from '@/components/orders/StatusBadge'
import { OrderStatus, STATUS_LABELS, STATUS_COLORS, getStatusLabel } from '@/lib/orderStateMachine'

function getStatusTone(status: string): StatusTone {
  const color = STATUS_COLORS[status as OrderStatus]
  const toneMap: Record<string, StatusTone> = {
    blue: 'blue',
    yellow: 'yellow',
    orange: 'yellow',
    indigo: 'indigo',
    green: 'green',
    red: 'gray',
    gray: 'gray'
  }
  return toneMap[color] || 'gray'
}

function formatStatus(status: string, serviceType: string): string {
  return getStatusLabel(status as OrderStatus, serviceType)
}

interface Order {
  id: string
  user_id?: string
  service_type: string
  status: string
  total_cents: number
  created_at: string
  scheduled_date?: string
  profiles?: {
    id: string
    full_name?: string
    email?: string
    phone?: string
  }
  partners?: {
    name: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0
  })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'all',
    service_type: 'all',
    search: ''
  })

  useEffect(() => {
    fetchOrders()
  }, [filters, pagination.page])

  async function fetchOrders() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.service_type !== 'all' && { service_type: filters.service_type }),
        ...(filters.search && { search: filters.search })
      })

      const res = await fetch(`/api/admin/orders?${params}`)
      if (!res.ok) throw new Error('Failed to fetch orders')
      
      const data = await res.json()
      setOrders(data.orders)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(search: string) {
    setFilters({ ...filters, search })
    setPagination({ ...pagination, page: 1 })
  }

  function handleStatusFilter(status: string) {
    setFilters({ ...filters, status })
    setPagination({ ...pagination, page: 1 })
  }

  function handleServiceFilter(service_type: string) {
    setFilters({ ...filters, service_type })
    setPagination({ ...pagination, page: 1 })
  }

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <div className="flex space-x-2">
          <input
            type="search"
            placeholder="Search orders..."
            value={filters.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <select
            value={filters.status}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="pending_pickup">Pending Pickup</option>
            <option value="at_facility">At Facility</option>
            <option value="awaiting_payment">Awaiting Payment</option>
            <option value="paid_processing">Processing</option>
            <option value="in_progress">In Progress</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="canceled">Canceled</option>
          </select>
          <select
            value={filters.service_type}
            onChange={(e) => handleServiceFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Services</option>
            <option value="laundry">Laundry</option>
            <option value="dry_clean">Dry Clean</option>
            <option value="cleaning">Cleaning</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            {pagination.total} total orders
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>
                        <div className="font-medium">
                          {order.profiles?.full_name || order.profiles?.email || (order.profiles?.id ? `Customer ${order.profiles.id.substring(0, 8)}...` : 'N/A')}
                        </div>
                        {order.profiles?.phone && (
                          <div className="text-xs text-gray-500">{order.profiles.phone}</div>
                        )}
                        {!order.profiles?.phone && order.profiles?.email && (
                          <div className="text-xs text-gray-500">{order.profiles.email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.service_type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge tone={getStatusTone(order.status)}>
                        {formatStatus(order.status, order.service_type)}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${((order.total_cents || 0) / 100).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.pages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
