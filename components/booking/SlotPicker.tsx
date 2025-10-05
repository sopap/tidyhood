'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { getMinDate, formatSlotTime, getCapacityBadge } from '@/lib/slots';
import { getSlotLabel, announceToScreenReader } from '@/lib/a11y';
import { BookingSlot } from '@/lib/types';

interface SlotPickerProps {
  zip: string;
  value?: { date: string; slot?: BookingSlot };
  onChange: (value: { date: string; slot?: BookingSlot }) => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SlotPicker({ zip, value, onChange }: SlotPickerProps) {
  const [selectedDate, setSelectedDate] = useState(value?.date || '');

  const { data, error, isLoading } = useSWR(
    selectedDate && zip ? `/api/slots?service=LAUNDRY&zip=${zip}&date=${selectedDate}` : null,
    fetcher
  );

  const slots: BookingSlot[] = data?.slots || [];

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
            <div role="status" className="text-sm text-red-600">
              No slots available for this date. Please select a different date.
            </div>
          )}

          {!isLoading && !error && slots.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Time slots">
              {slots.map((slot) => {
                const slotId = `slot-${slot.slot_start}`;
                const isSelected = value?.slot?.slot_start === slot.slot_start;
                const isFull = slot.available_units === 0;
                const badge = getCapacityBadge(slot.available_units);
                const timeLabel = formatSlotTime(slot.slot_start, slot.slot_end);
                const ariaLabel = getSlotLabel(
                  timeLabel.split(' - ')[0],
                  timeLabel.split(' - ')[1],
                  slot.available_units,
                  isFull
                );

                const badgeClasses = {
                  error: 'bg-red-100 text-red-800',
                  warning: 'bg-yellow-100 text-yellow-800',
                  success: 'bg-green-100 text-green-800',
                };

                return (
                  <button
                    key={slotId}
                    type="button"
                    onClick={() => !isFull && handleSlotSelect(slot)}
                    disabled={isFull}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={ariaLabel}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 text-left transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                        : isFull
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
                        : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                    } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  >
                    <span className={`font-medium ${isFull ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {timeLabel}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${badgeClasses[badge.variant]}`}
                    >
                      {badge.text}
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
