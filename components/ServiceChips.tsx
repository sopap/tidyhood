'use client'

interface ServiceChipsProps {
  selected: 'LAUNDRY' | 'CLEANING' | 'BOTH' | null
  onChange: (service: 'LAUNDRY' | 'CLEANING') => void
  allowMultiple?: boolean
}

export function ServiceChips({ selected, onChange, allowMultiple = false }: ServiceChipsProps) {
  const isLaundrySelected = selected === 'LAUNDRY' || selected === 'BOTH'
  const isCleaningSelected = selected === 'CLEANING' || selected === 'BOTH'

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Service{allowMultiple ? 's' : ''}
      </label>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Laundry Service Chip */}
        <button
          type="button"
          onClick={() => onChange('LAUNDRY')}
          className={`
            flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all
            ${isLaundrySelected
              ? 'border-primary-600 bg-primary-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-gray-400'
            }
          `}
        >
          <div className="text-4xl mb-2">🧺</div>
          <div className="font-semibold text-gray-900">Laundry</div>
          <div className="text-xs text-gray-600 mt-1">from $26.25</div>
          {isLaundrySelected && (
            <div className="mt-2">
              <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </button>

        {/* Cleaning Service Chip */}
        <button
          type="button"
          onClick={() => onChange('CLEANING')}
          className={`
            flex flex-col items-center justify-center p-6 rounded-lg border-2 transition-all
            ${isCleaningSelected
              ? 'border-primary-600 bg-primary-50 shadow-md'
              : 'border-gray-300 bg-white hover:border-gray-400'
            }
          `}
        >
          <div className="text-4xl mb-2">✨</div>
          <div className="font-semibold text-gray-900">Cleaning</div>
          <div className="text-xs text-gray-600 mt-1">from $89</div>
          {isCleaningSelected && (
            <div className="mt-2">
              <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </button>
      </div>

      {allowMultiple && selected === 'BOTH' && (
        <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
          <span className="text-sm font-medium text-green-800">
            🎉 Bundle discount: Save $10 when booking both services!
          </span>
        </div>
      )}

      {!selected && (
        <p className="text-sm text-gray-500 text-center">
          Select a service to get started
        </p>
      )}
    </div>
  )
}
