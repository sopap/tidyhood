'use client';

import { Info } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import { ADDON_INFO, AddonKey } from '@/lib/types';

interface AddonsProps {
  value: Partial<Record<AddonKey, boolean>>;
  onChange: (value: Partial<Record<AddonKey, boolean>>) => void;
}

export default function Addons({ value, onChange }: AddonsProps) {
  const addonKeys: AddonKey[] = ['LND_RUSH_24HR', 'LND_DELICATE', 'LND_EXTRA_SOFTENER', 'LND_FOLDING'];

  const handleToggle = (key: AddonKey) => {
    onChange({
      ...value,
      [key]: !value[key],
    });
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Add-ons (Optional)
      </label>
      {addonKeys.map((key) => {
        const addon = ADDON_INFO[key];
        const isChecked = value[key] || false;

        return (
          <label
            key={key}
            className={`flex items-center justify-between gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
              isChecked
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="flex items-center gap-2 flex-1">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(key)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-describedby={`${key}-desc`}
              />
              <span className="text-sm font-medium text-gray-900">{addon.label}</span>
              <Tooltip content={addon.description}>
                <Info className="h-4 w-4" aria-hidden="true" />
              </Tooltip>
            </span>
            <span className="text-sm font-semibold text-blue-600">+${addon.price}</span>
            <span id={`${key}-desc`} className="sr-only">
              {addon.description}
            </span>
          </label>
        );
      })}
    </div>
  );
}
