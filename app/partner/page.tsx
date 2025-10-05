'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
  stats: {
    today_orders: number;
    pending_quotes: number;
    in_progress: number;
    today_earnings: number;
    this_week_orders: number;
    completion_rate: number;
  };
  action_required: any[];
  todays_schedule: any[];
}

export default function PartnerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboardData() {
    try {
      const response = await fetch('/api/partner/dashboard');
      if (!response.ok) throw new Error('Failed to load dashboard');
      const result = await response.json();
      setData(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-1/2 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome to Your Dashboard
        </h1>
        <p className="text-gray-600">
          Here's your performance overview for today
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Today's Orders</div>
          <div className="text-3xl font-bold text-gray-900">{data.stats.today_orders}</div>
          <div className="text-xs text-gray-500 mt-1">
            {data.stats.this_week_orders} this week
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Pending Quotes</div>
          <div className="text-3xl font-bold text-blue-600">{data.stats.pending_quotes}</div>
          <div className="text-xs text-gray-500 mt-1">
            {data.stats.pending_quotes > 0 ? 'Action required' : 'All caught up'}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">In Progress</div>
          <div className="text-3xl font-bold text-yellow-600">{data.stats.in_progress}</div>
          <div className="text-xs text-gray-500 mt-1">Active orders</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500 mb-1">Today's Earnings</div>
          <div className="text-3xl font-bold text-green-600">
            ${data.stats.today_earnings.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {data.stats.completion_rate}% completion rate
          </div>
        </div>
      </div>

      {/* Action Required & Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Action Required */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Action Required
          </h2>
          {data.action_required.length > 0 ? (
            <div className="space-y-3">
              {data.action_required.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">#{order.order_id}</p>
                      <p className="text-sm text-gray-600">{order.service_type}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Pending Quote
                    </span>
                  </div>
                  <Link
                    href={`/partner/orders/${order.id}`}
                    className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Submit Quote →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No pending actions</p>
              <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
            </div>
          )}
        </div>
        
        {/* Today's Schedule */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Today's Schedule
          </h2>
          {data.todays_schedule.length > 0 ? (
            <div className="space-y-3">
              {data.todays_schedule.map((slot) => {
                const utilization = (slot.reserved_units / slot.max_units) * 100;
                const utilizationColor = utilization >= 80 ? 'text-red-600' : 
                                       utilization >= 50 ? 'text-yellow-600' : 'text-green-600';
                return (
                  <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(slot.slot_start).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })} - {new Date(slot.slot_end).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-sm text-gray-600">{slot.service_type}</p>
                      </div>
                      <span className={`text-sm font-medium ${utilizationColor}`}>
                        {slot.reserved_units}/{slot.max_units}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No slots scheduled today</p>
              <p className="text-sm text-gray-400 mt-1">Enjoy your day off!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
