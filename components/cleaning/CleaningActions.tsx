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
 * Mobile: Large tap targets (min 44px), sticky bottom bar for primary action
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
          // Add to calendar (Google Calendar, iCal, etc.)
          const calendarUrl = generateCalendarLink(order);
          window.open(calendarUrl, '_blank');
          break;
        
        case 'rebook':
          router.push(`/book/cleaning?rebook=${order.id}`);
          break;
        
        case 'view_receipt':
          router.push(`/orders/${order.id}/receipt`);
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
      {/* Desktop: Inline Button Group */}
      <div className="hidden md:flex md:items-center md:gap-3">
        {/* Primary Action */}
        <button
          onClick={() => handleAction(primaryAction.type)}
          disabled={isLoading}
          className={`
            flex-1 px-6 py-3 rounded-lg font-semibold text-white
            ${getPrimaryButtonClass(primaryAction.type)}
            hover:opacity-90 active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
          `}
        >
          {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
          {primaryAction.label}
        </button>
        
        {/* Secondary Actions */}
        {secondaryActions.map((action) => (
          <button
            key={action.type}
            onClick={() => handleAction(action.type)}
            disabled={isLoading}
            className={`
              px-4 py-3 rounded-lg font-medium
              ${getSecondaryButtonClass(action.type)}
              hover:bg-gray-100 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            `}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>
      
      {/* Mobile: Sticky Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-inset-bottom">
        {/* Primary Action - Full Width Button */}
        <button
          onClick={() => handleAction(primaryAction.type)}
          disabled={isLoading}
          className={`
            w-full h-12 rounded-lg font-semibold text-white mb-3
            ${getPrimaryButtonClass(primaryAction.type)}
            hover:opacity-90 active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            flex items-center justify-center
          `}
        >
          {primaryAction.icon && <span className="mr-2 text-lg">{primaryAction.icon}</span>}
          {primaryAction.label}
        </button>
        
        {/* Secondary Actions - Compact Row */}
        {secondaryActions.length > 0 && (
          <div className="flex gap-2">
            {secondaryActions.map((action) => (
              <button
                key={action.type}
                onClick={() => handleAction(action.type)}
                disabled={isLoading}
                className={`
                  flex-1 h-10 rounded-lg font-medium text-sm
                  ${getSecondaryButtonClass(action.type)}
                  hover:bg-gray-100 active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  flex items-center justify-center
                `}
              >
                {action.icon && <span className="mr-1">{action.icon}</span>}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Spacer for mobile sticky bar */}
      <div className="md:hidden h-32" />
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
          { type: 'calendar', label: 'Add to Calendar', icon: '📅' },
          { type: 'reschedule', label: 'Reschedule', icon: '🔄' },
          { type: 'cancel', label: 'Cancel', icon: '❌' },
          { type: 'contact', label: 'Contact Support', icon: '💬' }
        );
        break;
      
      case 'en_route':
      case 'on_site':
        actions.push(
          { type: 'contact', label: 'Contact Partner', icon: '📞' },
          { type: 'cancel', label: 'Cancel', icon: '❌' }
        );
        break;
      
      case 'in_progress':
        actions.push(
          { type: 'contact', label: 'Contact Partner', icon: '📞' }
        );
        break;
      
      case 'completed':
        if (canOpenDispute(order)) {
          actions.push(
            { type: 'rate', label: 'Rate & Tip', icon: '⭐' },
            { type: 'dispute', label: 'Report Issue', icon: '⚠️' },
            { type: 'rebook', label: 'Book Again', icon: '🔄' },
            { type: 'view_receipt', label: 'View Receipt', icon: '📄' }
          );
        } else {
          actions.push(
            { type: 'rebook', label: 'Book Again', icon: '🔄' },
            { type: 'view_receipt', label: 'View Receipt', icon: '📄' }
          );
        }
        break;
      
      case 'disputed':
        actions.push(
          { type: 'contact', label: 'Contact Support', icon: '💬' }
        );
        break;
      
      case 'refunded':
        actions.push(
          { type: 'rebook', label: 'Book Again', icon: '🔄' },
          { type: 'view_receipt', label: 'View Receipt', icon: '📄' }
        );
        break;
      
      case 'cleaner_no_show':
      case 'customer_no_show':
        actions.push(
          { type: 'contact', label: 'Contact Support', icon: '💬' },
          { type: 'rebook', label: 'Book Again', icon: '🔄' }
        );
        break;
      
      case 'canceled':
        actions.push(
          { type: 'rebook', label: 'Book Again', icon: '🔄' }
        );
        break;
      
      default:
        // Fallback for any unhandled statuses
        actions.push(
          { type: 'contact', label: 'Contact Support', icon: '💬' }
        );
        break;
    }
  }
  
  // Partner actions are handled in partner portal (StatusUpdater component)
  // Admin actions are handled in admin panel
  
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
      return 'border-2 border-red-600 text-red-600';
    case 'dispute':
      return 'border-2 border-orange-600 text-orange-600';
    default:
      return 'border-2 border-gray-300 text-gray-700';
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
