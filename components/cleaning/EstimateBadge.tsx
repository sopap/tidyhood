'use client';

import { CleaningAddonKey } from '@/lib/types';
import { CLEANING_ADDONS } from '@/lib/cleaningAddons';

interface EstimateBadgeProps {
  addons: Record<CleaningAddonKey, boolean>;
}

export default function EstimateBadge({ addons }: EstimateBadgeProps) {
  // Calculate total from selected add-ons with defined prices
  const addonsTotal = CLEANING_ADDONS.reduce((sum, addon) => {
    if (addons[addon.key] && addon.price !== undefined) {
      return sum + addon.price;
    }
    return sum;
  }, 0);

  if (addonsTotal === 0) return null;

  return (
    <div role="status" aria-live="polite" className="text-xs text-gray-600 mt-2">
      Selected add-ons: <span className="font-medium text-blue-700">+${addonsTotal}</span>
    </div>
  );
}
