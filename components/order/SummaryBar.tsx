'use client';
import { statusTone } from '@/lib/orderStatus';
import { useRouter } from 'next/navigation';

interface SummaryBarProps {
  orderId: string;
  service: 'LAUNDRY' | 'CLEANING';
  statusLabel: string;
  statusKey: string;
  dateISO: string;
  windowLabel: string;
  totalCents: number;
  showPayButton?: boolean;
}

export default function SummaryBar({
  orderId,
  service,
  statusLabel,
  statusKey,
  dateISO,
  windowLabel,
  totalCents,
  showPayButton
}: SummaryBarProps) {
  const router = useRouter();
  const tone = statusTone(statusKey as any);
  const money = (c: number) => (c / 100).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  const dateStr = new Date(dateISO).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  const toneMap = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200'
  } as const;

  return (
    <div className="mb-3 rounded-xl border border-gray-200 bg-white p-3 md:p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-semibold capitalize text-gray-900">{service.toLowerCase()} Service</span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneMap[tone]}`}>
              {statusLabel}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {dateStr} · {windowLabel}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-gray-500 md:text-sm">Total</div>
            <div className="text-lg font-bold text-gray-900 md:text-xl">{money(totalCents)}</div>
          </div>
          {showPayButton && (
            <button
              onClick={() => router.push(`/orders/${orderId}/pay`)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-label="Proceed to payment"
            >
              Pay Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
