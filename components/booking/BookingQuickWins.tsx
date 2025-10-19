'use client'

/**
 * Quick Win Components for Booking Flow UX Improvements
 * Implementation of high-impact, low-effort conversion optimizations
 */

interface TimeEstimateBadgeProps {
  minutes?: number
}

export function TimeEstimateBadge({ minutes = 3 }: TimeEstimateBadgeProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
      <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>
        Takes about <strong className="text-gray-900">{minutes} minutes</strong> to complete
      </span>
    </div>
  )
}

interface SocialProofBannerProps {
  count?: number
  service?: 'laundry' | 'cleaning'
  timeframe?: 'today' | 'this week' | 'this month'
}

export function SocialProofBanner({ 
  count = 73, 
  service = 'laundry',
  timeframe = 'this week'
}: SocialProofBannerProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 animate-in fade-in slide-in-from-top duration-500">
      <p className="text-sm text-green-800 flex items-center gap-2">
        <span className="text-lg flex-shrink-0">✓</span>
        <span>
          <strong>{count} people</strong> booked {service} in Harlem {timeframe}
        </span>
      </p>
    </div>
  )
}

interface RushServiceCostBadgeProps {
  subtotal: number
  isActive: boolean
}

export function RushServiceCostBadge({ subtotal, isActive }: RushServiceCostBadgeProps) {
  if (subtotal <= 0) return null
  
  const rushFee = subtotal * 0.25
  
  return (
    <span className={`font-bold ml-2 transition-all ${
      isActive ? 'text-brand scale-110' : 'text-gray-400'
    }`}>
      +${rushFee.toFixed(2)}
    </span>
  )
}

interface SlotScarcityBadgeProps {
  available: number
  threshold?: number
}

export function SlotScarcityBadge({ available, threshold = 3 }: SlotScarcityBadgeProps) {
  if (available > threshold) {
    return (
      <span className="text-xs text-gray-400">
        {available} available
      </span>
    )
  }
  
  if (available === 0) {
    return (
      <span className="text-xs text-red-600 font-semibold">
        ⛔ Fully booked
      </span>
    )
  }
  
  return (
    <span className="text-xs text-orange-600 font-semibold flex items-center gap-1 animate-pulse">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      Only {available} left!
    </span>
  )
}

interface CopyImprovementProps {
  type: 'schedule' | 'payment' | 'instructions' | 'loading' | 'noSlots'
  data?: any
}

export function ImprovedCopy({ type, data }: CopyImprovementProps) {
  const copies = {
    schedule: 'Choose Your Time',
    payment: 'Secure Your Booking',
    instructions: 'Anything We Should Know?',
    loading: 'Finding available times...',
    noSlots: (
      <>
        This date is fully booked.{' '}
        {data?.nextDate && (
          <button 
            onClick={data.onSelectNextDate}
            className="text-brand hover:text-brand-700 underline font-medium"
          >
            Try {data.nextDate}
          </button>
        )}
      </>
    )
  }
  
  return <>{copies[type]}</>
}

interface TouchFriendlySlotProps {
  slot: {
    partner_id: string
    partner_name: string
    slot_start: string
    slot_end: string
    available_units: number
  }
  isSelected: boolean
  onSelect: () => void
}

export function TouchFriendlySlot({ slot, isSelected, onSelect }: TouchFriendlySlotProps) {
  return (
    <label
      className={`
        flex items-center justify-between 
        p-4 md:p-3
        min-h-[60px]
        border-2 rounded-xl cursor-pointer 
        transition-all duration-200
        hover:border-brand-300 hover:shadow-md
        active:scale-[0.98]
        ${isSelected 
          ? 'border-brand bg-brand-50 ring-2 ring-brand-200 shadow-lg' 
          : 'border-gray-200'
        }
      `}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <input
          type="radio"
          checked={isSelected}
          onChange={onSelect}
          className="flex-shrink-0 w-5 h-5"
        />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm">
            {new Date(slot.slot_start).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}{' '}
            -{' '}
            {new Date(slot.slot_end).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
          <div className="text-xs text-gray-500 truncate">{slot.partner_name}</div>
        </div>
      </div>
      <div className="ml-2 flex-shrink-0">
        <SlotScarcityBadge available={slot.available_units} />
      </div>
    </label>
  )
}
