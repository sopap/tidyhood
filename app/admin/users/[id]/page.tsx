'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface UserData {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    created_at: string;
  };
  stats: {
    total_orders: number;
    lifetime_value: number;
    avg_order_value: number;
    last_order: string | null;
    favorite_service: string;
  };
  recent_orders: Array<{
    id: string;
    order_id: string;
    service_type: string;
    status: string;
    total_cents: number;
    created_at: string;
  }>;
  addresses: Array<{
    id: string;
    label: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    is_default: boolean;
  }>;
}

export default function UserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserDetail();
  }, [userId]);

  async function fetchUserDetail() {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      
      const result = await response.json();
      setData(result);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'out_for_delivery':
        return 'bg-orange-100 text-orange-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusLabel(status: string) {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading User</h3>
        <p className="text-red-700">{error || 'User not found'}</p>
        <Link
          href="/admin/users"
          className="mt-4 inline-block text-red-600 hover:text-red-700 font-medium"
        >
          ← Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/users"
            className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
          >
            ← Back to Users
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{data.user.name}</h1>
          <p className="text-gray-600 mt-1">User Details & Activity</p>
        </div>
      </div>

      {/* User Profile Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-base text-gray-900">{data.user.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Phone</p>
            <p className="text-base text-gray-900">{data.user.phone}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Role</p>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              data.user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
              data.user.role === 'partner' ? 'bg-blue-100 text-blue-800' :
              'bg-green-100 text-green-800'
            }`}>
              {data.user.role}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Member Since</p>
            <p className="text-base text-gray-900">
              {new Date(data.user.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-gray-900">{data.stats.total_orders}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Lifetime Value</p>
          <p className="text-3xl font-bold text-green-600">
            ${data.stats.lifetime_value.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Avg Order Value</p>
          <p className="text-3xl font-bold text-blue-600">
            ${data.stats.avg_order_value.toFixed(2)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500 mb-1">Last Order</p>
          <p className="text-lg font-semibold text-gray-900">
            {data.stats.last_order 
              ? new Date(data.stats.last_order).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })
              : 'Never'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Prefers {data.stats.favorite_service}
          </p>
        </div>
      </div>

      {/* Recent Orders and Addresses Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
            <Link
              href={`/admin/orders?user_id=${data.user.id}`}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </Link>
          </div>
          
          {data.recent_orders.length > 0 ? (
            <div className="space-y-3">
              {data.recent_orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-gray-900">#{order.order_id}</p>
                      <p className="text-sm text-gray-600">{order.service_type}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-gray-900">
                      ${(order.total_cents / 100).toFixed(2)}
                    </span>
                  </div>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No orders yet</p>
            </div>
          )}
        </div>

        {/* Saved Addresses */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Saved Addresses</h2>
          
          {data.addresses.length > 0 ? (
            <div className="space-y-3">
              {data.addresses.map((address) => (
                <div key={address.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium text-gray-900">
                      📍 {address.label || 'Address'}
                    </p>
                    {address.is_default && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {address.street}
                  </p>
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state} {address.zip}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No saved addresses</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
