'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Partner {
  id: string;
  name: string;
  service_type: 'LAUNDRY' | 'CLEANING';
  contact_email: string;
  contact_phone: string;
  active: boolean;
  payout_percent: number;
  created_at: string;
}

export default function AdminPartners() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [serviceFilter, setServiceFilter] = useState<'all' | 'LAUNDRY' | 'CLEANING'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPartners();
  }, [filter, serviceFilter]);

  async function fetchPartners() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);
      if (serviceFilter !== 'all') params.append('service_type', serviceFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const res = await fetch(`/api/admin/partners?${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch partners');
      }
      
      const data = await res.json();
      setPartners(data.partners);
    } catch (err) {
      console.error('Error fetching partners:', err);
      setError(err instanceof Error ? err.message : 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchPartners();
  }

  const filteredPartners = partners.filter(p => {
    if (filter === 'active' && !p.active) return false;
    if (filter === 'inactive' && p.active) return false;
    if (serviceFilter !== 'all' && p.service_type !== serviceFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
        <Link
          href="/admin/partners/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Add Partner
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Search
            </button>
          </div>
          
          <div className="flex gap-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Services</option>
              <option value="LAUNDRY">Laundry</option>
              <option value="CLEANING">Cleaning</option>
            </select>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Partner List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-6 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2">Loading partners...</p>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <p className="text-lg font-medium">No partners found</p>
            <p className="text-sm mt-1">
              {searchQuery 
                ? 'Try adjusting your search criteria' 
                : 'Get started by adding your first partner'}
            </p>
            {!searchQuery && (
              <Link
                href="/admin/partners/new"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                + Add Partner
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPartners.map((partner) => (
              <div
                key={partner.id}
                className="p-6 hover:bg-gray-50 transition cursor-pointer"
                onClick={() => router.push(`/admin/partners/${partner.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {partner.name}
                      </h3>
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
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>✉️ {partner.contact_email}</span>
                      <span>📞 {partner.contact_phone}</span>
                      <span>💰 {partner.payout_percent}% payout</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/partners/${partner.id}/edit`}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/partners/${partner.id}`}
                      className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded transition"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {!loading && filteredPartners.length > 0 && (
        <div className="text-sm text-gray-600 text-center">
          Showing {filteredPartners.length} partner{filteredPartners.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
