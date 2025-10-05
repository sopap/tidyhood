'use client';

import { CleaningType } from '@/lib/types';

interface CleaningTypeSelectorProps {
  value: CleaningType;
  onChange: (type: CleaningType) => void;
}

const TYPE_INFO: Record<CleaningType, { label: string; description: string }> = {
  standard: {
    label: 'Standard',
    description: 'Regular home cleaning.',
  },
  deep: {
    label: 'Deep',
    description: 'More thorough, takes ~50% longer.',
  },
  moveOut: {
    label: 'Move-Out',
    description: 'Turnover clean for empty units; commonly includes fridge/oven/windows.',
  },
};

export default function CleaningTypeSelector({ value, onChange }: CleaningTypeSelectorProps) {
  const types: CleaningType[] = ['standard', 'deep', 'moveOut'];

  return (
    <div>
      <div role="tablist" aria-label="Cleaning type" className="inline-flex rounded-lg border p-1">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            role="tab"
            aria-selected={value === type}
            onClick={() => onChange(type)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              value === type
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {TYPE_INFO[type].label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-gray-600">{TYPE_INFO[value].description}</p>
    </div>
  );
}
