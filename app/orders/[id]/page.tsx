'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/Header';
import SummaryBar from '@/components/order/SummaryBar';
import ProgressTracker from '@/components/order/ProgressTracker';
import ServiceAddressCard from '@/components/order/ServiceAddressCard';
import PricingCard from '@/components/order/PricingCard';
import OrderDetailsSkeleton from '@/components/order/OrderDetailsSkeleton';
import { mapDatabaseStatus, getStatusLabel } from '@/lib/orderStatus';

interface Order {
  id: string;
  user_id: string;
  service_type: 'LAUNDRY' | 'CLEANING';
  partner_id: string;
  slot_start: string;
  slot_end: string;
  status: string;
  subtotal_cents: number;
  tax_cents: number;
  delivery_cents: number;
  total_cents: number;
  actual_weight_lbs?: number;
  quote_cents?: number;
  quoted_at?: string;
  paid_at?: string;
  partner_notes?: string;
  intake_photos_json?: string[];
  outtake_photos_json?: string[];
  order_details: {
    lbs?: number;
    bedrooms?: number;
    bathrooms?: number;
    deep?: boolean;
    addons?: string[];
  };
  address_snapshot: {
    line1: string;
    line2?: string;
    city: string;
    zip: string;
    notes?: string;
  };
  created_at: string;
  updated_at: string;
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user && params.id) {
      fetchOrder();
    }
  }, [user, authLoading, params.id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${params.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Order not found');
        } else if (response.status === 403) {
          setError('You do not have permission to view this order');
        } else {
          setError('Failed to load order');
        }
        return;
      }

      const data = await response.json();
      setOrder(data);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <OrderDetailsSkeleton />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/orders" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Back to Orders
            </Link>
          </div>
        </main>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  // Helper functions
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getWindowLabel = () => {
    return `${formatTime(order.slot_start)} - ${formatTime(order.slot_end)}`;
  };

  const getServiceTypeLabel = () => {
    if (order.service_type === 'LAUNDRY') {
      if (order.order_details.lbs) {
        return `Wash & Fold · ${order.order_details.lbs} lbs (estimated)`;
      }
      return 'Laundry Service';
    }
    if (order.service_type === 'CLEANING') {
      const br = order.order_details.bedrooms === 0 ? 'Studio' : `${order.order_details.bedrooms} BR`;
      const ba = `${order.order_details.bathrooms} BA`;
      const deep = order.order_details.deep ? ' · Deep Clean' : '';
      return `${br}, ${ba}${deep}`;
    }
    return order.service_type;
  };

  const getAddressLines = () => {
    const lines = [order.address_snapshot.line1];
    if (order.address_snapshot.line2) lines.push(order.address_snapshot.line2);
    lines.push(`${order.address_snapshot.city}, NY ${order.address_snapshot.zip}`);
    if (order.address_snapshot.notes) lines.push(`Note: ${order.address_snapshot.notes}`);
    return lines;
  };

  const getPricingRows = () => {
    const rows = [
      { label: 'Subtotal', amountCents: order.subtotal_cents },
      { label: 'Tax (8.875%)', amountCents: order.tax_cents }
    ];
    if (order.delivery_cents > 0) {
      rows.push({ label: 'Delivery Fee', amountCents: order.delivery_cents });
    }
    return rows;
  };

  const getPricingNote = () => {
    if (order.status.toLowerCase() === 'pending_pickup') {
      return "No payment required yet. We'll send your quote after weighing your items.";
    }
    return undefined;
  };

  const showPayButton = order.status.toLowerCase() === 'awaiting_payment';
  const currentStep = mapDatabaseStatus(order.status);
  const statusLabel = getStatusLabel(order.status);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Sticky back button (mobile only) */}
      <div className="sticky top-0 z-30 border-b bg-white/90 px-4 py-2 backdrop-blur md:hidden">
        <Link href="/orders" className="text-sm text-blue-700 inline-flex items-center hover:text-blue-800">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </Link>
      </div>

      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back button (desktop) */}
          <Link 
            href="/orders" 
            className="hidden md:inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 text-sm font-medium"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>

          {/* Summary Bar */}
          <SummaryBar
            orderId={order.id}
            service={order.service_type}
            statusLabel={statusLabel}
            statusKey={currentStep}
            dateISO={order.slot_start}
            windowLabel={getWindowLabel()}
            totalCents={order.total_cents}
            showPayButton={showPayButton}
          />

          {/* Progress Tracker */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <ProgressTracker current={currentStep} />
          </div>

          {/* Service + Address Card */}
          <div className="mb-4">
            <ServiceAddressCard
              serviceType={getServiceTypeLabel()}
              addressLines={getAddressLines()}
            />
          </div>

          {/* Actual Weight Info (if available) */}
          {order.actual_weight_lbs && order.service_type === 'LAUNDRY' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📊</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">Weight Update</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-blue-700">Estimated</div>
                      <div className="font-medium text-blue-900">{order.order_details.lbs} lbs</div>
                    </div>
                    <div>
                      <div className="text-blue-700">Actual</div>
                      <div className="font-bold text-blue-900">{order.actual_weight_lbs} lbs</div>
                    </div>
                  </div>
                  {order.partner_notes && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="text-xs text-blue-700 font-medium">Partner Notes:</div>
                      <div className="text-sm text-blue-800 mt-1">{order.partner_notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pricing Card */}
          <div className="mb-4">
            <PricingCard
              rows={getPricingRows()}
              totalCents={order.total_cents}
              note={getPricingNote()}
            />
          </div>

          {/* Add-ons (if any) */}
          {order.order_details.addons && order.order_details.addons.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Add-ons</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                {order.order_details.addons.map((addon, idx) => (
                  <li key={idx} className="flex items-center">
                    <span className="text-blue-600 mr-2">•</span>
                    {addon.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
