'use client';

import { useState, useEffect } from 'react';
import {
  calculateLaundryQuote,
  calculateCleaningQuote,
  getDefaultQuoteExpiry,
  type LaundryQuoteParams,
  type CleaningQuoteParams,
  type QuoteResult
} from '@/lib/partner/quoteCalculation';
import { LAUNDRY_PRICING, CLEANING_PRICING, QUOTE_LIMITS } from '@/lib/partner/constants';
import { getErrorMessage, logError } from '@/lib/partner/errors';

interface QuoteFormProps {
  orderId: string;
  serviceType: 'laundry' | 'cleaning';
  orderDetails: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function QuoteForm({
  orderId,
  serviceType,
  orderDetails,
  onSuccess,
  onCancel
}: QuoteFormProps) {
  // Laundry form state
  const [weightLbs, setWeightLbs] = useState<number>(10);
  const [bagCount, setBagCount] = useState<number>(0);
  const [hasBedding, setHasBedding] = useState(false);
  const [hasDelicates, setHasDelicates] = useState(false);
  const [laundryAddons, setLaundryAddons] = useState({
    fold_package: false,
    same_day: false,
    eco_detergent: false
  });

  // Cleaning form state
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(120);
  const [cleaningAddons, setCleaningAddons] = useState({
    deep_clean: false,
    inside_fridge: false,
    inside_oven: false,
    inside_cabinets: false
  });

  // Common state
  const [notes, setNotes] = useState('');
  const [expiresAt, setExpiresAt] = useState(getDefaultQuoteExpiry());
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate quote in real-time
  useEffect(() => {
    if (serviceType === 'laundry') {
      const params: LaundryQuoteParams = {
        weight_lbs: weightLbs,
        bag_count: bagCount || undefined,
        has_bedding: hasBedding,
        has_delicates: hasDelicates,
        addons: laundryAddons
      };
      const result = calculateLaundryQuote(params);
      setQuote(result);
    } else if (serviceType === 'cleaning') {
      const params: CleaningQuoteParams = {
        estimated_minutes: estimatedMinutes,
        customer_addons_total: orderDetails?.customer_addons_total || 0,
        additional_addons: cleaningAddons
      };
      const result = calculateCleaningQuote(params);
      setQuote(result);
    }
  }, [
    serviceType,
    weightLbs,
    bagCount,
    hasBedding,
    hasDelicates,
    laundryAddons,
    estimatedMinutes,
    cleaningAddons,
    orderDetails
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!quote || !quote.is_valid) {
      setError('Please fix validation errors before submitting');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const quoteData = {
        total_cents: quote.total_cents,
        breakdown: quote.breakdown,
        expires_at: expiresAt.toISOString(),
        notes: notes.trim() || undefined,
        // Service-specific details
        ...(serviceType === 'laundry' && {
          weight_lbs: weightLbs,
          bag_count: bagCount || undefined,
          has_bedding: hasBedding,
          has_delicates: hasDelicates,
          addons: laundryAddons
        }),
        ...(serviceType === 'cleaning' && {
          estimated_minutes: estimatedMinutes,
          additional_addons: cleaningAddons
        })
      };

      const response = await fetch(`/api/partner/orders/${orderId}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quoteData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit quote');
      }

      onSuccess();
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      logError(err, {
        orderId,
        serviceType,
        action: 'quote_submission'
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Service-specific inputs */}
      {serviceType === 'laundry' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Laundry Details</h3>
          
          {/* Weight */}
          <div>
            <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-1">
              Weight (lbs) *
            </label>
            <input
              id="weight"
              type="number"
              min={QUOTE_LIMITS.MIN_WEIGHT}
              max={QUOTE_LIMITS.MAX_WEIGHT}
              step="0.1"
              value={weightLbs}
              onChange={(e) => setWeightLbs(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Min: {QUOTE_LIMITS.MIN_WEIGHT} lbs, Max: {QUOTE_LIMITS.MAX_WEIGHT} lbs
            </p>
          </div>

          {/* Bag Count */}
          <div>
            <label htmlFor="bags" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Bags (optional)
            </label>
            <input
              id="bags"
              type="number"
              min="0"
              value={bagCount}
              onChange={(e) => setBagCount(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              ${LAUNDRY_PRICING.BAG_FEE.toFixed(2)} per bag
            </p>
          </div>

          {/* Flags */}
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasBedding}
                onChange={(e) => setHasBedding(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Has Bedding (+${LAUNDRY_PRICING.BEDDING_SURCHARGE.toFixed(2)})
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasDelicates}
                onChange={(e) => setHasDelicates(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Has Delicates (+${LAUNDRY_PRICING.DELICATES_SURCHARGE.toFixed(2)})
              </span>
            </label>
          </div>

          {/* Addons */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Additional Services</p>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={laundryAddons.fold_package}
                  onChange={(e) => setLaundryAddons({...laundryAddons, fold_package: e.target.checked})}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Fold & Package (+${LAUNDRY_PRICING.FOLD_PACKAGE.toFixed(2)})
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={laundryAddons.same_day}
                  onChange={(e) => setLaundryAddons({...laundryAddons, same_day: e.target.checked})}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Same Day Service (+${LAUNDRY_PRICING.SAME_DAY.toFixed(2)})
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={laundryAddons.eco_detergent}
                  onChange={(e) => setLaundryAddons({...laundryAddons, eco_detergent: e.target.checked})}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Eco-Friendly Detergent (+${LAUNDRY_PRICING.ECO_DETERGENT.toFixed(2)})
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {serviceType === 'cleaning' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Cleaning Details</h3>
          
          {/* Estimated Minutes */}
          <div>
            <label htmlFor="minutes" className="block text-sm font-medium text-gray-700 mb-1">
              Estimated Time (minutes) *
            </label>
            <input
              id="minutes"
              type="number"
              min={QUOTE_LIMITS.MIN_TIME}
              max={QUOTE_LIMITS.MAX_TIME}
              step="15"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Min: {QUOTE_LIMITS.MIN_TIME} min, Max: {QUOTE_LIMITS.MAX_TIME} min (${CLEANING_PRICING.PER_MINUTE.toFixed(2)}/min)
            </p>
          </div>

          {/* Customer Selected Addons (display only) */}
          {orderDetails?.addons && orderDetails.addons.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Customer Selected Addons</p>
              <div className="flex flex-wrap gap-2">
                {orderDetails.addons.map((addon: string) => (
                  <span
                    key={addon}
                    className="px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded"
                  >
                    {addon}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Addons */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Additional Services</p>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cleaningAddons.deep_clean}
                  onChange={(e) => setCleaningAddons({...cleaningAddons, deep_clean: e.target.checked})}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Deep Clean (+{CLEANING_PRICING.DEEP_CLEAN.minutes} min, +${CLEANING_PRICING.DEEP_CLEAN.price.toFixed(2)})
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cleaningAddons.inside_fridge}
                  onChange={(e) => setCleaningAddons({...cleaningAddons, inside_fridge: e.target.checked})}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Inside Fridge (+{CLEANING_PRICING.INSIDE_FRIDGE.minutes} min, +${CLEANING_PRICING.INSIDE_FRIDGE.price.toFixed(2)})
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cleaningAddons.inside_oven}
                  onChange={(e) => setCleaningAddons({...cleaningAddons, inside_oven: e.target.checked})}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Inside Oven (+{CLEANING_PRICING.INSIDE_OVEN.minutes} min, +${CLEANING_PRICING.INSIDE_OVEN.price.toFixed(2)})
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={cleaningAddons.inside_cabinets}
                  onChange={(e) => setCleaningAddons({...cleaningAddons, inside_cabinets: e.target.checked})}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Inside Cabinets (+{CLEANING_PRICING.INSIDE_CABINETS.minutes} min, +${CLEANING_PRICING.INSIDE_CABINETS.price.toFixed(2)})
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Common fields */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any additional details or special considerations..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label htmlFor="expires" className="block text-sm font-medium text-gray-700 mb-1">
          Quote Expires
        </label>
        <input
          id="expires"
          type="datetime-local"
          value={expiresAt.toISOString().slice(0, 16)}
          onChange={(e) => setExpiresAt(new Date(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Price Preview */}
      {quote && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Price Breakdown</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Base:</span>
              <span className="font-medium">${quote.breakdown.base.toFixed(2)}</span>
            </div>
            
            {quote.breakdown.surcharges.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-gray-600">+ {item.label}:</span>
                <span className="font-medium">${item.amount.toFixed(2)}</span>
              </div>
            ))}
            
            {quote.breakdown.addons.map((item, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-gray-600">+ {item.label}:</span>
                <span className="font-medium">${item.amount.toFixed(2)}</span>
              </div>
            ))}
            
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-blue-600">${(quote.total_cents / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Validation Errors */}
          {quote.validation_errors.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-medium text-red-800 mb-1">Validation Errors:</p>
              <ul className="text-sm text-red-700 list-disc list-inside">
                {quote.validation_errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !quote?.is_valid}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Quote'
          )}
        </button>
      </div>
    </form>
  );
}
