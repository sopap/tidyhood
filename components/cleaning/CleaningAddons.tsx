'use client';

import { CleaningType, CleaningAddonKey } from '@/lib/types';
import { CLEANING_ADDONS } from '@/lib/cleaningAddons';

interface CleaningAddonsProps {
  type: CleaningType;
  value: Record<CleaningAddonKey, boolean>;
  onChange: (value: Record<CleaningAddonKey, boolean>) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  core: 'Recommended',
  premium: 'Premium',
  moveOut: 'Move-Out Options',
};

export default function CleaningAddons({ type, value, onChange }: CleaningAddonsProps) {
  // Filter visible add-ons based on showIf condition
  const visibleAddons = CLEANING_ADDONS.filter((addon) => !addon.showIf || addon.showIf({ type }));
  
  // Group by category
  const byCategory = (cat: string) => visibleAddons.filter((addon) => addon.category === cat);

  const handleToggle = (key: CleaningAddonKey) => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div className="mt-3 text-sm leading-5">
      {[
        ['core', CATEGORY_LABELS.core],
        ['premium', CATEGORY_LABELS.premium],
        ['moveOut', CATEGORY_LABELS.moveOut],
      ].map(([cat, label]) => {
        const items = byCategory(cat);
        if (!items.length) return null;

        return (
          <section key={cat} className="mt-4 first:mt-0">
            <h4 className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-2">
              {label}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {items.map((addon) => (
                <label
                  key={addon.key}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2.5 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={!!value[addon.key]}
                      onChange={() => handleToggle(addon.key)}
                    />
                    <span className="font-medium">{addon.label}</span>
                  </span>
                  <span className="shrink-0 text-blue-700 font-medium ml-2">
                    {addon.price !== undefined ? `+$${addon.price}` : 'TBD'}
                  </span>
                </label>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
