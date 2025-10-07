'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CleaningOrder } from '@/types/cleaningOrders';
import { FEATURES } from '@/lib/features';
import { CleaningTimeline } from './CleaningTimeline';
import { CleaningActions } from './CleaningActions';
import { DisputeModal } from './DisputeModal';
import { PartnerInfoCard } from './PartnerInfoCard';
import { getCleaningStatusConfig } from '@/types/cleaningOrders';

interface CleaningOrderViewProps {
  order: CleaningOrder;
  userRole?: 'customer' | 'partner' | 'admin';
}

/**
 * CleaningOrderView - Main orchestrator component for cleaning orders
 * 
 * Only renders when CLEANING_V2 feature flag is enabled.
 * Composes: Header, Timeline, Actions, Modals
 * 
 * Responsibilities:
 * - Fetches and manages order state
 * - Handles action callbacks (dispute, rate, etc.)
 * - Shows/hides modals
 * - Optimistic UI updates
 */
export function CleaningOrderView({
  order: initialOrder,
  userRole = 'customer',
}: CleaningOrderViewProps) {
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Don't render if feature flag is off
  if (!FEATURES.CLEANING_V2) {
    return null;
  }
  
  // Use safe status config getter that handles legacy statuses
  const statusConfig = getCleaningStatusConfig(order.status);
  
  /**
   * Handle dispute submission
   */
  const handleDisputeSubmit = async (reason: string, proofFiles: File[]) => {
    setIsTransitioning(true);
    setError(null);
    
    try {
      // Upload proof files first (if any)
      const proofUrls: string[] = [];
      for (const file of proofFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('order_id', order.id);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          proofUrls.push(url);
        }
      }
      
      // Submit dispute transition
      const res = await fetch(`/api/orders/${order.id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'open_dispute',
          metadata: {
            reason,
            proof: proofUrls.map(url => ({ type: 'photo', url })),
          },
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit dispute');
      }
      
      // Update local state optimistically
      setOrder(prev => ({
        ...prev,
        status: 'disputed',
        disputed_at: new Date().toISOString(),
        dispute_reason: reason,
        proof: proofUrls.map(url => ({ type: 'photo' as const, url })),
      }));
      
      // Refresh page data
      router.refresh();
      
      setShowDisputeModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit dispute');
      throw err;
    } finally {
      setIsTransitioning(false);
    }
  };
  
  /**
   * Handle rating submission
   */
  const handleRate = () => {
    // Navigate to rating page or open rating modal
    router.push(`/orders/${order.id}?action=rate`);
  };
  
  /**
   * Handle contact action
   */
  const handleContact = () => {
    // Open contact modal or navigate to support
    router.push(`/orders/${order.id}?action=contact`);
  };
  
  return (
    <div className="cleaning-order-view">
      {/* Header Section - Compact on mobile, full on desktop */}
      <div className="bg-white md:bg-gradient-to-r md:from-white md:to-blue-50 border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 md:py-6">
          {/* Back Button */}
          <Link href="/orders" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-3 md:mb-4 text-sm font-medium transition-colors">
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>
          
          {/* Mobile: Compact Header */}
          <div className="md:hidden">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                  Cleaning Service
                </h1>
                {/* Status Badge - More subtle on mobile */}
                <span
                  className={`
                    inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border
                    ${getStatusBadgeClass(statusConfig.color)}
                  `}
                >
                  <span className="text-sm leading-none">{statusConfig.icon}</span>
                  <span className="whitespace-nowrap">{statusConfig.label}</span>
                </span>
              </div>
              
              {/* Price - Compact */}
              <div className="text-right flex-shrink-0">
                <div className="text-2xl font-bold text-gray-900">
                  ${(order.total_cents / 100).toFixed(2)}
                </div>
                <div className="text-xs text-gray-600">
                  Total
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-600">
              Order #{order.id.slice(0, 8)} · {formatDate(order.slot_start)} · {formatTimeRange(order.slot_start, order.slot_end)}
            </div>
          </div>
          
          {/* Desktop: Full Header */}
          <div className="hidden md:block">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-gray-900">
                    Cleaning Service
                  </h1>
                  {/* Status Badge - Enhanced with better spacing and pill shape */}
                  <span
                    className={`
                      inline-flex items-center gap-3 px-4 py-2 rounded-full text-sm font-semibold shadow-sm
                      ${getStatusBadgeClass(statusConfig.color)}
                    `}
                  >
                    <span className="text-lg leading-none">{statusConfig.icon}</span>
                    <span className="whitespace-nowrap">{statusConfig.label}</span>
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                  <span className="font-medium">Order #{order.id.slice(0, 8)}</span>
                  <span className="text-gray-400">•</span>
                  <span>{formatDate(order.slot_start)}</span>
                  {order.slot_start && order.slot_end && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="font-medium">{formatTimeRange(order.slot_start, order.slot_end)}</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Price - Enhanced with better visual emphasis */}
              <div className="text-left md:text-right bg-white rounded-lg px-4 py-3 border border-gray-200 shadow-sm">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  ${(order.total_cents / 100).toFixed(2)}
                </div>
                <div className="text-sm font-medium text-gray-600">
                  {order.status === 'refunded' ? 'Refunded' : 'Total Paid'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Error Alert */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">❌</span>
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content - Added bottom padding for footer clearance */}
      <div className="max-w-4xl mx-auto px-4 py-4 md:py-6 pb-24 md:pb-6 space-y-4 md:space-y-6">
        {/* Status Description - Enhanced with icon and gradient */}
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{statusConfig.icon}</span>
            <p className="text-sm leading-relaxed text-blue-900 font-medium">
              {getStatusDescription(order)}
            </p>
          </div>
        </div>
        
        {/* Timeline - Enhanced with better card styling */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Progress
          </h2>
          <CleaningTimeline order={order} />
        </div>
        
        {/* Partner Info Card - Only show if partner assigned */}
        {order.partner_id && (
          <PartnerInfoCard partnerId={order.partner_id} />
        )}
        
        {/* Service Details - Clean, professional design */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Service Details
          </h2>
          
          {/* Primary Info - Simple inline display */}
          <div className="text-sm text-gray-700 mb-6">
            <span className="font-semibold">{order.order_details.bedrooms === 0 ? 'Studio' : `${order.order_details.bedrooms} Bedroom${order.order_details.bedrooms !== 1 ? 's' : ''}`}</span>
            {' · '}
            <span className="font-semibold">{order.order_details.bathrooms} Bathroom{order.order_details.bathrooms !== 1 ? 's' : ''}</span>
            {order.order_details.square_feet && (
              <>
                {' · '}
                <span className="font-semibold">{order.order_details.square_feet.toLocaleString()} sq ft</span>
              </>
            )}
          </div>
          
          {/* Cleaning Type & Add-ons */}
          {(order.order_details.deep || (order.order_details.addons && order.order_details.addons.length > 0)) && (
            <div className="border-t border-gray-200 pt-4 space-y-3">
              {order.order_details.deep && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-2">Cleaning Type</dt>
                  <dd>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                      🌟 Deep Clean
                    </span>
                  </dd>
                </div>
              )}
              
              {order.order_details.addons && order.order_details.addons.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-2">
                    Extra Services ({order.order_details.addons.length})
                  </dt>
                  <dd className="flex flex-wrap gap-2">
                    {order.order_details.addons.map((addon, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200"
                      >
                        ✓ {addon}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Service Address - Clean, professional design */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Service Address
          </h2>
          <address className="not-italic text-gray-700 space-y-1 text-base">
            <p className="font-medium">{order.address_snapshot.line1}</p>
            {order.address_snapshot.line2 && <p className="text-gray-600">{order.address_snapshot.line2}</p>}
            <p className="text-gray-600">{order.address_snapshot.city}, {order.address_snapshot.zip}</p>
            {order.address_snapshot.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200 bg-amber-50 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900 mb-1 flex items-center gap-2">
                  <span>📝</span>
                  Access Notes
                </p>
                <p className="text-sm text-amber-800">{order.address_snapshot.notes}</p>
              </div>
            )}
          </address>
        </div>
        
        {/* Actions - Clean, professional design */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8 hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Actions
          </h2>
          <CleaningActions
            order={order}
            userRole={userRole}
            onOpenDispute={() => setShowDisputeModal(true)}
            onRate={handleRate}
            onContact={handleContact}
          />
        </div>
      </div>
      
      {/* Modals */}
      <DisputeModal
        order={order}
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        onSubmit={handleDisputeSubmit}
      />
    </div>
  );
}

/**
 * Get status badge Tailwind classes
 */
function getStatusBadgeClass(color: string): string {
  const classes: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    purple: 'bg-purple-100 text-purple-800',
    gray: 'bg-gray-100 text-gray-800',
  };
  return classes[color] || classes.gray;
}

/**
 * Get customer-friendly status description
 */
function getStatusDescription(order: CleaningOrder): string {
  const descriptions: Record<string, string> = {
    pending: order.partner_id 
      ? "Your cleaner is confirmed! They'll arrive during your scheduled time window."
      : "We're assigning your appointment to a professional cleaner.",
    assigned: `Your cleaner is ready and will arrive on ${formatDate(order.slot_start)}.`,
    en_route: "Your cleaner is on the way to your location.",
    on_site: "Your cleaner has arrived and will begin shortly.",
    in_progress: "Your cleaning is currently in progress.",
    completed: "Your cleaning has been completed. Thank you for using TidyHood!",
    canceled: "This order has been canceled.",
    cleaner_no_show: "We're sorry the cleaner didn't arrive. Our team will contact you shortly to reschedule or issue a refund.",
    customer_no_show: "The cleaner was unable to access your location. Please contact us to reschedule.",
    disputed: "We're reviewing your case and will respond within 24 hours. Check your email for updates.",
    refunded: "Your payment has been refunded. Thank you for your patience.",
  };
  return descriptions[order.status] || getCleaningStatusConfig(order.status).description;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format time range
 */
function formatTimeRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const startTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  
  const endTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  
  return `${startTime} - ${endTime}`;
}
