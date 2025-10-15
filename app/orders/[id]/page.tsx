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
import CancelModal from '@/components/order/CancelModal';
import RescheduleModal from '@/components/order/RescheduleModal';
import { CleaningOrderView } from '@/components/cleaning/CleaningOrderView';
import { mapDatabaseStatus } from '@/lib/orderStatus';
import { getStatusLabel, OrderStatus } from '@/lib/orderStateMachine';
import { getCancellationPolicy, getHoursUntilSlot, formatMoney } from '@/lib/cancellationFees';
import { isFeatureEnabled } from '@/lib/features';
import { mapToCleaningStatus } from '@/types/cleaningOrders';
import { shouldShowAddToCalendar, downloadCalendarEvent } from '@/lib/calendar';

interface Order {
  id: string;
  user_id: string;
  service_type: 'LAUNDRY' | 'CLEANING';
  partner_id: string;
  slot_start: string;
  slot_end: string;
  delivery_slot_start?: string;
  delivery_slot_end?: string;
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
  saved_payment_method_id?: string;
  stripe_customer_id?: string;
  stripe_receipt_url?: string;
  stripe_receipt_number?: string;
  stripe_charge_id?: string;
  pending_admin_approval?: boolean;
  order_details: {
    lbs?: number;
    bedrooms?: number;
    bathrooms?: number;
    deep?: boolean;
    addons?: string[];
    preferredDeliveryDate?: string;
  };
  address_snapshot: {
    line1: string;
    line2?: string;
    city: string;
    zip: string;
    notes?: string;
  };
  customer?: {
    phone: string;
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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Helper functions for payment method detection
  const shouldShowLegacyPayButton = (order: Order) => {
    return (
      order.service_type === 'LAUNDRY' &&
      order.status === 'awaiting_payment' &&
      !order.saved_payment_method_id && // Legacy orders only
      !order.paid_at
    );
  };

  const shouldShowPaymentMethodInfo = (order: Order) => {
    return (
      order.service_type === 'LAUNDRY' &&
      !!order.saved_payment_method_id && // Setup Intent orders
      (order.status === 'pending_admin_approval' || 
       order.status === 'at_facility' ||
       order.status === 'pending_pickup')
    );
  };

  const getPaymentMethodMessage = (order: Order) => {
    if (order.status === 'pending_admin_approval') {
      return "Your laundry has been weighed. We'll charge your card once admin approves the final quote.";
    } else if (order.status === 'at_facility') {
      return "Your laundry is being processed. You'll be charged once the quote is finalized.";
    } else {
      return "Your laundry will be picked up soon. You'll be charged after weighing.";
    }
  };

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
            <Link href="/orders" className="inline-block bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-700 transition-colors">
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

  // Check if we should use the new Cleaning V2 UI
  const cleaningV2Enabled = isFeatureEnabled('CLEANING_V2');
  if (order.service_type === 'CLEANING' && cleaningV2Enabled) {
    // Normalize the order to ensure type safety
    const cleaningOrder = {
      ...order,
      service_type: 'CLEANING' as const,
      status: mapToCleaningStatus(order.status),
      order_details: order.order_details,
      address_snapshot: order.address_snapshot,
    };
    
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <CleaningOrderView order={cleaningOrder as any} userRole="customer" />
      </div>
    );
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

  const getDeliveryWindowLabel = () => {
    if (order.delivery_slot_start && order.delivery_slot_end) {
      return `${formatTime(order.delivery_slot_start)} - ${formatTime(order.delivery_slot_end)}`;
    }
    return undefined;
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
      { label: 'Subtotal', amountCents: order.subtotal_cents }
    ];
    
    // Only show tax if applicable (greater than $0)
    if (order.tax_cents > 0) {
      rows.push({ label: 'Tax (8.875%)', amountCents: order.tax_cents });
    }
    
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

  const currentStep = mapDatabaseStatus(order.status);
  const statusLabel = getStatusLabel(order.status as OrderStatus, order.service_type);
  const showPayButton = shouldShowLegacyPayButton(order);
  const showPaymentInfo = shouldShowPaymentMethodInfo(order);
  
  // Calculate cancellation policy
  const policy = getCancellationPolicy(order as any);
  const hoursUntil = getHoursUntilSlot(order.slot_start);
  const showActions = policy.canCancel || policy.canReschedule;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Sticky back button (mobile only) - Enhanced with gradient */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-gradient-to-r from-white to-brand-50 px-4 py-3 shadow-sm backdrop-blur md:hidden">
        <Link href="/orders" className="text-sm text-brand inline-flex items-center font-medium hover:text-brand-700 transition-colors">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="hidden md:inline-flex items-center text-brand hover:text-brand-700 mb-4 text-sm font-medium transition-colors"
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
            deliveryDateISO={order.delivery_slot_start}
            deliveryWindowLabel={getDeliveryWindowLabel()}
            preferredDeliveryDate={order.order_details?.preferredDeliveryDate}
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
              phone={order.customer?.phone}
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

          {/* Payment Method Status Info */}
          {showPaymentInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💳</span>
                <div>
                  <p className="font-medium text-blue-900 mb-1">Payment method saved</p>
                  <p className="text-sm text-blue-700">
                    {getPaymentMethodMessage(order)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Legacy Payment Warning */}
          {showPayButton && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-medium text-amber-900 mb-1">Legacy order - Manual payment required</p>
                  <p className="text-sm text-amber-800">
                    This order requires manual payment. Please click "Pay Now" to complete your payment.
                  </p>
                </div>
              </div>
            </div>
          )}

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

          {/* Actions Card - Professional Design */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow mb-4 md:mb-20">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Actions
            </h2>
            
            <div className="space-y-3">
              {/* Primary Action - Add to Calendar */}
              {shouldShowAddToCalendar(order as any) && (
                <button
                  onClick={() => downloadCalendarEvent(order as any)}
                  className="w-full px-6 py-3 rounded-lg font-semibold text-white shadow-sm bg-blue-600 hover:opacity-90 hover:shadow active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Add to Calendar</span>
                </button>
              )}
              
              {/* View Receipt */}
              {order.stripe_receipt_url && (
                <a
                  href={order.stripe_receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-6 py-3 rounded-lg font-semibold text-white shadow-sm bg-green-600 hover:opacity-90 hover:shadow active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 min-h-[44px]"
                  aria-label="View payment receipt in new window"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>View Receipt</span>
                </a>
              )}
              
              {/* Secondary Actions Grid */}
              <div className="grid gap-2 grid-cols-2">
                {/* Contact Support */}
                <a
                  href={`mailto:support@tidyhood.com?subject=Order Support - Order #${order.id}&body=Hi, I need help with my order #${order.id}.`}
                  className="px-4 py-2.5 rounded-lg font-medium text-sm bg-white border-2 border-gray-300 text-gray-700 hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-1.5 min-h-[42px]"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span>Contact Support</span>
                </a>

                {/* Reschedule */}
                {policy.canReschedule && (
                  <button
                    onClick={() => setShowRescheduleModal(true)}
                    className="px-4 py-2.5 rounded-lg font-medium text-sm bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-1.5 min-h-[42px]"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Reschedule</span>
                  </button>
                )}
                
                {/* Cancel */}
                {policy.canCancel && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2.5 rounded-lg font-medium text-sm bg-red-600 text-white hover:bg-red-700 hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-1.5 min-h-[42px]"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Cancel</span>
                  </button>
                )}
              </div>

              {/* Policy Notice */}
              {policy.requiresNotice && hoursUntil < 24 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <div className="flex items-start gap-2">
                    <svg className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="text-sm">
                      <p className="font-medium text-orange-900 mb-1">Less than 24 hours notice</p>
                      <p className="text-orange-800">
                        {order.service_type === 'CLEANING' 
                          ? 'No changes allowed within 24 hours of service time.'
                          : `A ${formatMoney(policy.cancellationFee || policy.rescheduleFee)} fee will apply for changes at this time.`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Help text */}
              {(!policy.requiresNotice || hoursUntil >= 24) && (
                <p className="text-xs text-gray-500 text-center">
                  {order.service_type === 'LAUNDRY' 
                    ? 'Free to reschedule or cancel anytime before pickup'
                    : 'Free rescheduling with 24+ hours notice. Cancellations incur a 15% fee.'
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Modals */}
      <CancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        order={order as any}
        onSuccess={() => {
          setToastMessage('Order canceled successfully');
          setTimeout(() => setToastMessage(''), 3000);
        }}
      />
      
      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        order={order as any}
        onSuccess={() => {
          setToastMessage('Order rescheduled successfully');
          setTimeout(() => setToastMessage(''), 3000);
          fetchOrder(); // Refresh order data
        }}
      />
    </div>
  );
}
