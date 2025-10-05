'use client';

import { useEffect, useState } from 'react';
import { EstimateResult, ServiceType } from '@/lib/types';

interface EstimatePanelProps {
  estimate: EstimateResult | null;
  isLoading?: boolean;
  serviceType?: ServiceType;
}

export default function EstimatePanel({ estimate, isLoading, serviceType }: EstimatePanelProps) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Delay showing to avoid flash
    const timer = setTimeout(() => setShouldShow(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!shouldShow) {
    return null;
  }

  if (isLoading) {
    return (
      <aside className="rounded-lg bg-blue-50 border border-blue-200 p-4" aria-busy="true">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-blue-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-3 bg-blue-100 rounded"></div>
            <div className="h-3 bg-blue-100 rounded"></div>
          </div>
          <div className="h-5 bg-blue-200 rounded w-3/4"></div>
        </div>
      </aside>
    );
  }

  if (!estimate) {
    return (
      <aside className="rounded-lg bg-gray-50 border border-gray-200 p-4">
        <p className="text-sm text-gray-600">
          Select your service options to see an estimate
        </p>
      </aside>
    );
  }

  // For dry clean service, show different messaging
  const isDryClean = serviceType === 'dryClean';
  const showTotal = estimate.total > 0 || !isDryClean;

  return (
    <aside
      className="rounded-lg bg-blue-50 border border-blue-200 p-4"
      aria-live="polite"
      aria-atomic="true"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        {isDryClean ? 'Pricing' : 'Estimated Total'}
      </h3>
      
      {isDryClean ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-700">To be quoted</p>
          <p className="text-xs text-gray-600">
            Final price provided after inspection
          </p>
        </div>
      ) : (
        <>
          <dl className="space-y-2 text-sm">
            {estimate.breakdown.map((item, index) => (
              <div key={index} className="flex justify-between items-baseline">
                <dt className="text-gray-700">{item.label}</dt>
                <dd className={`font-medium ${item.amount < 0 ? 'text-green-600' : item.amount === 0 && item.label.includes('TBD') ? 'text-gray-500 italic' : 'text-gray-900'}`}>
                  {item.amount === 0 && item.label.includes('TBD') ? 'TBD' : `$${Math.abs(item.amount).toFixed(2)}`}
                </dd>
              </div>
            ))}
          </dl>

          {showTotal && (
            <div className="mt-4 pt-3 border-t border-blue-200 flex justify-between items-baseline">
              <dt className="text-base font-semibold text-gray-900">Total</dt>
              <dd className="text-xl font-bold text-blue-600">${estimate.total.toFixed(2)}</dd>
            </div>
          )}

          <p className="mt-3 text-xs text-gray-600">
            {serviceType === 'mixed' 
              ? 'W&F estimate shown. Dry clean items priced after inspection.'
              : 'Final price determined after weighing your items'}
          </p>
        </>
      )}
    </aside>
  );
}
