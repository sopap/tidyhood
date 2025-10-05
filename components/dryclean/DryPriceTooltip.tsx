'use client';

import { DRY_CLEAN_PRICE_SAMPLES, DRY_CLEAN_DISCLAIMER } from '@/lib/drycleanPrices';

export default function DryPriceTooltip() {
  return (
    <div className="max-w-[20rem]">
      <div className="mb-2 text-sm font-semibold text-gray-900">
        Sample Dry-Clean Pricing
      </div>
      
      <div className="max-h-[280px] overflow-y-auto">
        <ul className="space-y-1.5">
          {DRY_CLEAN_PRICE_SAMPLES.map((item) => (
            <li key={item.key} className="flex justify-between gap-3 text-xs">
              <span className="text-gray-700">
                {item.label}
                {item.note && (
                  <em className="ml-1.5 text-[10px] text-gray-500">({item.note})</em>
                )}
              </span>
              <span className="shrink-0 font-semibold text-gray-900 tabular-nums">
                {item.approx}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-[11px] leading-4 text-gray-600">
          {DRY_CLEAN_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
