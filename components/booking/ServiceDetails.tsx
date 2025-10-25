'use client';

import { ServiceType, WeightTier, AddonKey } from '@/lib/types';
import ServiceTypeSelector from './ServiceTypeSelector';
import Addons from './Addons';
import Tooltip from '@/components/ui/Tooltip';
import DryPriceTooltip from '@/components/dryclean/DryPriceTooltip';
import { Info } from 'lucide-react';

interface ServiceDetailsProps {
  serviceType: ServiceType;
  onServiceTypeChange: (type: ServiceType) => void;
  weightTier?: WeightTier;
  onWeightTierChange: (tier: WeightTier) => void;
  addons: Partial<Record<AddonKey, boolean>>;
  onAddonsChange: (addons: Partial<Record<AddonKey, boolean>>) => void;
  specialInstructions?: string;
  onSpecialInstructionsChange?: (value: string) => void;
  availableServices?: string[];
}

// Feature flag for rush service on dry clean
const ALLOW_DRYCLEAN_RUSH = false;

export default function ServiceDetails({
  serviceType,
  onServiceTypeChange,
  weightTier,
  onWeightTierChange,
  addons,
  onAddonsChange,
  specialInstructions,
  onSpecialInstructionsChange,
  availableServices,
}: ServiceDetailsProps) {
  // Info text based on service type
  const getInfoText = () => {
    switch (serviceType) {
      case 'washFold':
        return 'Minimum pickup: 15 lbs. We weigh after pickup and send a quote to approve.';
      case 'dryClean':
        return 'Billed per item. Final quote after inspection.';
      case 'mixed':
        return "Bag dry-clean items separately. We'll weigh W&F and itemize dry clean.";
    }
  };

  // Weight tier options for wash & fold
  const weightTiers: Array<{ key: WeightTier; label: string; lbs: number; price: string }> = [
    { key: 'small', label: 'Small', lbs: 15, price: '$26' },
    { key: 'medium', label: 'Medium', lbs: 25, price: '$44' },
    { key: 'large', label: 'Large', lbs: 35, price: '$61' },
  ];

  // Filter addons based on service type
  const getAvailableAddons = (): AddonKey[] => {
    if (serviceType === 'washFold' || serviceType === 'mixed') {
      // All addons available for wash & fold and mixed (mixed shows W&F addons)
      return ['LND_RUSH_24HR', 'LND_DELICATE', 'LND_EXTRA_SOFTENER', 'LND_FOLDING'];
    } else if (serviceType === 'dryClean') {
      // Only rush for dry clean if feature flag enabled
      return ALLOW_DRYCLEAN_RUSH ? ['LND_RUSH_24HR'] : [];
    }
    return [];
  };

  const availableAddons = getAvailableAddons();

  // Filter addons to only include available ones
  const filteredAddons = Object.fromEntries(
    Object.entries(addons).filter(([key]) => availableAddons.includes(key as AddonKey))
  ) as Partial<Record<AddonKey, boolean>>;

  return (
    <div className="space-y-4">
      {/* Service Type Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Service Type</label>
        <ServiceTypeSelector 
          value={serviceType} 
          onChange={onServiceTypeChange}
          availableServices={availableServices}
        />
      </div>

      {/* Info Row with optional dry-clean pricing tooltip */}
      <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        <div className="flex items-center justify-between gap-2">
          <span>{getInfoText()}</span>
          {(serviceType === 'dryClean' || serviceType === 'mixed') && (
            <Tooltip content={<DryPriceTooltip />} position="top">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
                aria-label="View sample dry-clean prices"
              >
                <Info className="h-3.5 w-3.5" />
                <span>Prices</span>
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Weight Tier Chips - only for washFold */}
      {serviceType === 'washFold' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Size</label>
          <div className="flex flex-wrap gap-2">
            {weightTiers.map((tier) => (
              <button
                key={tier.key}
                type="button"
                onClick={() => onWeightTierChange(tier.key)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  weightTier === tier.key
                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-200 text-blue-900'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                }`}
                aria-pressed={weightTier === tier.key}
              >
                {tier.label} ~{tier.lbs} lbs ~{tier.price}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add-ons */}
      {availableAddons.length > 0 && (
        <Addons value={filteredAddons} onChange={onAddonsChange} />
      )}

      {/* Mixed service helper */}
      {serviceType === 'mixed' && onSpecialInstructionsChange && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pickup Notes (Optional)
          </label>
          <p className="text-xs text-gray-600 mb-2">
            Optional: add a note with items (e.g., 3 shirts, 1 dress)
          </p>
          <textarea
            value={specialInstructions || ''}
            onChange={(e) => onSpecialInstructionsChange(e.target.value)}
            placeholder="e.g., Doorman pickup, leave with concierge, specific items..."
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
