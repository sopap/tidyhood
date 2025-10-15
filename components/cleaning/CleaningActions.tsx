'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CleaningOrder } from '@/types/cleaningOrders';
import { canOpenDispute } from '@/types/cleaningOrders';

interface CleaningActionsProps {
  order: CleaningOrder;
  userRole: 'customer' | 'partner' | 'admin';
  onOpenDispute?: () => void;
  onRate?: () => void;
  onContact?: () => void;
  className?: string;
}

/**
 * CleaningActions - Context-aware action buttons for cleaning orders
 * 
 * Shows relevant actions based on:
 * - Order status
 * - User role
 * - Business rules (e.g., dispute window)
 * 
 * Mobile: Large tap targets (min 44px), stacked layout
 * Desktop: Inline button group
 */
export function CleaningActions({
  order,
  userRole,
  onOpenDispute,
  onRate,
  onContact,
  className = '',
}: CleaningActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // Get available actions based on status and role
  const actions = getAvailableActions(order, userRole);
  
  if (actions.length === 0) {
    return null;
  }
  
  const primaryAction = actions[0];
  const secondaryActions = actions.slice(1);
  
  const handleAction = async (actionType: string) => {
    setIsLoading(true);
    
    try {
      switch (actionType) {
        case 'cancel':
          router.push(`/orders/${order.id}?action=cancel`);
          break;
        
        case 'reschedule':
          router.push(`/orders/${order.id}?action=reschedule`);
          break;
        
        case 'dispute':
          if (onOpenDispute) {
            onOpenDispute();
          } else {
            router.push(`/orders/${order.id}?action=dispute`);
          }
          break;
        
        case 'rate':
          if (onRate) {
            onRate();
          } else {
            router.push(`/orders/${order.id}?action=rate`);
          }
          break;
        
        case 'contact':
          if (onContact) {
            onContact();
          } else {
            router.push(`/orders/${order.id}?action=contact`);
          }
          break;
        
        case 'calendar':
          const calendarUrl = generateCalendarLink(order);
          window.open(calendarUrl, '_blank');
          break;
        
        case 'rebook':
          router.push(`/book/cleaning?rebook=${order.id}`);
          break;
        
        case 'view_receipt':
          // Open Stripe receipt in new tab if available
          if ((order as any).stripe_receipt_url) {
            window.open((order as any).stripe_receipt_url, '_blank', 'noopener,noreferrer');
          }
          break;
        
        default:
          console.warn(`Unknown action: ${actionType}`);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className={`cleaning-actions ${className}`}>
      <div className="space-y-3">
        {/* Primary Action - Full Width on Mobile, Prominent on Desktop */}
        <button
          onClick={() => handleAction(primaryAction.type)}
          disabled={isLoading}
          className={`
            w-full px-6 py-3 rounded-lg font-semibold text-white shadow-sm
            ${getPrimaryButtonClass(primaryAction.type)}
            hover:opacity-90 hover:shadow active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-150
            flex items-center justify-center gap-2
            min-h-[44px]
          `}
        >
          {getButtonIcon(primaryAction.type)}
          <span>{primaryAction.label}</span>
        </button>
        
        {/* Secondary Actions - Responsive Grid */}
        {secondaryActions.length > 0 && (
          <div className={`
            grid gap-2
            ${secondaryActions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}
          `}>
            {secondaryActions.map((action) => (
              <button
                key={action.type}
                onClick={() => handleAction(action.type)}
                disabled={isLoading}
                className={`
                  px-4 py-2.5 rounded-lg font-medium text-sm
                  ${getSecondaryButtonClass(action.type)}
                  hover:shadow-sm active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-150
                  flex items-center justify-center gap-1.5
                  min-h-[42px]
                `}
              >
                {getButtonIcon(action.type)}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Get available actions based on order status and user role
 */
function getAvailableActions(
  order: CleaningOrder,
  userRole: 'customer' | 'partner' | 'admin'
): Array<{ type: string; label: string; icon?: string }> {
  const actions: Array<{ type: string; label: string; icon?: string }> = [];
  
  if (userRole === 'customer') {
    switch (order.status) {
      case 'pending':
      case 'assigned':
        actions.push(
          { type: 'calendar', label: 'Add to Calendar' },
          { type: 'reschedule', label: 'Reschedule' },
          { type: 'cancel', label: 'Cancel' },
          { type: 'contact', label: 'Contact Support' }
        );
        break;
      
      case 'en_route':
      case 'on_site':
        actions.push(
          { type: 'contact', label: 'Contact Partner' },
          { type: 'cancel', label: 'Cancel' }
        );
        break;
      
      case 'in_progress':
        actions.push(
          { type: 'contact', label: 'Contact Partner' }
        );
        break;
      
      case 'completed':
        if (canOpenDispute(order)) {
          actions.push(
            { type: 'rate', label: 'Rate & Tip' },
            { type: 'dispute', label: 'Report Issue' },
            { type: 'rebook', label: 'Book Again' },
            { type: 'view_receipt', label: 'View Receipt' }
          );
        } else {
          actions.push(
            { type: 'rebook', label: 'Book Again' },
            { type: 'view_receipt', label: 'View Receipt' }
          );
        }
        break;
      
      case 'disputed':
        actions.push(
          { type: 'contact', label: 'Contact Support' }
        );
        break;
      
      case 'refunded':
        actions.push(
          { type: 'rebook', label: 'Book Again' },
          { type: 'view_receipt', label: 'View Receipt' }
        );
        break;
      
      case 'cleaner_no_show':
      case 'customer_no_show':
        actions.push(
          { type: 'contact', label: 'Contact Support' },
          { type: 'rebook', label: 'Book Again' }
        );
        break;
      
      case 'canceled':
        actions.push(
          { type: 'rebook', label: 'Book Again' }
        );
        break;
      
      default:
        actions.push(
          { type: 'contact', label: 'Contact Support' }
        );
        break;
    }
  }
  
  return actions;
}

/**
 * Get Tailwind class for primary button based on action type
 */
function getPrimaryButtonClass(actionType: string): string {
  switch (actionType) {
    case 'cancel':
      return 'bg-red-600';
    case 'dispute':
      return 'bg-orange-600';
    case 'rate':
      return 'bg-purple-600';
    case 'rebook':
    case 'calendar':
      return 'bg-blue-600';
    case 'contact':
      return 'bg-gray-800';
    default:
      return 'bg-blue-600';
  }
}

/**
 * Get Tailwind class for secondary button based on action type
 */
function getSecondaryButtonClass(actionType: string): string {
  switch (actionType) {
    case 'cancel':
      return 'bg-red-600 text-white hover:bg-red-700';
    case 'dispute':
      return 'bg-orange-600 text-white hover:bg-orange-700';
    case 'reschedule':
      return 'bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50';
    case 'contact':
      return 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50';
    default:
      return 'bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50';
  }
}

/**
 * Get SVG icon for button action type
 */
function getButtonIcon(actionType: string): JSX.Element | null {
  const iconClass = "w-5 h-5";
  
  switch (actionType) {
    case 'calendar':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'reschedule':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'cancel':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'contact':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      );
    case 'rate':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      );
    case 'dispute':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'rebook':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      );
    case 'view_receipt':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Generate Google Calendar link for cleaning appointment
 */
function generateCalendarLink(order: CleaningOrder): string {
  const title = `TidyHood Cleaning Service`;
  const description = `Your cleaning appointment with TidyHood. Order #${order.id.slice(0, 8)}`;
  const location = `${order.address_snapshot.line1}, ${order.address_snapshot.city}`;
  
  // Format dates for Google Calendar (YYYYMMDDTHHmmss)
  const startDate = new Date(order.slot_start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const endDate = new Date(order.slot_end).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description,
    location,
    dates: `${startDate}/${endDate}`,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
