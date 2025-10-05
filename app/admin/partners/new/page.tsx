'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewPartner() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    service_areas: ['10026', '10027', '10030'],
  });

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
    setLoading(true);
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

      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create partner');
      }

      // Success - redirect to partner detail page
      router.push(`/admin/partners/${data.partner.id}`);
    } catch (err) {
      console.error('Error creating partner:', err);
      setError(err instanceof Error ? err.message : 'Failed to create partner');
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/partners"
            className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
          >
            ← Back to Partners
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Add New Partner</h1>
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
                  placeholder="e.g., Harlem Fresh Laundromat"
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
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Business Address
                </label>
                <input
                  ref={(el) => {
                    if (el && !el.dataset.autocompleteInitialized) {
                      // Initialize Google Places Autocomplete
                      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
                      if (apiKey && typeof window !== 'undefined' && window.google?.maps?.places) {
                        const autocomplete = new window.google.maps.places.Autocomplete(el, {
                          componentRestrictions: { country: 'us' },
                          fields: ['formatted_address'],
                          types: ['address']
                        });
                        autocomplete.addListener('place_changed', () => {
                          const place = autocomplete.getPlace();
                          if (place.formatted_address) {
                            setFormData(prev => ({ ...prev, address: place.formatted_address || '' }));
                          }
                        });
                        el.dataset.autocompleteInitialized = 'true';
                      }
                    }
                  }}
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 2280 Frederick Douglass Blvd, New York, NY"
                />
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
                  placeholder="contact@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for partner portal login and notifications
                </p>
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
                  placeholder="+1 (555) 123-4567"
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
                <p className="text-xs text-gray-500 mt-1">
                  Percentage of order value paid to partner (default: 65%)
                </p>
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
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum number of laundry orders per time slot (default: 8)
                  </p>
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
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum cleaning minutes per time slot (default: 240 = 4 hours)
                  </p>
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
            <p className="text-xs text-gray-500 mt-2">
              ZIP codes where this partner provides service
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between">
          <Link
            href="/admin/partners"
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Partner'}
          </button>
        </div>
      </form>
    </div>
  );
}
