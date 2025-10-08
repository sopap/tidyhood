'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Partner {
  id: string;
  name: string;
  service_type: 'LAUNDRY' | 'CLEANING';
  max_orders_per_slot?: number;
  max_minutes_per_slot?: number;
}

export default function AddCapacity() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    partner_id: '',
    date: '',
    start_time: '09:00',
    end_time: '17:00',
    max_units: 8,
    notes: ''
  });

  useEffect(() => {
    fetchPartners();
  }, []);

  async function fetchPartners() {
    try {
      const res = await fetch('/api/admin/partners?status=active');
      if (!res.ok) throw new Error('Failed to fetch partners');
      const data = await res.json();
      setPartners(data.partners || []);
    } catch (err) {
      console.error('Error fetching partners:', err);
      setError('Failed to load partners');
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_units' ? parseInt(value) || 0 : value
    }));
  }

  function handlePartnerChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const partnerId = e.target.value;
    const partner = partners.find(p => p.id === partnerId);
    
    setFormData(prev => ({
      ...prev,
      partner_id: partnerId,
      max_units: partner
        ? partner.service_type === 'LAUNDRY'
          ? partner.max_orders_per_slot || 8
          : partner.max_minutes_per_slot || 240
        : 8
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const partner = partners.find(p => p.id === formData.partner_id);
      if (!partner) throw new Error('Partner not found');

      // CRITICAL: Create dates in ET timezone to avoid timezone conversion issues
      // Parse the date and time strings
      const [year, month, day] = formData.date.split('-').map(Number);
      const [startHour, startMinute] = formData.start_time.split(':').map(Number);
      const [endHour, endMinute] = formData.end_time.split(':').map(Number);
      
      // Create a date string in ET timezone format that will be correctly interpreted
      // We use toLocaleString to format in ET, then create the ISO string
      const slotStartET = new Date(year, month - 1, day, startHour, startMinute);
      const slotEndET = new Date(year, month - 1, day, endHour, endMinute);
      
      // Convert to ET timezone string, then parse back to get the correct UTC representation
      const slotStartETStr = slotStartET.toLocaleString('en-US', { 
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const slotEndETStr = slotEndET.toLocaleString('en-US', { 
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      // Parse back: "MM/DD/YYYY, HH:mm:ss"
      const parseETString = (etStr: string) => {
        const [datePart, timePart] = etStr.split(', ');
        const [m, d, y] = datePart.split('/');
        const [h, min, s] = timePart.split(':');
        // Create in local time, which represents ET
        return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s));
      };
      
      const slotStart = parseETString(slotStartETStr);
      const slotEnd = parseETString(slotEndETStr);

      const payload = {
        partner_id: formData.partner_id,
        service_type: partner.service_type,
        slot_start: slotStart.toISOString(),
        slot_end: slotEnd.toISOString(),
        max_units: formData.max_units,
        notes: formData.notes || null
      };

      const res = await fetch('/api/admin/capacity/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create capacity slot');
      }

      // Success - redirect to capacity list
      router.push('/admin/capacity');
    } catch (err) {
      console.error('Error creating slot:', err);
      setError(err instanceof Error ? err.message : 'Failed to create capacity slot');
      setLoading(false);
    }
  }

  const selectedPartner = partners.find(p => p.id === formData.partner_id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/capacity"
          className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
        >
          ← Back to Capacity
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Add Capacity Slot</h1>
        <p className="text-sm text-gray-600 mt-1">Create a new time slot for partner availability</p>
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
          {/* Partner Selection */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Partner</h2>
            
            <div>
              <label htmlFor="partner_id" className="block text-sm font-medium text-gray-700 mb-1">
                Select Partner <span className="text-red-500">*</span>
              </label>
              <select
                id="partner_id"
                name="partner_id"
                required
                value={formData.partner_id}
                onChange={handlePartnerChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a partner...</option>
                {partners.map(partner => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name} ({partner.service_type})
                  </option>
                ))}
              </select>
              {selectedPartner && (
                <p className="text-xs text-gray-500 mt-1">
                  Service Type: {selectedPartner.service_type} | 
                  Default Capacity: {selectedPartner.service_type === 'LAUNDRY' 
                    ? `${selectedPartner.max_orders_per_slot || 8} orders`
                    : `${selectedPartner.max_minutes_per_slot || 240} minutes`}
                </p>
              )}
            </div>
          </div>

          {/* Time Slot */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Time Slot</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="start_time"
                    name="start_time"
                    required
                    value={formData.start_time}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    id="end_time"
                    name="end_time"
                    required
                    value={formData.end_time}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Capacity */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Capacity</h2>
            
            <div>
              <label htmlFor="max_units" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum {selectedPartner?.service_type === 'LAUNDRY' ? 'Orders' : 'Minutes'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="max_units"
                name="max_units"
                required
                min="1"
                max={selectedPartner?.service_type === 'LAUNDRY' ? "50" : "960"}
                value={formData.max_units}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                {selectedPartner?.service_type === 'LAUNDRY' 
                  ? 'Maximum number of laundry orders this slot can handle'
                  : 'Maximum minutes of cleaning time available in this slot'}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes (Optional)</h2>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Add any internal notes about this capacity slot..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between">
          <Link
            href="/admin/capacity"
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !formData.partner_id}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Slot'}
          </button>
        </div>
      </form>

      {/* Helper Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Only active partners are shown in the dropdown</li>
          <li>• Slots must be in the future</li>
          <li>• The system will check for time conflicts automatically</li>
          <li>• For recurring slots, use the bulk creation feature (coming soon)</li>
        </ul>
      </div>
    </div>
  );
}
