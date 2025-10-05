'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Partner {
  id: string;
  name: string;
  service_type: 'LAUNDRY' | 'CLEANING';
  contact_email: string;
  contact_phone: string;
  address: string | null;
  active: boolean;
  payout_percent: number;
  service_areas: string[];
  max_orders_per_slot?: number;
  max_minutes_per_slot?: number;
  created_at: string;
  updated_at: string;
}

interface Stats {
  total_orders: number;
  completed_orders: number;
  in_progress: number;
  total_revenue_cents: number;
}

export default function PartnerDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchPartner();
  }, [params.id]);

  async function fetchPartner() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners/${params.id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch partner');
      }
      
      const data = await res.json();
      setPartner(data.partner);
      setStats(data.stats);
    } catch (err) {
      console.error('Error fetching partner:', err);
      setError(err instanceof Error ? err.message : 'Failed to load partner');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive() {
    if (!partner) return;
    
    setToggling(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !partner.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to toggle status');
      }

      const data = await res.json();
      setPartner(data.partner);
    } catch (err) {
      console.error('Error toggling status:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle status');
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !partner) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
          <Link href="/admin/partners" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
            ← Back to Partners
          </Link>
        </div>
      </div>
    );
  }

  if (!partner) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/partners"
          className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
        >
          ← Back to Partners
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{partner.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              {partner.active ? (
                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                  Active
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                  Inactive
                </span>
              )}
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {partner.service_type}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleActive}
              disabled={toggling}
              className={`px-4 py-2 rounded-lg transition disabled:opacity-50 ${
                partner.active
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {toggling ? 'Updating...' : partner.active ? 'Deactivate' : 'Activate'}
            </button>
            <Link
              href={`/admin/partners/${partner.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Edit Partner
            </Link>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_orders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed_orders}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.in_progress}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              ${(stats.total_revenue_cents / 100).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Partner Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-gray-900 mt-1">{partner.contact_email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="text-gray-900 mt-1">{partner.contact_phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Address</p>
              <p className="text-gray-900 mt-1">{partner.address || 'No address provided'}</p>
            </div>
          </div>
        </div>

        {/* Business Configuration */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Business Configuration</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-600">Service Type</p>
              <p className="text-gray-900 mt-1">{partner.service_type}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Payout Percentage</p>
              <p className="text-gray-900 mt-1">{partner.payout_percent}%</p>
            </div>
            {partner.service_type === 'LAUNDRY' && partner.max_orders_per_slot && (
              <div>
                <p className="text-sm text-gray-600">Max Orders Per Slot</p>
                <p className="text-gray-900 mt-1">{partner.max_orders_per_slot} orders</p>
              </div>
            )}
            {partner.service_type === 'CLEANING' && partner.max_minutes_per_slot && (
              <div>
                <p className="text-sm text-gray-600">Max Minutes Per Slot</p>
                <p className="text-gray-900 mt-1">{partner.max_minutes_per_slot} minutes</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Service Areas */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Service Areas</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {partner.service_areas && partner.service_areas.length > 0 ? (
              partner.service_areas.map((zip, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {zip}
                </span>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No service areas defined</p>
            )}
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Metadata</h2>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <p className="text-sm text-gray-600">Partner ID</p>
            <p className="text-gray-900 mt-1 font-mono text-sm">{partner.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Created</p>
            <p className="text-gray-900 mt-1">
              {new Date(partner.created_at).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Last Updated</p>
            <p className="text-gray-900 mt-1">
              {new Date(partner.updated_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/orders?partner=${partner.id}`}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            View Orders
          </Link>
          <Link
            href={`/admin/capacity?partner=${partner.id}`}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Manage Capacity
          </Link>
          <Link
            href={`/admin/partners/${partner.id}/edit`}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
          >
            Edit Details
          </Link>
        </div>
      </div>
    </div>
  );
}
