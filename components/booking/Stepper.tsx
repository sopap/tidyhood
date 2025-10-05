'use client';

interface StepperProps {
  currentStep: number;
  steps?: string[];
}

export default function Stepper({ currentStep, steps = ['Address', 'Service', 'Schedule', 'Contact'] }: StepperProps) {
  return (
    <nav aria-label="Booking progress" className="mb-6">
      <ol className="flex items-center gap-2 sm:gap-4">
        {steps.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isComplete = stepNumber < currentStep;
          
          return (
            <li key={label} className="flex items-center gap-2">
              <div className="flex items-center">
                <span
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isComplete
                      ? 'bg-blue-600 text-white'
                      : isActive
                      ? 'bg-white text-blue-600 ring-2 ring-blue-600'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isComplete ? (
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </span>
                <span className="ml-2 text-sm font-medium text-gray-700 hidden sm:inline">
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 w-8 sm:w-12 transition-colors ${
                    isComplete ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
