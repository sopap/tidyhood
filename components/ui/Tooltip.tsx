'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { trapFocus } from '@/lib/a11y';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isVisible || !tooltipRef.current) return;

    const cleanup = trapFocus(tooltipRef.current);
    return cleanup;
  }, [isVisible]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsVisible(false);
      triggerRef.current?.focus();
    }
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <span className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={(e) => {
          // Keep tooltip open if focus moves to tooltip content
          if (!e.relatedTarget || !tooltipRef.current?.contains(e.relatedTarget as Node)) {
            setIsVisible(false);
          }
        }}
        aria-label="More information"
        aria-expanded={isVisible}
        className="inline-flex items-center justify-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full"
      >
        {children}
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          role="dialog"
          onKeyDown={handleKeyDown}
          className={`absolute z-50 px-3 py-3 text-sm bg-white border border-gray-200 rounded-lg shadow-lg ${positionClasses[position]}`}
        >
          {content}
        </div>
      )}
    </span>
  );
}
