'use client';

import { ServiceType } from '@/lib/types';

interface ServiceTypeSelectorProps {
  value: ServiceType;
  onChange: (value: ServiceType) => void;
  availableServices?: string[];
}

export default function ServiceTypeSelector({ value, onChange, availableServices }: ServiceTypeSelectorProps) {
  const options: Array<{ key: ServiceType; label: string; capability: string }> = [
    { key: 'washFold', label: 'Wash & Fold', capability: 'wash_fold' },
    { key: 'dryClean', label: 'Dry Clean', capability: 'dry_clean' },
    { key: 'mixed', label: 'Mixed', capability: 'mixed' },
  ];

  // Check if a service is available
  const isAvailable = (capability: string) => {
    // If no availability data, show all services (fail open)
    if (!availableServices || availableServices.length === 0) {
      return true;
    }
    return availableServices.includes(capability);
  };

  return (
    <div
      className="inline-flex rounded-lg border border-gray-300 p-1 bg-white"
      role="tablist"
      aria-label="Service type"
    >
      {options.map((option) => {
        const available = isAvailable(option.capability);
        const isSelected = value === option.key;

        return (
          <button
            key={option.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={option.label}
            onClick={() => available && onChange(option.key)}
            disabled={!available}
            title={!available ? 'Not available in your area' : undefined}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isSelected
                ? 'bg-blue-600 text-white shadow-sm'
                : available
                ? 'text-gray-700 hover:bg-gray-50'
                : 'text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            {option.label}
            {!available && <span className="ml-1 text-xs">🚫</span>}
          </button>
        );
      })}
    </div>
  );
}
