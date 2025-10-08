'use client';
import * as React from 'react';
import { ORDER_STEPS, stepIndex, OrderStep } from '@/lib/orderStatus';

export default function ProgressTracker({ current }: { current: OrderStep }) {
  const idx = stepIndex(current);

  const getStepColor = (stepIndex: number) => {
    if (stepIndex === 0) return { bg: 'bg-primary-500', border: 'border-primary-200' };
    if (stepIndex === 1) return { bg: 'bg-blue-500', border: 'border-blue-200' };
    if (stepIndex === 2) return { bg: 'bg-amber-500', border: 'border-amber-200' };
    if (stepIndex === 3) return { bg: 'bg-purple-500', border: 'border-purple-200' };
    if (stepIndex === 4) return { bg: 'bg-green-500', border: 'border-green-200' };
    return { bg: 'bg-gray-500', border: 'border-gray-200' };
  };

  return (
    <>
      <h3 className="text-lg font-semibold mb-6 text-center md:text-left">Progress</h3>
      
      {/* Desktop Timeline */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-8 left-0 w-full h-0.5 bg-gray-200">
            <div 
              className="h-full bg-primary-300 transition-all duration-300" 
              style={{ width: `${(idx / (ORDER_STEPS.length - 1)) * 100}%` }}
            ></div>
          </div>
          
          <div className="grid grid-cols-5 gap-4 relative z-10">
            {ORDER_STEPS.map((step, i) => {
              const isCompleted = i <= idx;
              const isCurrent = i === idx;
              const { bg, border } = getStepColor(i);
              
              return (
                <div key={step.key} className="text-center">
                  <div className={`w-16 h-16 ${bg} rounded-full flex items-center justify-center mx-auto mb-3 text-white shadow-lg transition-all duration-200 ${isCurrent ? 'scale-110 ring-4 ring-white' : ''}`}>
                    <span className="text-xl">{step.icon}</span>
                  </div>
                  <div className={`bg-white rounded-lg ${border} border-2 p-3 shadow-sm transition-all duration-200 ${isCurrent ? 'shadow-md scale-105' : ''}`}>
                    <h3 className={`font-bold text-sm mb-1 ${
                      i === 0 ? 'text-primary-700' : 
                      i === 1 ? 'text-blue-700' :
                      i === 2 ? 'text-amber-700' :
                      i === 3 ? 'text-purple-700' :
                      'text-green-700'
                    }`}>
                      {step.label}
                      {isCurrent && <span className="block text-xs text-gray-500 mt-1">(Current)</span>}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {step.description || getStepDescription(step.key)}
                    </p>
                    {isCompleted && i !== idx && (
                      <div className="text-xs text-green-600 font-medium mt-1">✓ Complete</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Mobile Steps */}
      <div className="md:hidden space-y-6">
        {ORDER_STEPS.map((step, i) => {
          const isCompleted = i <= idx;
          const isCurrent = i === idx;
          const { bg } = getStepColor(i);
          
          return (
            <div key={step.key} className="flex items-start space-x-4">
              <div className={`w-12 h-12 ${bg} rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}>
                <span className="text-lg">{step.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold mb-1 ${
                  i === 0 ? 'text-primary-700' : 
                  i === 1 ? 'text-blue-700' :
                  i === 2 ? 'text-amber-700' :
                  i === 3 ? 'text-purple-700' :
                  'text-green-700'
                }`}>
                  {step.label}
                  {isCurrent && <span className="text-xs text-blue-600 ml-2">(Current)</span>}
                </h3>
                <p className="text-sm text-gray-600">
                  {step.description || getStepDescription(step.key)}
                </p>
                {isCompleted && i !== idx && (
                  <div className="text-xs text-green-600 font-medium mt-1">✓ Complete</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function getStepDescription(stepKey: string): string {
  const descriptions = {
    'pending': 'Order created and waiting for pickup',
    'pending_pickup': 'Your order is scheduled for pickup',
    'at_facility': 'Items collected and at our facility',
    'awaiting_payment': 'Quote sent, awaiting your approval',
    'paid_processing': 'Payment received, processing your order',
    'in_progress': 'Your order is being processed',
    'out_for_delivery': 'On the way back to you',
    'delivered': 'Order delivered to your address',
    'completed': 'Service complete and delivered'
  };
  
  return descriptions[stepKey as keyof typeof descriptions] || 'Processing your order';
}
