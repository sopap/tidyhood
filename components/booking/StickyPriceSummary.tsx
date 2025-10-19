'use client'

import { PriceSummary } from '@/components/ui/PriceDisplay'

interface StickyPriceSummaryProps {
  subtotal: number
  tax: number
  total: number
  serviceType?: 'laundry' | 'cleaning'
  isEstimate?: boolean
}

export function StickyPriceSummary({
  subtotal,
  tax,
  total,
  serviceType = 'laundry',
  isEstimate = true
}: StickyPriceSummaryProps) {
  if (total <= 0) return null

  return (
    <>
      {/* Desktop sticky sidebar */}
      <div className="hidden lg:block fixed top-20 right-8 w-80 z-40 animate-in slide-in-from-right duration-300">
        <div className="bg-white shadow-xl rounded-xl p-6 border-2 border-brand-100">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <span>📋</span>
            <span>Your Order</span>
          </h3>
          
          <PriceSummary
            rows={[
              { label: 'Subtotal', amount: subtotal },
              { label: 'Tax (8.875%)', amount: tax }
            ]}
            total={total}
            totalLabel={isEstimate ? 'Estimated Total' : 'Total'}
            note={
              serviceType === 'laundry'
                ? 'Final price based on actual weight'
                : 'Final price confirmed after service'
            }
          />
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-xs text-blue-700 flex items-center gap-1.5">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span><strong>$0 charged now.</strong> Card saved securely. Pay after service.</span>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile floating price badge */}
      <div className="lg:hidden fixed bottom-24 right-4 bg-gradient-to-r from-brand to-brand-700 text-white px-5 py-3 rounded-full shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-2 font-semibold">
          <span className="text-lg">💰</span>
          <div>
            <div className="text-xs opacity-90">Estimated Total</div>
            <div className="text-lg font-bold">${total.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </>
  )
}
