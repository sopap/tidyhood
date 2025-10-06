'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

interface Partner {
  id: string;
  name: string;
  service_type: 'LAUNDRY' | 'CLEANING';
  contact_email: string;
  contact_phone: string;
  address: string | null;
  payout_percent: number;
  service_areas: string[];
  max_orders_per_slot?: number;
  max_minutes_per_slot?: number;
}

export default function EditPartner({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    service_type: 'LAUNDRY' as 'LAUNDRY' | 'CLEANING',
    contact_email: '',
    contact_phone: '',
    address: '',
    payout_percent: 65,
    max_orders_per_slot: 8,
    max_minutes_per_slot: 240,
    service_areas: [''],
  });

  useEffect(() => {
    fetchPartner();
  }, [id]);

  async function fetchPartner() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/partners/${id}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch partner');
      }
      
      const data = await res.json();
      const partner: Partner = data.partner;
      
      setFormData({
        name: partner.name,
        service_type: partner.service_type,
        contact_email: partner.contact_email,
        contact_phone: partner.contact_phone,
        address: partner.address || '',
        payout_percent: partner.payout_percent,
        max_orders_per_slot: partner.max_orders_per_slot || 8,
        max_minutes_per_slot: partner.max_minutes_per_slot || 240,
        service_areas: partner.service_areas && partner.service_areas.length > 0 
          ? partner.service_areas 
          : [''],
      });
    } catch (err) {
      console.error('Error fetching partner:', err);
      setError(err instanceof Error ? err.message : 'Failed to load partner');
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'payout_percent' || name === 'max_orders_per_slot' || name === 'max_minutes_per_slot' 
        ? parseInt(value) || 0
        : value
    }));
  }

  function handleServiceAreaChange(index: number, value: string) {
    const newAreas = [...formData.service_areas];
    newAreas[index] = value;
    setFormData(prev => ({ ...prev, service_areas: newAreas }));
  }

  function addServiceArea() {
    setFormData(prev => ({
      ...prev,
      service_areas: [...prev.service_areas, '']
    }));
  }

  function removeServiceArea(index: number) {
    setFormData(prev => ({
      ...prev,
      service_areas: prev.service_areas.filter((_, i) => i !== index)
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Filter out empty service areas
      const cleanedServiceAreas = formData.service_areas.filter(zip => zip.trim().length > 0);
      
      if (cleanedServiceAreas.length === 0) {
        throw new Error('At least one service area ZIP code is required');
      }

      const payload = {
        name: formData.name.trim(),
        service_type: formData.service_type,
        contact_email: formData.contact_email.trim(),
        contact_phone: formData.contact_phone.trim(),
        address: formData.address.trim() || null,
        payout_percent: formData.payout_percent,
        service_areas: cleanedServiceAreas,
        ...(formData.service_type === 'LAUNDRY' && { max_orders_per_slot: formData.max_orders_per_slot }),
        ...(formData.service_type === 'CLEANING' && { max_minutes_per_slot: formData.max_minutes_per_slot }),
      };

      const res = await fetch(`/api/admin/partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update partner');
      }

      // Success - redirect to partner detail page
      router.push(`/admin/partners/${id}`);
    } catch (err) {
      console.error('Error updating partner:', err);
      setError(err instanceof Error ? err.message : 'Failed to update partner');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/admin/partners/${id}`}
            className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
          >
            ← Back to Partner
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Partner</h1>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow">
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="service_type"
                  name="service_type"
                  required
                  value={formData.service_type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="LAUNDRY">Laundry</option>
                  <option value="CLEANING">Cleaning</option>
                </select>
              </div>

              <div>
                <AddressAutocomplete
                  showLabel={true}
                  defaultValue={formData.address}
                  onAddressSelect={(address) => {
                    setFormData(prev => ({ ...prev, address: address.formatted }));
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional - Business location for reference
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="contact_email"
                  name="contact_email"
                  required
                  value={formData.contact_email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="contact_phone"
                  name="contact_phone"
                  required
                  value={formData.contact_phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Service Configuration */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Configuration</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="payout_percent" className="block text-sm font-medium text-gray-700 mb-1">
                  Payout Percentage <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="payout_percent"
                    name="payout_percent"
                    required
                    min="0"
                    max="100"
                    value={formData.payout_percent}
                    onChange={handleInputChange}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-gray-600">%</span>
                </div>
              </div>

              {formData.service_type === 'LAUNDRY' && (
                <div>
                  <label htmlFor="max_orders_per_slot" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Orders Per Slot
                  </label>
                  <input
                    type="number"
                    id="max_orders_per_slot"
                    name="max_orders_per_slot"
                    min="1"
                    max="50"
                    value={formData.max_orders_per_slot}
                    onChange={handleInputChange}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {formData.service_type === 'CLEANING' && (
                <div>
                  <label htmlFor="max_minutes_per_slot" className="block text-sm font-medium text-gray-700 mb-1">
                    Max Minutes Per Slot
                  </label>
                  <input
                    type="number"
                    id="max_minutes_per_slot"
                    name="max_minutes_per_slot"
                    min="60"
                    max="960"
                    step="30"
                    value={formData.max_minutes_per_slot}
                    onChange={handleInputChange}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Service Areas */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Areas</h2>
            
            <div className="space-y-2">
              {formData.service_areas.map((zip, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => handleServiceAreaChange(index, e.target.value)}
                    placeholder="ZIP code (e.g., 10026)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formData.service_areas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeServiceArea(index)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addServiceArea}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add ZIP Code
              </button>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between">
          <Link
            href={`/admin/partners/${id}`}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
