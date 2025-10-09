import Link from 'next/link'
import { getServiceClient } from '@/lib/db'

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
  users: {
    total: number
    customers: number
    partners: number
    newThisMonth: number
  }
}

async function getMetrics(): Promise<Metrics | null> {
  try {
    const db = getServiceClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Get today's orders
    const { data: todayOrders } = await db
      .from('orders')
      .select('id, total_cents, status')
      .gte('created_at', today.toISOString())
    
    // Get yesterday's orders
    const { data: yesterdayOrders } = await db
      .from('orders')
      .select('id, total_cents')
      .gte('created_at', yesterday.toISOString())
      .lt('created_at', today.toISOString())

    // Get active partners count
    const { count: partnersCount } = await db
      .from('partners')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)

    // Calculate metrics
    const todayOrderCount = todayOrders?.length || 0
    const yesterdayOrderCount = yesterdayOrders?.length || 0
    
    const todayGMV = todayOrders?.reduce((sum, order) => 
      sum + (order.total_cents || 0), 0) || 0
    const yesterdayGMV = yesterdayOrders?.reduce((sum, order) => 
      sum + (order.total_cents || 0), 0) || 0

    // Calculate SLA (simplified - orders delivered vs late)
    const completedToday = todayOrders?.filter(o => 
      ['DELIVERED', 'CLEANED'].includes(o.status)
    ).length || 0
    
    const slaToday = todayOrderCount > 0 ? completedToday / todayOrderCount : 1

    // Get pending orders count
    const { count: pendingCount } = await db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .in('status', ['PENDING', 'PAID', 'RECEIVED', 'IN_PROGRESS', 'READY', 'OUT_FOR_DELIVERY'])

    // Get user statistics
    const { data: allUsers } = await db
      .from('profiles')
      .select('id, role, created_at')

    const totalUsers = allUsers?.length || 0
    const customers = allUsers?.filter(u => u.role === 'customer' || !u.role).length || 0
    const partners = allUsers?.filter(u => u.role === 'partner').length || 0
    
    // Calculate new users this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    
    const newThisMonth = allUsers?.filter(u => 
      new Date(u.created_at) >= startOfMonth
    ).length || 0

    return {
      orders: {
        today: todayOrderCount,
        yesterday: yesterdayOrderCount,
        change: todayOrderCount - yesterdayOrderCount,
        pending: pendingCount || 0
      },
      gmv: {
        today: todayGMV / 100, // Convert to dollars
        yesterday: yesterdayGMV / 100,
        change: (todayGMV - yesterdayGMV) / 100
      },
      sla: {
        today: slaToday,
        yesterday: 0.98 // Placeholder
      },
      partners: {
        active: partnersCount || 0
      },
      users: {
        total: totalUsers,
        customers: customers,
        partners: partners,
        newThisMonth: newThisMonth
      }
    }
  } catch (error) {
    console.error('[AdminDashboard] Error fetching metrics:', error)
    return null
  }
}

export default async function AdminDashboard() {
  const metrics = await getMetrics()

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load dashboard metrics</p>
        <p className="text-sm text-gray-500 mt-2">Please try refreshing the page</p>
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

      {/* User Statistics */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">User Statistics</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{metrics.users.total}</p>
              <p className="text-sm text-gray-600 mt-1">Total Users</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{metrics.users.customers}</p>
              <p className="text-sm text-gray-600 mt-1">Customers</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{metrics.users.partners}</p>
              <p className="text-sm text-gray-600 mt-1">Partners</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{metrics.users.newThisMonth}</p>
              <p className="text-sm text-gray-600 mt-1">New This Month</p>
            </div>
          </div>
        </div>
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
              href="/admin/users"
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div>
                <p className="font-medium text-gray-900">Manage Users</p>
                <p className="text-sm text-gray-600">
                  {metrics.users.total} total
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
