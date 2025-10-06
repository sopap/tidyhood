'use client';

import React, { useState } from 'react';
import { Order } from '@/lib/types';
import { statusToUI, formatMoney, formatOrderDate, formatTimeWindow } from '@/lib/orders';
import StatusBadge from './StatusBadge';
import { CleaningStatusBadge } from '@/components/cleaning/CleaningStatusBadge';
import { CancelCleaningModal } from '@/components/cleaning/CancelCleaningModal';
import { canCancelCleaning } from '@/lib/cleaningStatus';

interface OrderCardProps {
  order: Order;
  onOpen: (id: string) => void;
  onOrderUpdate?: () => void;
}

export default function OrderCard({ order, onOpen, onOrderUpdate }: OrderCardProps) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [canceling, setCanceling] = useState(false);
  
  const ui = statusToUI(order.status);
  const serviceName = order.service_type === 'LAUNDRY' ? 'Laundry' : 'Cleaning';
  const total = order.quote_cents || order.total_cents;
  
  // Check if this is a cleaning order with the new status system
  const isCleaningOrder = order.service_type === 'CLEANING' && order.cleaning_status;
  const canCancel = isCleaningOrder && canCancelCleaning(order);

  const handleClick = () => {
    onOpen(order.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(order.id);
    }
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpen(order.id);
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCancelModal(true);
  };

  const handleConfirmCancel = async (reason: string) => {
    setCanceling(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel order');
      }

      // Refresh orders list
      if (onOrderUpdate) {
        onOrderUpdate();
      }
    } catch (error: any) {
      alert(error.message || 'Failed to cancel order');
      throw error;
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className="group flex items-start justify-between rounded-xl border border-gray-200 bg-white p-3 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      aria-label={`${serviceName} service on ${formatOrderDate(order.slot_start)} at ${formatTimeWindow(order.slot_start, order.slot_end)}, ${ui.label}, total ${formatMoney(total)}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-gray-900">{serviceName} service</span>
          {isCleaningOrder ? (
            <CleaningStatusBadge status={order.cleaning_status} size="sm" />
          ) : (
            <StatusBadge tone={ui.tone}>{ui.label}</StatusBadge>
          )}
        </div>
        <div className="text-sm text-gray-700">
          {formatOrderDate(order.slot_start)}
          {' · '}
          {formatTimeWindow(order.slot_start, order.slot_end)}
          {' · '}
          <span className="font-medium text-gray-900">{formatMoney(total)}</span>
        </div>
      </div>

      <div className="ml-3 shrink-0 flex gap-2">
        {canCancel && (
          <button
            type="button"
            onClick={handleCancelClick}
            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Cancel order"
            disabled={canceling}
          >
            {canceling ? 'Canceling...' : 'Cancel'}
          </button>
        )}
        <button
          type="button"
          onClick={handleViewClick}
          className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`View ${serviceName} order details`}
        >
          View
        </button>
      </div>
      
      {/* Cancel Modal */}
      {showCancelModal && isCleaningOrder && (
        <CancelCleaningModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          order={order}
          onConfirm={handleConfirmCancel}
        />
      )}
    </div>
  );
}
