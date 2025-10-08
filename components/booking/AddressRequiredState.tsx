'use client';

interface AddressRequiredStateProps {
  onEnterAddress: () => void;
}

/**
 * AddressRequiredState Component
 * 
 * Displays an informative message when an address is required to view time slots.
 * Features:
 * - Blue informative styling (not blocking/error)
 * - Action-oriented CTA button
 * - Smooth scroll to address section
 * - Accessibility compliant (WCAG 2.1 AA)
 * - Mobile responsive
 */
export default function AddressRequiredState({ onEnterAddress }: AddressRequiredStateProps) {
  return (
    <div 
      role="status"
      aria-live="polite"
      className="p-6 bg-blue-50 border-2 border-blue-200 rounded-xl"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Icon */}
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <svg 
            className="w-8 h-8 text-blue-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
            />
          </svg>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-blue-900">
            Address Required
          </h3>
          <p className="text-sm text-blue-700 max-w-md">
            Please enter your pickup address above to see available time slots in your area. 
            We'll show you all the times we can pick up your laundry.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onEnterAddress}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          aria-label="Scroll to address input field"
        >
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          Enter Address
        </button>
      </div>
    </div>
  );
}
