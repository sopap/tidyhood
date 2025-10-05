import { quoteLaundry } from './pricing';
import { EstimateInput, EstimateResult, WEIGHT_TIER_POUNDS, ADDON_INFO } from './types';

/**
 * Calculate promo code discount
 */
function calculatePromoDiscount(code: string | undefined, subtotal: number): number {
  if (!code) return 0;
  
  const normalizedCode = code.trim().toUpperCase();
  
  // Percentage discounts
  if (normalizedCode === 'WELCOME10') {
    return Math.round(subtotal * 0.10 * 100) / 100;
  }
  
  // Fixed discounts
  if (normalizedCode === 'HARLEM5') {
    return 5;
  }
  
  return 0;
}

/**
 * Estimate laundry cost based on weight tier and add-ons
 * This wraps the existing database-driven pricing system
 */
export async function estimateLaundry(input: EstimateInput): Promise<EstimateResult> {
  const { serviceType, weightTier, addons, promoCode, zip } = input;
  
  // For dry clean, return placeholder
  if (serviceType === 'dryClean') {
    return {
      subtotal: 0,
      discount: 0,
      total: 0,
      breakdown: [
        {
          label: 'Dry Clean (per item)',
          amount: 0,
        },
      ],
    };
  }
  
  // For wash & fold or mixed, require weight tier
  if (!weightTier) {
    throw new Error('Weight tier required for wash & fold service');
  }
  
  // Convert weight tier to pounds
  const lbs = WEIGHT_TIER_POUNDS[weightTier];
  
  // Get addon keys that are enabled
  const enabledAddons = Object.entries(addons)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key);
  
  try {
    // Use existing pricing system
    const quote = await quoteLaundry({
      zip,
      lbs,
      addons: enabledAddons,
    });
    
    const subtotal = quote.subtotal_cents / 100;
    const discount = calculatePromoDiscount(promoCode, subtotal);
    const total = Math.max(0, subtotal - discount);
    
    // Build breakdown from pricing items
    const breakdown: Array<{ label: string; amount: number }> = [];
    
    // Add base laundry cost
    const baseItem = quote.items.find(item => item.key === 'LND_WF_PERLB');
    if (baseItem) {
      const tierLabel = weightTier ? `${weightTier}, ~${lbs} lbs` : `~${lbs} lbs`;
      breakdown.push({
        label: `Base (${tierLabel})`,
        amount: baseItem.total_cents / 100,
      });
    }
    
    // For mixed service, add dry clean placeholder
    if (serviceType === 'mixed') {
      breakdown.push({
        label: 'Dry Clean (TBD)',
        amount: 0,
      });
    }
    
    // Add add-ons
    for (const item of quote.items) {
      if (item.key !== 'LND_WF_PERLB' && item.key !== 'LND_DELIVERY_BASE') {
        const addonInfo = ADDON_INFO[item.key as keyof typeof ADDON_INFO];
        breakdown.push({
          label: addonInfo?.label || item.label,
          amount: item.total_cents / 100,
        });
      }
    }
    
    // Add promo discount
    if (discount > 0) {
      breakdown.push({
        label: `Promo (${promoCode})`,
        amount: -discount,
      });
    }
    
    return {
      subtotal,
      discount,
      total,
      breakdown,
    };
  } catch (error) {
    console.error('Estimate calculation error:', error);
    // Fallback to basic calculation if DB call fails
    return estimateFallback(input);
  }
}

/**
 * Fallback estimation without database (for offline/error scenarios)
 */
function estimateFallback(input: EstimateInput): EstimateResult {
  const { serviceType, weightTier, addons, promoCode } = input;
  
  // For dry clean, return placeholder
  if (serviceType === 'dryClean') {
    return {
      subtotal: 0,
      discount: 0,
      total: 0,
      breakdown: [
        {
          label: 'Dry Clean (per item)',
          amount: 0,
        },
      ],
    };
  }
  
  // Require weight tier for wash & fold
  if (!weightTier) {
    throw new Error('Weight tier required for wash & fold service');
  }
  
  // Base pricing by tier (per pound * estimated pounds)
  const BASE_PRICE_PER_LB = 1.75;
  const lbs = WEIGHT_TIER_POUNDS[weightTier];
  const baseCost = lbs * BASE_PRICE_PER_LB;
  
  const breakdown: Array<{ label: string; amount: number }> = [
    {
      label: `Base (${weightTier}, ~${lbs} lbs)`,
      amount: baseCost,
    },
  ];
  
  // For mixed service, add dry clean placeholder
  if (serviceType === 'mixed') {
    breakdown.push({
      label: 'Dry Clean (TBD)',
      amount: 0,
    });
  }
  
  let subtotal = baseCost;
  
  // Add add-ons
  for (const [key, enabled] of Object.entries(addons)) {
    if (enabled && key in ADDON_INFO) {
      const addon = ADDON_INFO[key as keyof typeof ADDON_INFO];
      breakdown.push({
        label: addon.label,
        amount: addon.price,
      });
      subtotal += addon.price;
    }
  }
  
  // Apply promo
  const discount = calculatePromoDiscount(promoCode, subtotal);
  if (discount > 0) {
    breakdown.push({
      label: `Promo (${promoCode})`,
      amount: -discount,
    });
  }
  
  const total = Math.max(0, subtotal - discount);
  
  return {
    subtotal,
    discount,
    total,
    breakdown,
  };
}

/**
 * Validate promo code
 */
export function validatePromoCode(code: string): { valid: boolean; message?: string } {
  const normalizedCode = code.trim().toUpperCase();
  
  if (normalizedCode === 'WELCOME10') {
    return { valid: true };
  }
  
  if (normalizedCode === 'HARLEM5') {
    return { valid: true };
  }
  
  return { valid: false, message: 'Invalid promo code' };
}
