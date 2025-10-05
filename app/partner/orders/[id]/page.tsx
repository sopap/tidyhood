'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { STATUS_LABELS, STATUS_COLORS, TIME_FORMATS, VALID_PARTNER_TRANSITIONS } from '@/lib/partner/constants';
import StatusUpdater from '@/components/partner/StatusUpdater';

interface OrderDetail {
  id: string;
  order_id: string;
  service_type: string;
  status: string;
  total_cents: number;
  created_at: string;
  slot_start: string;
  slot_end: string;
  order_details: any;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null;
  address: {
    street: string;
    unit?: string;
    city: string;
    state: string;
    zip: string;
    instructions?: string;
  } | null;
  pickupSlot: any;
  deliverySlot: any;
  history: Array<{
    id: string;
    action: string;
    created_at: string;
    note?: string;
  }>;
}

export default function PartnerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStatusUpdater, setShowStatusUpdater] = useState(false);

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  async function fetchOrderDetail() {
    try {
      const response = await fetch(`/api/partner/orders/${orderId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch order');
      }
      
      const data = await response.json();
      setOrder(data.order);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', TIME_FORMATS.DATE_DISPLAY);
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', TIME_FORMATS.DATETIME_DISPLAY);
  }

  function getNextStatus(currentStatus: string): string | null {
    const transitions = VALID_PARTNER_TRANSITIONS[currentStatus as keyof typeof VALID_PARTNER_TRANSITIONS];
    return transitions && transitions.length > 0 ? transitions[0] : null;
  }

  function getStatusLabel(status: string): string {
    return STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status;
  }

  function getStatusColor(status: string): string {
    return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800';
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Order</h3>
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

  const nextStatus = getNextStatus(order.status);
  const canTransition = nextStatus !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/partner/orders"
          className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
        >
          ← Back to Orders
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_id}</h1>
            <p className="text-gray-600 mt-1">Created {formatDate(order.created_at)}</p>
          </div>
          <div className="text-right">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ${(order.total_cents / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      {order.customer && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="text-base text-gray-900">{order.customer.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-base text-gray-900">{order.customer.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <a 
                href={`tel:${order.customer.phone}`}
                className="text-base text-blue-600 hover:text-blue-700"
              >
                {order.customer.phone}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Service Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Details</h2>
        
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Service Type</p>
            <p className="text-base text-gray-900 capitalize">{order.service_type}</p>
          </div>

          {order.order_details && (
            <>
              {order.service_type === 'laundry' && (
                <>
                  {order.order_details.weight_lbs && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Weight</p>
                      <p className="text-base text-gray-900">{order.order_details.weight_lbs} lbs</p>
                    </div>
                  )}
                  {order.order_details.bag_count && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Bag Count</p>
                      <p className="text-base text-gray-900">{order.order_details.bag_count}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Has Bedding</p>
                      <p className="text-base text-gray-900">{order.order_details.has_bedding ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Has Delicates</p>
                      <p className="text-base text-gray-900">{order.order_details.has_delicates ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </>
              )}

              {order.service_type === 'cleaning' && (
                <>
                  {order.order_details.estimated_minutes && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Estimated Time</p>
                      <p className="text-base text-gray-900">{order.order_details.estimated_minutes} minutes</p>
                    </div>
                  )}
                  {order.order_details.cleaning_type && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Cleaning Type</p>
                      <p className="text-base text-gray-900 capitalize">{order.order_details.cleaning_type}</p>
                    </div>
                  )}
                  {(order.order_details.bedrooms || order.order_details.bathrooms) && (
                    <div className="grid grid-cols-2 gap-4">
                      {order.order_details.bedrooms && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Bedrooms</p>
                          <p className="text-base text-gray-900">{order.order_details.bedrooms}</p>
                        </div>
                      )}
                      {order.order_details.bathrooms && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Bathrooms</p>
                          <p className="text-base text-gray-900">{order.order_details.bathrooms}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {order.order_details.addons && order.order_details.addons.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-2">Selected Addons</p>
                      <div className="flex flex-wrap gap-2">
                        {order.order_details.addons.map((addon: string) => (
                          <span
                            key={addon}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded"
                          >
                            {addon}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {order.order_details.special_instructions && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Special Instructions</p>
                  <p className="text-base text-gray-900">{order.order_details.special_instructions}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Address & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Address */}
        {order.address && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Address</h2>
            <div className="space-y-2">
              <p className="text-base text-gray-900">{order.address.street}</p>
              {order.address.unit && (
                <p className="text-base text-gray-900">Unit {order.address.unit}</p>
              )}
              <p className="text-base text-gray-900">
                {order.address.city}, {order.address.state} {order.address.zip}
              </p>
              {order.address.instructions && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm font-medium text-gray-500">Access Instructions</p>
                  <p className="text-sm text-gray-700 mt-1">{order.address.instructions}</p>
                </div>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  `${order.address.street}, ${order.address.city}, ${order.address.state} ${order.address.zip}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View on Map →
              </a>
            </div>
          </div>
        )}

        {/* Schedule */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Schedule</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Pickup</p>
              <p className="text-base text-gray-900">
                {formatDateTime(order.slot_start)}
              </p>
            </div>
            {order.slot_end && (
              <div>
                <p className="text-sm font-medium text-gray-500">Delivery</p>
                <p className="text-base text-gray-900">
                  {formatDateTime(order.slot_end)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Order History */}
      {order.history && order.history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order History</h2>
          <div className="space-y-3">
            {order.history.map((event) => (
              <div key={event.id} className="flex items-start space-x-3 text-sm">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 capitalize">{event.action.replace(/_/g, ' ')}</p>
                  <p className="text-gray-600">{formatDateTime(event.created_at)}</p>
                  {event.note && <p className="text-gray-700 mt-1">{event.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {canTransition && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {order.status === 'pending_quote' && (
              <button
                onClick={() => router.push(`/partner/orders/${orderId}/quote`)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Submit Quote
              </button>
            )}
            
            {nextStatus && order.status !== 'pending_quote' && (
              <button
                onClick={() => setShowStatusUpdater(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                Mark as {getStatusLabel(nextStatus)}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status Updater Modal */}
      {showStatusUpdater && nextStatus && (
        <StatusUpdater
          orderId={orderId}
          orderDisplayId={order.order_id}
          currentStatus={order.status}
          nextStatus={nextStatus}
          onSuccess={() => {
            setShowStatusUpdater(false);
            fetchOrderDetail(); // Refresh order data
          }}
          onClose={() => setShowStatusUpdater(false)}
        />
      )}
    </div>
  );
}
