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
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200'
  } as const;

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-gradient-to-r from-white to-blue-50 p-4 md:p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h2 className="text-lg font-bold capitalize text-gray-900 md:text-xl">
              {service.toLowerCase()} Service
            </h2>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold shadow-sm ${toneMap[tone]}`}>
              {statusLabel}
            </span>
          </div>
          <div className="text-sm text-gray-600 font-medium">
            📅 {dateStr} · ⏰ {windowLabel}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-left md:text-right bg-white rounded-lg px-4 py-3 border border-gray-200 shadow-sm">
            <div className="text-xs text-gray-500 mb-1 font-medium">Total</div>
            <div className="text-2xl font-bold text-gray-900">{money(totalCents)}</div>
          </div>
          {showPayButton && (
            <button
              onClick={() => router.push(`/orders/${orderId}/pay`)}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow"
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
