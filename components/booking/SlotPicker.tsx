'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getMinDate, formatSlotTime } from '@/lib/slots';
import { announceToScreenReader } from '@/lib/a11y';
import { BookingSlot } from '@/lib/types';
import AddressRequiredState from './AddressRequiredState';

interface SlotPickerProps {
  zip: string;
  value?: { date: string; slot?: BookingSlot };
  onChange: (value: { date: string; slot?: BookingSlot }) => void;
  onScrollToAddress?: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SlotPicker({ zip, value, onChange, onScrollToAddress }: SlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState(value?.date || '');
  const [timePeriod, setTimePeriod] = useState<'all' | 'morning' | 'afternoon' | 'evening'>('all');

  const { data, error, isLoading } = useSWR(
    selectedDate && zip ? `/api/slots?service=LAUNDRY&zip=${zip}&date=${selectedDate}` : null,
    fetcher
  );

  const allSlots: BookingSlot[] = data?.slots || [];
  
  // Filter slots by time period
  const slots = allSlots.filter((slot) => {
    if (timePeriod === 'all') return true;
    const hour = new Date(slot.slot_start).getHours();
    if (timePeriod === 'morning') return hour >= 5 && hour < 12;
    if (timePeriod === 'afternoon') return hour >= 12 && hour < 17;
    if (timePeriod === 'evening') return hour >= 17;
    return true;
  });

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    onChange({ date, slot: undefined });
    
    if (date) {
      announceToScreenReader('Loading available time slots');
    }
  };

  const handleSlotSelect = (slot: BookingSlot) => {
    onChange({ date: selectedDate, slot });
    const time = formatSlotTime(slot.slot_start, slot.slot_end);
    announceToScreenReader(`Time slot selected: ${time}`);
  };

  // Show address required state if no zip code is provided
  if (!zip) {
    return (
      <AddressRequiredState 
        onEnterAddress={() => {
          if (onScrollToAddress) {
            onScrollToAddress();
          }
        }} 
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="pickup-date" className="block text-sm font-medium text-gray-700 mb-2">
          Pickup Date
        </label>
        <input
          id="pickup-date"
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          min={getMinDate()}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-describedby="date-help"
          required
        />
        <p id="date-help" className="mt-1 text-xs text-gray-500">
          Closed on Sundays. Select tomorrow or later.
        </p>
      </div>

      {selectedDate && (
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700 mb-2">
            Available Time Slots
          </legend>
          
          {/* Time period filters */}
          {allSlots.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {(['all', 'morning', 'afternoon', 'evening'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setTimePeriod(period)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    timePeriod === period
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period === 'all' ? 'All' : period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          )}
          
          <p className="text-xs text-gray-500 mb-3">
            We'll text you 15 min before arrival.
          </p>

          {isLoading && (
            <div role="status" aria-live="polite" className="text-sm text-gray-600">
              Loading available slots...
            </div>
          )}

          {error && (
            <div role="alert" className="text-sm text-red-600">
              Failed to load slots. Please try again.
            </div>
          )}

          {!isLoading && !error && slots.length === 0 && (
            <div role="status" className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-900 mb-1">
                No time slots available
              </p>
              <p className="text-xs text-gray-600">
                All slots are booked for this date. Please try another date.
              </p>
            </div>
          )}

          {!isLoading && !error && slots.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Time slots">
              {slots.map((slot) => {
                const slotId = `slot-${slot.slot_start}`;
                const isSelected = value?.slot?.slot_start === slot.slot_start;
                const timeLabel = formatSlotTime(slot.slot_start, slot.slot_end);
                const ariaLabel = `Time slot ${timeLabel.replace(' - ', ' to ')}`;

                return (
                  <button
                    key={slotId}
                    type="button"
                    onClick={() => handleSlotSelect(slot)}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={ariaLabel}
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    <span className="text-sm font-medium text-gray-900">
                      {timeLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}
