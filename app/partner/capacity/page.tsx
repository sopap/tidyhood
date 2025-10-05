'use client';

import { useEffect, useState } from 'react';
import { getCapacityColor } from '@/lib/partner/constants';

interface CapacitySlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  service_type: string | null;
  max_orders: number;
  reserved_count: number;
  utilization: number;
}

interface DayGroup {
  date: string;
  dateObj: Date;
  slots: CapacitySlot[];
}

export default function CapacityViewPage() {
  const [slots, setSlots] = useState<CapacitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState<'7' | '14'>('14');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'laundry' | 'cleaning'>('all');

  useEffect(() => {
    fetchCapacity();
  }, [dateRange]);

  async function fetchCapacity() {
    try {
      setLoading(true);
      
      // Calculate date range
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + parseInt(dateRange));
      endDate.setHours(23, 59, 59, 999);

      // In a real implementation, this would call the capacity API
      // For now, we'll create mock data
      const mockSlots = generateMockSlots(startDate, endDate);
      
      setSlots(mockSlots);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load capacity');
    } finally {
      setLoading(false);
    }
  }

  function generateMockSlots(startDate: Date, endDate: Date): CapacitySlot[] {
    const slots: CapacitySlot[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Morning slot
      slots.push({
        id: `${currentDate.toISOString()}-morning`,
        date: currentDate.toISOString().split('T')[0],
        start_time: '08:00',
        end_time: '12:00',
        service_type: null,
        max_orders: 10,
        reserved_count: Math.floor(Math.random() * 10),
        utilization: Math.random() * 100
      });

      // Afternoon slot
      slots.push({
        id: `${currentDate.toISOString()}-afternoon`,
        date: currentDate.toISOString().split('T')[0],
        start_time: '13:00',
        end_time: '17:00',
        service_type: null,
        max_orders: 10,
        reserved_count: Math.floor(Math.random() * 10),
        utilization: Math.random() * 100
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return slots;
  }

  function groupSlotsByDay(): DayGroup[] {
    const filtered = serviceFilter === 'all' 
      ? slots 
      : slots.filter(slot => !slot.service_type || slot.service_type === serviceFilter);

    const groups: { [key: string]: CapacitySlot[] } = {};
    
    filtered.forEach(slot => {
      if (!groups[slot.date]) {
        groups[slot.date] = [];
      }
      groups[slot.date].push(slot);
    });

    return Object.keys(groups)
      .sort()
      .map(date => ({
        date,
        dateObj: new Date(date),
        slots: groups[date].sort((a, b) => a.start_time.localeCompare(b.start_time))
      }));
  }

  function formatDate(dateObj: Date): string {
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  function getUtilizationLabel(utilization: number): string {
    if (utilization < 50) return 'Available';
    if (utilization < 80) return 'Moderate';
    return 'High';
  }

  const dayGroups = groupSlotsByDay();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Capacity Schedule</h1>
        <p className="text-gray-600 mt-1">View your schedule and availability</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as '7' | '14')}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7">Next 7 Days</option>
              <option value="14">Next 14 Days</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Type
            </label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Services</option>
              <option value="laundry">Laundry Only</option>
              <option value="cleaning">Cleaning Only</option>
            </select>
          </div>

          {/* Legend */}
          <div className="ml-auto">
            <p className="text-sm font-medium text-gray-700 mb-1">Utilization</p>
            <div className="flex gap-3 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                <span className="text-gray-600">&lt;50%</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                <span className="text-gray-600">50-80%</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                <span className="text-gray-600">&gt;80%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Calendar Grid */}
      {dayGroups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dayGroups.map((day) => (
            <div key={day.date} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Day Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">{formatDate(day.dateObj)}</h3>
                <p className="text-xs text-gray-500">{day.date}</p>
              </div>

              {/* Slots */}
              <div className="p-4 space-y-3">
                {day.slots.map((slot) => {
                  const utilization = Math.round(slot.utilization);
                  const colorClass = getCapacityColor(utilization);
                  
                  return (
                    <div
                      key={slot.id}
                      className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="text-sm font-medium text-gray-900">
                          {slot.start_time} - {slot.end_time}
                        </div>
                        <span className={`text-xs font-semibold ${colorClass}`}>
                          {getUtilizationLabel(utilization)}
                        </span>
                      </div>

                      {slot.service_type && (
                        <div className="text-xs text-gray-600 mb-2 capitalize">
                          {slot.service_type}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>
                          {slot.reserved_count} / {slot.max_orders} orders
                        </span>
                        <span className={`font-semibold ${colorClass}`}>
                          {utilization}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            utilization < 50
                              ? 'bg-green-500'
                              : utilization < 80
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(utilization, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-600">No capacity slots found for the selected period.</p>
        </div>
      )}

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              <strong>Read-Only View:</strong> This page displays your current capacity schedule. To modify capacity slots or availability, please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
