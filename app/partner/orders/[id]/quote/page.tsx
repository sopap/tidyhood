'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import QuoteForm from '@/components/partner/QuoteForm';
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/partner/constants';

interface OrderSummary {
  id: string;
  order_id: string;
  service_type: string;
  status: string;
  total_cents: number;
  slot_start: string;
  order_details: any;
  customer: {
    name: string;
    email: string;
  } | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  } | null;
}

export default function QuoteSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  async function fetchOrderDetails() {
    try {
      const response = await fetch(`/api/partner/orders/${orderId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch order');
      }

      const data = await response.json();
      
      // Verify order is pending quote
      if (data.order.status !== 'pending_quote') {
        throw new Error('This order does not require a quote');
      }

      setOrder(data.order);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  function handleSuccess() {
    // Redirect to order detail page
    router.push(`/partner/orders/${orderId}`);
  }

  function handleCancel() {
    // Go back to order detail
    router.push(`/partner/orders/${orderId}`);
  }

  function getStatusLabel(status: string): string {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  }

  function getStatusColor(status: string): string {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error</h3>
        <p className="text-red-700 mb-4">{error || 'Order not found'}</p>
        <Link
          href="/partner/orders"
          className="text-red-600 hover:text-red-700 font-medium"
        >
          ← Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/partner/orders/${orderId}`}
          className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
        >
          ← Back to Order
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Submit Quote</h1>
        <p className="text-gray-600 mt-1">Order #{order.order_id}</p>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Service Type</p>
              <p className="text-base text-gray-900 capitalize">{order.service_type}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Pickup Time</p>
              <p className="text-base text-gray-900">{formatDateTime(order.slot_start)}</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-3">
            {order.customer && (
              <div>
                <p className="text-sm font-medium text-gray-500">Customer</p>
                <p className="text-base text-gray-900">{order.customer.name}</p>
                <p className="text-sm text-gray-600">{order.customer.email}</p>
              </div>
            )}

            {order.address && (
              <div>
                <p className="text-sm font-medium text-gray-500">Address</p>
                <p className="text-base text-gray-900">{order.address.street}</p>
                <p className="text-sm text-gray-600">
                  {order.address.city}, {order.address.state} {order.address.zip}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Service Details */}
        {order.order_details && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium text-gray-500 mb-2">Service Details</p>
            
            {order.service_type === 'laundry' && (
              <div className="text-sm text-gray-700 space-y-1">
                {order.order_details.has_bedding && (
                  <p>• Includes bedding</p>
                )}
                {order.order_details.has_delicates && (
                  <p>• Includes delicates</p>
                )}
                {order.order_details.special_instructions && (
                  <p className="mt-2">
                    <span className="font-medium">Special Instructions:</span><br />
                    {order.order_details.special_instructions}
                  </p>
                )}
              </div>
            )}

            {order.service_type === 'cleaning' && (
              <div className="text-sm text-gray-700 space-y-1">
                {order.order_details.cleaning_type && (
                  <p>• Type: <span className="capitalize">{order.order_details.cleaning_type}</span></p>
                )}
                {order.order_details.bedrooms && (
                  <p>• Bedrooms: {order.order_details.bedrooms}</p>
                )}
                {order.order_details.bathrooms && (
                  <p>• Bathrooms: {order.order_details.bathrooms}</p>
                )}
                {order.order_details.addons && order.order_details.addons.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Customer Selected Addons:</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {order.order_details.addons.map((addon: string) => (
                        <span
                          key={addon}
                          className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded"
                        >
                          {addon}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {order.order_details.special_instructions && (
                  <p className="mt-2">
                    <span className="font-medium">Special Instructions:</span><br />
                    {order.order_details.special_instructions}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quote Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Quote Details</h2>
        <QuoteForm
          orderId={orderId}
          serviceType={order.service_type as 'laundry' | 'cleaning'}
          orderDetails={order.order_details}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
}
