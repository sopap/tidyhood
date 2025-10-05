'use client';

import { useEffect, useState } from 'react';

interface StickyCTAProps {
  label: string;
  price?: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function StickyCTA({ label, price, onClick, disabled }: StickyCTAProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show CTA after a small delay
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg md:hidden transition-transform duration-300 ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {price && (
            <div className="flex flex-col">
              <span className="text-xs text-gray-600">Estimated</span>
              <span className="text-lg font-bold text-blue-600">{price}</span>
            </div>
          )}
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="flex-1 btn-primary py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}
