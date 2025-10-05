'use client';

import { Frequency, RECURRING_DISCOUNT } from '@/lib/types';

interface FrequencySelectorProps {
  value: Frequency;
  onChange: (frequency: Frequency) => void;
  firstVisitDeep?: boolean;
  onFirstVisitDeepChange?: (deep: boolean) => void;
}

const FREQUENCY_INFO: Record<Frequency, { label: string; discount?: string; description: string }> = {
  oneTime: {
    label: 'One-Time',
    description: 'Single cleaning service',
  },
  weekly: {
    label: 'Weekly',
    discount: '20% off',
    description: 'Every week (visits 2+)',
  },
  biweekly: {
    label: 'Bi-Weekly',
    discount: '15% off',
    description: 'Every 2 weeks (visits 2+)',
  },
  monthly: {
    label: 'Monthly',
    discount: '10% off',
    description: 'Every month (visits 2+)',
  },
};

export default function FrequencySelector({ 
  value, 
  onChange,
  firstVisitDeep,
  onFirstVisitDeepChange 
}: FrequencySelectorProps) {
  const frequencies: Frequency[] = ['oneTime', 'weekly', 'biweekly', 'monthly'];
  const isRecurring = value !== 'oneTime';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {frequencies.map((freq) => {
          const info = FREQUENCY_INFO[freq];
          const isSelected = value === freq;
          
          return (
            <button
              key={freq}
              type="button"
              onClick={() => onChange(freq)}
              className={`relative p-3 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <span className={`font-medium text-sm ${
                  isSelected ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {info.label}
                </span>
                {info.discount && (
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                    isSelected 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {info.discount}
                  </span>
                )}
              </div>
              <p className={`text-xs ${
                isSelected ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {info.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Recurring Info Banner */}
      {isRecurring && (
        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5">
          <p className="text-xs text-gray-700">
            <span className="font-medium">First visit billed at regular price.</span>
            {' '}
            {FREQUENCY_INFO[value].discount} discount starts on your second visit.
          </p>
        </div>
      )}

      {/* First Visit Deep Clean Option */}
      {isRecurring && onFirstVisitDeepChange && (
        <label className="flex items-start gap-2 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
          <input
            type="checkbox"
            checked={firstVisitDeep}
            onChange={(e) => onFirstVisitDeepChange(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              Make first visit a deep clean
            </div>
            <div className="text-xs text-gray-600 mt-0.5">
              Recommended for starting a recurring plan. First visit will be deep cleaned at regular rate, then switch to standard cleaning with recurring discount.
            </div>
          </div>
        </label>
      )}
    </div>
  );
}
