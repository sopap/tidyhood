'use client';
import * as React from 'react';
import { ORDER_STEPS, stepIndex, OrderStep } from '@/lib/orderStatus';

export default function ProgressTracker({ current }: { current: OrderStep }) {
  const idx = stepIndex(current);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Auto-scroll to current step on mobile
    if (scrollContainerRef.current) {
      const currentStep = scrollContainerRef.current.querySelector('[aria-current="step"]');
      currentStep?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, []);

  return (
    <>
      {/* Mobile: horizontal scroll - icon only */}
      <div className="md:hidden">
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto focus-within:ring-2 focus-within:ring-blue-500 rounded-lg"
          tabIndex={0}
          role="region"
          aria-label="Order progress timeline"
        >
          <ol className="flex items-center justify-center gap-3 px-2 py-3" aria-label="Order progress">
            {ORDER_STEPS.map((s, i) => {
              const done = i <= idx;
              return (
                <li key={s.key} className="flex flex-col items-center gap-1">
                  <span 
                    className={`grid h-10 w-10 flex-shrink-0 place-items-center rounded-full text-lg transition-colors ${
                      done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                    } ${i === idx ? 'ring-2 ring-blue-300 ring-offset-2' : ''}`}
                    aria-current={i === idx ? 'step' : undefined}
                    role="img"
                    aria-label={`${s.label} ${done ? '(completed)' : '(pending)'}`}
                    title={s.label}
                  >
                    {s.icon}
                  </span>
                  {i === idx && (
                    <span className="text-[10px] font-medium text-blue-600 text-center">Current</span>
                  )}
                  {i < ORDER_STEPS.length - 1 && (
                    <span className="absolute left-[calc(50%+24px)] h-px w-6 bg-gray-300 top-5" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <p className="mt-2 text-xs text-gray-500 text-center">Tap icon to see step name</p>
      </div>

      {/* Desktop: slim vertical */}
      <div className="hidden md:block">
        <ol className="relative ml-4 border-l-2 border-gray-200 pl-6" aria-label="Order progress">
          {ORDER_STEPS.map((s, i) => {
            const done = i <= idx;
            return (
              <li key={s.key} className="mb-8 last:mb-0 relative">
                <span 
                  className={`absolute -left-[1.6rem] grid h-7 w-7 place-items-center rounded-full text-sm ring-4 ring-white transition-all ${
                    done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  } ${i === idx ? 'ring-blue-100 scale-110' : ''}`}
                  role="img"
                  aria-label={s.label}
                >
                  {s.icon}
                </span>
                <div className={`text-sm font-medium ${done ? 'text-gray-900' : 'text-gray-500'}`}>
                  {s.label}
                  {i === idx && <span className="ml-2 text-xs text-blue-600 font-normal">(current)</span>}
                </div>
                {done && i < idx && <div className="text-xs text-green-600 mt-0.5">✓ Completed</div>}
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
