'use client';

import React, { useState } from 'react';
import { Order } from '@/lib/types';
import OrderCard from './OrderCard';

interface SectionProps {
  title: string;
  orders: Order[];
  initialCount?: number;
  collapsed?: boolean;
  emptyHint?: string;
  onOpen: (id: string) => void;
}

export default function Section({
  title,
  orders,
  initialCount = 3,
  collapsed = false,
  emptyHint,
  onOpen,
}: SectionProps) {
  const [open, setOpen] = useState(!collapsed);
  const [limit, setLimit] = useState(initialCount);
  
  const visible = open ? orders.slice(0, limit) : [];
  const hasMore = orders.length > limit;

  return (
    <section className="mb-6" aria-labelledby={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="mb-2 flex items-center justify-between">
        <h2 
          id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className="text-base font-semibold text-gray-900"
        >
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {open && hasMore && (
            <button
              onClick={() => setLimit((l) => l + 3)}
              className="text-sm text-blue-700 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            >
              Show more
            </button>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-sm text-gray-600 underline hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded"
            aria-expanded={open}
            aria-controls={`section-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
          >
            {open ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {!open && (
        <p className="text-sm text-gray-600">
          ({orders.length} {orders.length === 1 ? 'item' : 'items'})
        </p>
      )}

      {open && (
        <div id={`section-content-${title.replace(/\s+/g, '-').toLowerCase()}`}>
          {visible.length > 0 ? (
            <div className="space-y-3">
              {visible.map((order) => (
                <OrderCard key={order.id} order={order} onOpen={onOpen} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center">
              <p className="text-sm text-gray-600">{emptyHint || 'No items'}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
