'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Metrics {
  orders: {
    today: number
    yesterday: number
    change: number
    pending: number
  }
  gmv: {
    today: number
    yesterday: number
    change: number
  }
  sla: {
    today: number
    yesterday: number
  }
  partners: {
    active: number
  }
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch('/api/admin/metrics')
        if (!res.ok) throw new Error('Failed to fetch metrics')
        const data = await res.json()
        setMetrics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error || 'Failed to load dashboard'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Orders Today"
          value={metrics.orders.today}
          change={metrics.orders.change}
          subtitle={`${metrics.orders.pending} pending`}
        />
        <MetricCard
          title="GMV Today"
          value={`$${metrics.gmv.today.toFixed(2)}`}
          change={metrics.gmv.change}
          subtitle={`vs $${metrics.gmv.yesterday.toFixed(2)} yesterday`}
        />
        <MetricCard
          title="SLA Adherence"
          value={`${(metrics.sla.today * 100).toFixed(1)}%`}
          change={metrics.sla.today - metrics.sla.yesterday}
          subtitle="On-time delivery rate"
          isPercentage
        />
        <MetricCard
          title="Active Partners"
          value={metrics.partners.active}
          subtitle="Currently active"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/admin/orders"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div>
                <p className="font-medium text-gray-900">View Orders</p>
                <p className="text-sm text-gray-600">
                  {metrics.orders.pending} pending
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            
            <Link
              href="/admin/partners"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div>
                <p className="font-medium text-gray-900">Manage Partners</p>
                <p className="text-sm text-gray-600">
                  {metrics.partners.active} active
                </p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            
            <Link
              href="/admin/settings"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div>
                <p className="font-medium text-gray-900">Settings</p>
                <p className="text-sm text-gray-600">Platform configuration</p>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500">
            Activity feed coming soon. Navigate to Orders to see all orders.
          </p>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  change,
  subtitle,
  isPercentage = false
}: {
  title: string
  value: string | number
  change?: number
  subtitle?: string
  isPercentage?: boolean
}) {
  const changeValue = change || 0
  const isPositive = changeValue > 0
  const isNeutral = changeValue === 0

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
      <div className="flex items-baseline justify-between">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {change !== undefined && (
          <span
            className={`text-sm font-medium ${
              isNeutral
                ? 'text-gray-500'
                : isPositive
                ? 'text-green-600'
                : 'text-red-600'
            }`}
          >
            {isPositive && '+'}
            {isPercentage 
              ? `${(changeValue * 100).toFixed(1)}%`
              : changeValue
            }
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
      )}
    </div>
  )
}
