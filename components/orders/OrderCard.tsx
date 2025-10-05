'use client';

import React from 'react';
import { Order } from '@/lib/types';
import { statusToUI, formatMoney, formatOrderDate, formatTimeWindow } from '@/lib/orders';
import StatusBadge from './StatusBadge';

interface OrderCardProps {
  order: Order;
  onOpen: (id: string) => void;
}

export default function OrderCard({ order, onOpen }: OrderCardProps) {
  const ui = statusToUI(order.status);
  const serviceName = order.service_type === 'LAUNDRY' ? 'Laundry' : 'Cleaning';
  const total = order.quote_cents || order.total_cents;

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
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900">{serviceName} service</span>
          <StatusBadge tone={ui.tone}>{ui.label}</StatusBadge>
        </div>
        <div className="text-sm text-gray-700">
          {formatOrderDate(order.slot_start)}
          {' · '}
          {formatTimeWindow(order.slot_start, order.slot_end)}
          {' · '}
          <span className="font-medium text-gray-900">{formatMoney(total)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleViewClick}
        className="ml-3 shrink-0 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label={`View ${serviceName} order details`}
      >
        View
      </button>
    </div>
  );
}
