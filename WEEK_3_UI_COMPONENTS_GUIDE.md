# Week 3: UI Components Implementation Guide

## Overview
Refactor UI components to use the unified state machine for consistent order status handling, actions, and progress tracking.

---

## Day 1-2: Orders List Page Refactor

### Component: app/orders/page.tsx

**Current Issues:**
- Hardcoded status logic
- Inconsistent status display
- No state machine integration
- Limited filtering options

**Implementation:**

```tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getStatusLabel, 
  getStatusColor, 
  getAvailableActions,
  getStatusSection 
} from '@/lib/orderStateMachine'
import type { Order } from '@/lib/types'

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    service_type: '',
    from_date: '',
    to_date: ''
  })
  const [pagination, setPagination] = useState({
    cursor: null as string | null,
    hasMore: false,
    total: 0
  })

  // Fetch orders with filters
  const fetchOrders = async (cursor?: string | null) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '20',
        ...(cursor && { cursor }),
        ...(filters.status && { status: filters.status }),
        ...(filters.service_type && { service_type: filters.service_type }),
        ...(filters.from_date && { from_date: filters.from_date }),
        ...(filters.to_date && { to_date: filters.to_date })
      })

      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()

      setOrders(cursor ? [...orders, ...data.orders] : data.orders)
      setPagination({
        cursor: data.pagination.nextCursor,
        hasMore: data.pagination.hasMore,
        total: data.pagination.total
      })
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [filters])

  // Group orders by section using state machine
  const groupedOrders = orders.reduce((acc, order) => {
    const section = getStatusSection(order.status)
    if (!acc[section]) acc[section] = []
    acc[section].push(order)
    return acc
  }, {} as Record<string, Order[]>)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-4 py-2 border rounded"
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="picked_up">Picked Up</option>
          <option value="at_facility">At Facility</option>
          <option value="awaiting_payment">Awaiting Payment</option>
          <option value="processing">Processing</option>
          <option value="out_for_delivery">Out for Delivery</option>
          <option value="delivered">Delivered</option>
          <option value="cleaned">Cleaned</option>
        </select>

        <select
          value={filters.service_type}
          onChange={(e) => setFilters({ ...filters, service_type: e.target.value })}
          className="px-4 py-2 border rounded"
        >
          <option value="">All Services</option>
          <option value="LAUNDRY">Laundry</option>
          <option value="CLEANING">Cleaning</option>
        </select>
      </div>

      {/* Orders by section */}
      {['upcoming', 'in_progress', 'completed'].map(section => (
        groupedOrders[section]?.length > 0 && (
          <div key={section} className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 capitalize">
              {section.replace('_', ' ')}
            </h2>
            <div className="grid gap-4">
              {groupedOrders[section].map(order => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          </div>
        )
      ))}

      {/* Load more */}
      {pagination.hasMore && (
        <button
          onClick={() => fetchOrders(pagination.cursor)}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const router = useRouter()
  const statusColor = getStatusColor(order.status)
  const statusLabel = getStatusLabel(order.status)
  const actions = getAvailableActions(order.status, order.service_type, order)

  return (
    <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {order.service_type === 'LAUNDRY' ? '🧺 Laundry' : '🧹 Cleaning'}
          </h3>
          <p className="text-gray-600">Order #{order.id.slice(0, 8)}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        <p>📅 {new Date(order.slot_start).toLocaleDateString()}</p>
        <p>💰 ${(order.total_cents / 100).toFixed(2)}</p>
      </div>

      <div className="flex gap-2">
        {actions.includes('view') && (
          <button
            onClick={() => router.push(`/orders/${order.id}`)}
            className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
          >
            View Details
          </button>
        )}
        {actions.includes('pay_quote') && (
          <button
            onClick={() => router.push(`/orders/${order.id}/pay`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Pay Now
          </button>
        )}
        {actions.includes('cancel') && (
          <button
            onClick={() => handleCancel(order.id)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

async function handleCancel(orderId: string) {
  if (!confirm('Are you sure you want to cancel this order?')) return

  try {
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Customer requested cancellation' })
    })

    if (res.ok) {
      window.location.reload()
    } else {
      const error = await res.json()
      alert(error.error)
    }
  } catch (error) {
    alert('Failed to cancel order')
  }
}
```

---

## Day 3: Order Detail Page Enhancement

### Component: components/orders/ActionButtons.tsx

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAvailableActions, canTransition } from '@/lib/orderStateMachine'
import type { Order } from '@/lib/types'

interface ActionButtonsProps {
  order: Order
}

export function ActionButtons({ order }: ActionButtonsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const actions = getAvailableActions(order.status, order.service_type, order)

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer requested cancellation' })
      })

      if (res.ok) {
        router.refresh()
      } else {
        const error = await res.json()
        alert(error.error)
      }
    } catch (error) {
      alert('Failed to cancel order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-3">
      {actions.includes('pay_quote') && (
        <button
          onClick={() => router.push(`/orders/${order.id}/pay`)}
          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Pay ${((order.quote_cents || order.total_cents) / 100).toFixed(2)}
        </button>
      )}
      
      {actions.includes('cancel') && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-6 py-3 border-2 border-red-600 text-red-600 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50"
        >
          {loading ? 'Cancelling...' : 'Cancel Order'}
        </button>
      )}
      
      {actions.includes('rate') && (
        <button
          onClick={() => router.push(`/orders/${order.id}/rate`)}
          className="flex-1 bg-yellow-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-yellow-600"
        >
          ⭐ Rate Service
        </button>
      )}
    </div>
  )
}
```

---

## Day 4: Status Badge Component

### Component: components/orders/StatusBadge.tsx

```tsx
import { getStatusLabel, getStatusColor } from '@/lib/orderStateMachine'
import type { OrderStatus } from '@/lib/orderStateMachine'

