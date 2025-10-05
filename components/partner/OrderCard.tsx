'use client';

import Link from 'next/link';
import { STATUS_LABELS, STATUS_COLORS, TIME_FORMATS } from '@/lib/partner/constants';

interface OrderCardProps {
  order: {
    id: string;
    order_id: string;
    service_type: string;
    status: string;
    total_cents: number;
    slot_start: string;
    created_at: string;
    customer_name?: string;
  };
  showActions?: boolean;
  compact?: boolean;
  onActionClick?: (orderId: string, action: string) => void;
}

export default function OrderCard({
  order,
  showActions = false,
  compact = false,
  onActionClick
}: OrderCardProps) {
  function getStatusLabel(status: string): string {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  }

  function getStatusColor(status: string): string {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', TIME_FORMATS.DATETIME_DISPLAY);
  }

  function getServiceIcon(serviceType: string) {
    switch (serviceType) {
      case 'laundry':
        return '👕';
      case 'cleaning':
        return '🧹';
      case 'dryclean':
        return '👔';
      default:
        return '📦';
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow hover:shadow-md transition ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getServiceIcon(order.service_type)}</span>
          <div>
            <Link
              href={`/partner/orders/${order.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-blue-600"
            >
              #{order.order_id}
            </Link>
            {order.customer_name && (
              <p className="text-sm text-gray-600">{order.customer_name}</p>
            )}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
          {getStatusLabel(order.status)}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Service</span>
          <span className="text-gray-900 font-medium capitalize">{order.service_type}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Pickup</span>
          <span className="text-gray-900 font-medium">{formatDateTime(order.slot_start)}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Total</span>
          <span className="text-gray-900 font-bold text-lg">
            ${(order.total_cents / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t">
        <Link
          href={`/partner/orders/${order.id}`}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View Details →
        </Link>
        
        {showActions && (
          <div className="flex space-x-2">
            {order.status === 'pending_quote' && (
              <button
                onClick={() => onActionClick?.(order.id, 'quote')}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700"
              >
                Submit Quote
              </button>
            )}
            
            {(order.status === 'in_progress' || order.status === 'out_for_delivery') && (
              <button
                onClick={() => onActionClick?.(order.id, 'status_update')}
                className="px-3 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700"
              >
                Update Status
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
