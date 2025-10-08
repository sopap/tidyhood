'use client';

import { Calendar, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface SlotEmptyStateProps {
  type: 'no-slots' | 'all-full' | 'loading-error';
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  suggestedDates?: string[];
}

export default function SlotEmptyState({
  type,
  selectedDate,
  onDateChange,
  suggestedDates = [],
}: SlotEmptyStateProps) {
  if (type === 'loading-error') {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Unable to load time slots
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          We're having trouble connecting. Please try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (type === 'all-full') {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          All slots are booked for {selectedDate}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          This date is popular! Try selecting a different day or join our waitlist.
        </p>

        {suggestedDates.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Available nearby dates:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestedDates.map(date => (
                <button
                  key={date}
                  onClick={() => onDateChange?.(date)}
                  className="px-3 py-2 bg-white border-2 border-blue-200 text-blue-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-sm font-medium"
                >
                  {new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Link
            href="/waitlist"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Join Waitlist
          </Link>
          <p className="text-xs text-gray-500">
            We'll notify you when slots open up
          </p>
        </div>
      </div>
    );
  }

  // no-slots
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
        <Calendar className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No availability for {selectedDate}
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        We're not operating on this date. Please select a different day.
      </p>
      <p className="text-xs text-gray-500 mb-4">
        💡 Tip: We're closed on Sundays
      </p>
      
      {suggestedDates.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Try these dates instead:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestedDates.map(date => (
              <button
                key={date}
                onClick={() => onDateChange?.(date)}
                className="px-3 py-2 bg-white border-2 border-blue-200 text-blue-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-sm font-medium"
              >
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
