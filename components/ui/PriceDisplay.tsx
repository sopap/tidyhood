import React from 'react';

interface PriceDisplayProps {
  amount: number; // Amount in dollars
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Simple price display component for showing monetary amounts
 * 
 * Usage:
 * <PriceDisplay amount={129.99} label="Total" />
 * <PriceDisplay amount={45.50} size="sm" label="Subtotal" />
 */
export function PriceDisplay({ 
  amount, 
  label = "Total", 
  size = 'md',
  className = '' 
}: PriceDisplayProps) {
  const sizeClasses = {
    sm: { amount: 'text-xl', label: 'text-xs' },
    md: { amount: 'price-amount', label: 'price-label' },
    lg: { amount: 'text-4xl font-bold text-gray-900', label: 'text-base font-medium text-gray-600' }
  };

  return (
    <div className={`price-display ${className}`}>
      <div className={sizeClasses[size].amount}>
        ${amount.toFixed(2)}
      </div>
      <div className={sizeClasses[size].label}>
        {label}
      </div>
    </div>
  );
}

interface PriceSummaryProps {
  rows: Array<{
    label: string;
    amount: number;
  }>;
  total: number;
  totalLabel?: string;
  note?: string;
  className?: string;
}

/**
 * PriceSummary component for order/quote breakdowns
 * 
 * Standardizes the pricing display across booking and order pages
 * 
 * Usage:
 * <PriceSummary
 *   rows={[
 *     { label: 'Subtotal', amount: 45.50 },
 *     { label: 'Tax (8.875%)', amount: 4.04 }
 *   ]}
 *   total={49.54}
 *   note="Final price confirmed after service"
 * />
 */
export function PriceSummary({ 
  rows, 
  total, 
  totalLabel = "Total", 
  note,
  className = '' 
}: PriceSummaryProps) {
  return (
    <div className={`price-summary ${className}`}>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="price-summary-row">
            <span>{row.label}:</span>
            <span>${row.amount.toFixed(2)}</span>
          </div>
        ))}
        
        <div className="price-summary-total">
          <span className="font-semibold">{totalLabel}:</span>
          <span className="price-summary-total-amount">
            ${total.toFixed(2)}
          </span>
        </div>
      </div>
      
      {note && (
        <div className="text-xs text-gray-600 mt-2">
          {note}
        </div>
      )}
    </div>
  );
}

interface EstimateBadgeProps {
  type: 'estimated' | 'minimum' | 'fixed';
  amount: number;
  className?: string;
}

/**
 * EstimateBadge for showing price estimates in different contexts
 * 
 * Usage:
 * <EstimateBadge type="estimated" amount={129.99} />
 * <EstimateBadge type="minimum" amount={45.50} />
 */
export function EstimateBadge({ type, amount, className = '' }: EstimateBadgeProps) {
  const typeConfig = {
    estimated: {
      label: "Estimated Total",
      note: "Final price based on actual weight/service"
    },
    minimum: {
      label: "Estimated Minimum",
      note: "Final price confirmed after inspection"
    },
    fixed: {
      label: "Total",
      note: undefined
    }
  };

  const config = typeConfig[type];

  return (
    <div className={`price-summary ${className}`}>
      <div className="price-summary-total">
        <span className="font-medium">{config.label}:</span>
        <span className="price-summary-total-amount">
          ${amount.toFixed(2)}
        </span>
      </div>
      {config.note && (
        <div className="text-xs text-gray-600 mt-1">
          {config.note}
        </div>
      )}
    </div>
  );
}

/**
 * Helper function to convert cents to dollars for display
 */
export function centsToPrice(cents: number): number {
  return cents / 100;
}

/**
 * Helper function to format currency consistently
 */
export function formatCurrency(amount: number, includeCents: boolean = true): string {
  if (includeCents || amount % 1 !== 0) {
    return `$${amount.toFixed(2)}`;
  }
  return `$${Math.round(amount)}`;
}

/**
 * WeightBasedPricing - Special component for laundry weight-based pricing
 */
interface WeightBasedPricingProps {
  estimatedWeight: number;
  actualWeight?: number;
  pricePerPound: number;
  basePrice?: number;
  className?: string;
}

export function WeightBasedPricing({ 
  estimatedWeight, 
  actualWeight, 
  pricePerPound, 
  basePrice = 0,
  className = '' 
}: WeightBasedPricingProps) {
  const estimatedTotal = basePrice + (estimatedWeight * pricePerPound);
  const actualTotal = actualWeight ? basePrice + (actualWeight * pricePerPound) : null;

  return (
    <div className={`price-summary ${className}`}>
      <div className="space-y-2">
        {basePrice > 0 && (
          <div className="price-summary-row">
            <span>Base Price:</span>
            <span>{formatCurrency(basePrice)}</span>
          </div>
        )}
        
        <div className="price-summary-row">
          <span>Estimated Weight:</span>
          <span>{estimatedWeight} lbs × {formatCurrency(pricePerPound)} = {formatCurrency(estimatedWeight * pricePerPound)}</span>
        </div>
        
        {actualWeight && (
          <div className="price-summary-row">
            <span>Actual Weight:</span>
            <span>{actualWeight} lbs × {formatCurrency(pricePerPound)} = {formatCurrency(actualWeight * pricePerPound)}</span>
          </div>
        )}
        
        <div className="price-summary-total">
          <span className="font-semibold">
            {actualWeight ? 'Final Total:' : 'Estimated Total:'}
          </span>
          <span className="price-summary-total-amount">
            {formatCurrency(actualTotal || estimatedTotal)}
          </span>
        </div>
      </div>
      
      {!actualWeight && (
        <div className="text-xs text-gray-600 mt-2">
          Final price based on actual weight at pickup
        </div>
      )}
    </div>
  );
}