interface StatusBadgeProps {
  status: OrderStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function StatusBadge({ 
  status, 
  size = 'md',
  showIcon = true 
}: StatusBadgeProps) {
  const label = getStatusLabel(status)
  const color = getStatusColor(status)
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }
  
  const icon = getStatusIcon(status)
  
  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full font-medium ${color} ${sizeClasses[size]}`}
      title={getStatusDescription(status)}
    >
      {showIcon && <span>{icon}</span>}
      {label}
    </span>
  )
}

function getStatusIcon(status: OrderStatus): string {
  const icons: Record<OrderStatus, string> = {
    scheduled: '📅',
    picked_up: '📦',
    at_facility: '🏭',
    quote_sent: '💵',
    awaiting_payment: '⏳',
    processing: '⚙️',
    out_for_delivery: '🚚',
    delivered: '✅',
    cleaned: '✨',
    canceled: '❌'
  }
  return icons[status] || '📋'
}

function getStatusDescription(status: OrderStatus): string {
  const descriptions: Record<OrderStatus, string> = {
    scheduled: 'Order scheduled for pickup',
    picked_up: 'Items have been picked up',
    at_facility: 'Items at our facility',
    quote_sent: 'Quote sent, awaiting approval',
    awaiting_payment: 'Payment required to proceed',
    processing: 'Order being processed',
    out_for_delivery: 'Out for delivery',
    delivered: 'Order delivered',
    cleaned: 'Cleaning completed',
    canceled: 'Order canceled'
  }
  return descriptions[status] || status
}
```

---

## Day 5: Testing & Polish

### Test: __tests__/orders-ui.spec.tsx

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { StatusBadge } from '@/components/orders/StatusBadge'
import { ActionButtons } from '@/components/orders/ActionButtons'

describe('StatusBadge', () => {
  it('renders correct label for each status', () => {
    const { rerender } = render(<StatusBadge status="scheduled" />)
    expect(screen.getByText('Scheduled')).toBeInTheDocument()
    
    rerender(<StatusBadge status="processing" />)
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })
  
  it('applies correct color classes', () => {
    const { container } = render(<StatusBadge status="delivered" />)
    expect(container.firstChild).toHaveClass('bg-green-100', 'text-green-800')
  })
  
  it('shows icon when showIcon is true', () => {
    render(<StatusBadge status="scheduled" showIcon={true} />)
    expect(screen.getByText('📅')).toBeInTheDocument()
  })
})

describe('ActionButtons', () => {
  const mockOrder = {
    id: '123',
    status: 'scheduled' as const,
    service_type: 'LAUNDRY' as const,
    total_cents: 5000
  }
  
  it('shows cancel button for cancellable orders', () => {
    render(<ActionButtons order={mockOrder} />)
    expect(screen.getByText('Cancel Order')).toBeInTheDocument()
  })
  
  it('shows pay button for awaiting_payment status', () => {
    render(<ActionButtons order={{ ...mockOrder, status: 'awaiting_payment', quote_cents: 6000 }} />)
    expect(screen.getByText(/Pay \$60.00/)).toBeInTheDocument()
  })
  
  it('handles cancel with confirmation', async () => {
    global.confirm = jest.fn(() => true)
    global.fetch = jest.fn(() => Promise.resolve({ ok: true })) as any
    
    render(<ActionButtons order={mockOrder} />)
    fireEvent.click(screen.getByText('Cancel Order'))
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/orders/123/cancel',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
```

---

## Implementation Checklist

### Week 3, Day 1-2: Orders List ✅
- [ ] Refactor app/orders/page.tsx to use state machine
- [ ] Add filtering UI (status, service_type, dates)
- [ ] Implement cursor-based pagination
- [ ] Use getStatusSection() for grouping
- [ ] Use getAvailableActions() for action buttons
- [ ] Add loading states
- [ ] Handle errors gracefully

### Week 3, Day 3: Order Detail ✅
- [ ] Create ActionButtons component
- [ ] Integrate with canTransition()
- [ ] Add cancel functionality
- [ ] Add payment redirect
- [ ] Show contextual actions based on status
- [ ] Add confirmation dialogs

### Week 3, Day 4: Status Badge ✅
- [ ] Create StatusBadge component
- [ ] Use getStatusColor() for colors
- [ ] Use getStatusLabel() for text
- [ ] Add icons for visual clarity
- [ ] Add tooltips with descriptions
- [ ] Support different sizes
- [ ] Accessibility improvements (ARIA)

### Week 3, Day 5: Testing ✅
- [ ] Write component unit tests
- [ ] Test state machine integration
- [ ] Test action button logic
- [ ] Test error handling
- [ ] Visual regression tests
- [ ] Accessibility audit

---

## Success Criteria

✅ All UI components use state machine for status handling
✅ No hardcoded status logic in components
✅ Consistent status display across app
✅ Contextual actions based on state machine rules
✅ >90% test coverage for new components
✅ Accessible (WCAG 2.1 AA)
✅ Production build passes
✅ No TypeScript errors

---

## Next: Week 4 - Webhooks & Analytics
