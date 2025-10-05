'use client';

import { ServiceType } from '@/lib/types';

interface ServiceTypeSelectorProps {
  value: ServiceType;
  onChange: (value: ServiceType) => void;
}

export default function ServiceTypeSelector({ value, onChange }: ServiceTypeSelectorProps) {
  const options: Array<{ key: ServiceType; label: string }> = [
    { key: 'washFold', label: 'Wash & Fold' },
    { key: 'dryClean', label: 'Dry Clean' },
    { key: 'mixed', label: 'Mixed' },
  ];

  return (
    <div
      className="inline-flex rounded-lg border border-gray-300 p-1 bg-white"
      role="tablist"
      aria-label="Service type"
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="tab"
          aria-selected={value === option.key}
          aria-label={option.label}
          onClick={() => onChange(option.key)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            value === option.key
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
