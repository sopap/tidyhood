'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { Toast } from '@/components/Toast';
import { Header } from '@/components/Header';
import ServiceDetails from '@/components/booking/ServiceDetails';
import EstimatePanel from '@/components/booking/EstimatePanel';
import StickyCTA from '@/components/booking/StickyCTA';
import { ServiceType, WeightTier, AddonKey, EstimateResult } from '@/lib/types';
import { estimateLaundry } from '@/lib/estimate';
import { usePersistentBooking, formatPhone } from '@/hooks/usePersistentBooking';

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  formatted: string;
}

interface TimeSlot {
  partner_id: string;
  partner_name: string;
  slot_start: string;
  slot_end: string;
  available_units: number;
  max_units: number;
  service_type: string;
}

function LaundryBookingForm() {
  const router = useRouter();
  const { user } = useAuth();

  // Persistent booking data
  const {
    loaded: persistedLoaded,
    remember,
    toggleRemember,
    phone: persistedPhone,
    updatePhone: updatePersistedPhone,
    address: persistedAddress,
    updateAddress: updatePersistedAddress,
    homeSize: persistedHomeSize,
    updateHomeSize: updatePersistedHomeSize,
    prefillMsg,
    clearAll,
  } = usePersistentBooking();

  // Address state
  const [address, setAddress] = useState<Address | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [addressLine2, setAddressLine2] = useState('');
  const [phone, setPhone] = useState('');
  const [bedrooms, setBedrooms] = useState<number>(1);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isAddressCollapsed, setIsAddressCollapsed] = useState(false);

  // Service details
  const [serviceType, setServiceType] = useState<ServiceType>('washFold');
  const [weightTier, setWeightTier] = useState<WeightTier>('small');
  const [addons, setAddons] = useState<Partial<Record<AddonKey, boolean>>>({});

  // Schedule
  const [date, setDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Delivery
  const [deliveryDate, setDeliveryDate] = useState('');
  const [availableDeliverySlots, setAvailableDeliverySlots] = useState<TimeSlot[]>([]);
  const [selectedDeliverySlot, setSelectedDeliverySlot] = useState<TimeSlot | null>(null);
  const [useDefaultDelivery, setUseDefaultDelivery] = useState(true);

  // Estimate
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Time slot expansion
  const [slotsExpanded, setSlotsExpanded] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  // Hydrate form from persisted data on mount
  useEffect(() => {
    if (!persistedLoaded) return;

    // Set phone with formatting
    if (persistedPhone) {
      setPhone(formatPhone(persistedPhone));
    }

    // Set address fields
    if (persistedAddress?.line1) {
      setAddressLine2(persistedAddress.line2 || '');
      // Note: Full address will need to be re-geocoded or set via AddressAutocomplete
    }

    // Set home size
    if (persistedHomeSize?.bedrooms !== undefined) {
      setBedrooms(persistedHomeSize.bedrooms);
    }
    if (persistedHomeSize?.bathrooms !== undefined) {
      setBathrooms(persistedHomeSize.bathrooms);
    }
  }, [persistedLoaded, persistedPhone, persistedAddress, persistedHomeSize]);

  // Load last order for smart defaults
  useEffect(() => {
    const loadLastOrder = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/orders?limit=1');
        if (response.ok) {
          const data = await response.json();
          if (data.orders && data.orders.length > 0) {
            const lastOrder = data.orders[0];

            // Pre-fill address
            if (lastOrder.address_snapshot) {
              setAddress({
                line1: lastOrder.address_snapshot.line1,
                line2: lastOrder.address_snapshot.line2,
                city: lastOrder.address_snapshot.city,
                state: 'NY',
                zip: lastOrder.address_snapshot.zip,
                formatted: `${lastOrder.address_snapshot.line1}, ${lastOrder.address_snapshot.city}, NY ${lastOrder.address_snapshot.zip}`,
              });
              setAddressLine2(lastOrder.address_snapshot.line2 || '');
              setIsAddressCollapsed(true);
            }
          }
        }

        // Pre-fill phone from user profile
        if (user.phone) {
          setPhone(user.phone);
        }
      } catch (err) {
        console.error('Failed to load last order:', err);
      }
    };

    loadLastOrder();
  }, [user]);

  // Calculate estimate whenever service details change
  useEffect(() => {
    const calculateEstimate = async () => {
      if (!address) return;

      // For dry clean, we don't need a weight tier
      if (serviceType === 'dryClean') {
        setIsEstimating(true);
        try {
          const result = await estimateLaundry({
            serviceType,
            addons,
            zip: address.zip,
          });
          setEstimate(result);
        } catch (err) {
          console.error('Estimate calculation error:', err);
        } finally {
          setIsEstimating(false);
        }
        return;
      }

      // For wash & fold or mixed, we need a weight tier
      if (!weightTier) return;

      setIsEstimating(true);
      try {
        const result = await estimateLaundry({
          serviceType,
          weightTier,
          addons,
          zip: address.zip,
        });
        setEstimate(result);
      } catch (err) {
        console.error('Estimate calculation error:', err);
      } finally {
        setIsEstimating(false);
      }
    };

    calculateEstimate();
  }, [address, serviceType, weightTier, addons]);

  // Fetch slots when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!date || !address) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/slots?service=LAUNDRY&zip=${address.zip}&date=${date}`);
        if (response.ok) {
          const data = await response.json();
          setAvailableSlots(data.slots || []);
        }
      } catch (err) {
        console.error('Failed to fetch slots:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [date, address]);

  // Auto-calculate delivery date/time (48h after pickup) when pickup slot selected
  useEffect(() => {
    if (!selectedSlot || !useDefaultDelivery) return;

    const pickupTime = new Date(selectedSlot.slot_start);
    const defaultDeliveryTime = new Date(pickupTime.getTime() + 48 * 60 * 60 * 1000);

    const deliveryDateStr = defaultDeliveryTime.toISOString().split('T')[0];
    setDeliveryDate(deliveryDateStr);

    const deliverySlotEnd = new Date(defaultDeliveryTime.getTime() + 2 * 60 * 60 * 1000);
    setSelectedDeliverySlot({
      partner_id: selectedSlot.partner_id,
      partner_name: 'Available',
      slot_start: defaultDeliveryTime.toISOString(),
      slot_end: deliverySlotEnd.toISOString(),
      available_units: 1,
      max_units: 1,
      service_type: 'LAUNDRY',
    });
  }, [selectedSlot, useDefaultDelivery]);

  // Fetch delivery slots when custom delivery date selected
  useEffect(() => {
    if (!useDefaultDelivery && deliveryDate && address) {
      const fetchDeliverySlots = async () => {
        try {
          const response = await fetch(`/api/slots?service=LAUNDRY&zip=${address.zip}&date=${deliveryDate}`);
          if (response.ok) {
            const data = await response.json();
            setAvailableDeliverySlots(data.slots || []);
          }
        } catch (err) {
          console.error('Failed to fetch delivery slots:', err);
        }
      };
      fetchDeliverySlots();
    }
  }, [useDefaultDelivery, deliveryDate, address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      router.push('/login?returnTo=/book/laundry');
      return;
    }

    if (!address || !selectedSlot) {
      setToast({ message: 'Please complete all required fields', type: 'warning' });
      return;
    }

    // For wash & fold, require weight tier
    if (serviceType === 'washFold' && !weightTier) {
      setToast({ message: 'Please select a size', type: 'warning' });
      return;
    }

    try {
      setLoading(true);
      setSubmitting(true);
      const idempotencyKey = `laundry-${Date.now()}-${Math.random()}`;

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          service_type: 'LAUNDRY',
          phone: phone,
          slot: {
            partner_id: selectedSlot.partner_id,
            slot_start: selectedSlot.slot_start,
            slot_end: selectedSlot.slot_end,
          },
          delivery_slot: selectedDeliverySlot
            ? {
                slot_start: selectedDeliverySlot.slot_start,
                slot_end: selectedDeliverySlot.slot_end,
              }
            : undefined,
          address: {
            line1: address.line1,
            line2: addressLine2 || undefined,
            city: address.city,
            zip: address.zip,
            notes: specialInstructions || undefined,
          },
          details: {
            serviceType,
            weightTier: weightTier || undefined,
            addons: Object.keys(addons).filter((key) => addons[key as AddonKey]),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const order = await response.json();

      router.push(`/orders/${order.id}`);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setToast({
        message: err.message || 'Failed to create order. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Laundry Service</h1>
            <p className="text-gray-600">Fill out the form below to schedule your pickup</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Address Section */}
            <div className="ui-dense bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">📍 Service Address</h2>
                {isAddressCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsAddressCollapsed(false)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isAddressCollapsed && address ? (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="font-medium">{address.line1}</p>
                  {addressLine2 && <p className="text-sm text-gray-600">{addressLine2}</p>}
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state} {address.zip}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AddressAutocomplete 
                    onAddressSelect={(addr) => {
                      setAddress(addr);
                      if (addr) {
                        updatePersistedAddress({
                          line1: addr.line1,
                          line2: addressLine2,
                          zip: addr.zip,
                        });
                      }
                    }}
                    onValidityChange={setIsAddressValid}
                    defaultValue={address?.formatted} 
                    showLabel={false} 
                  />
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => {
                      setAddressLine2(e.target.value);
                      if (address) {
                        updatePersistedAddress({
                          line1: address.line1,
                          line2: e.target.value,
                          zip: address.zip,
                        });
                      }
                    }}
                    placeholder="Apartment, Suite, etc. (optional)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Service Details */}
            <div className="ui-dense bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🧺 Service Details</h2>
              <ServiceDetails
                serviceType={serviceType}
                onServiceTypeChange={setServiceType}
                weightTier={weightTier}
                onWeightTierChange={setWeightTier}
                addons={addons}
                onAddonsChange={setAddons}
                specialInstructions={specialInstructions}
                onSpecialInstructionsChange={setSpecialInstructions}
              />
            </div>

            {/* Estimate Panel */}
            {address && <EstimatePanel estimate={estimate} isLoading={isEstimating} serviceType={serviceType} />}

            {/* Schedule */}
            <div className="ui-dense bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Schedule Pickup</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setSelectedSlot(null);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    required
                  />
                </div>

                {date && address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Available Time Slots</label>
                    <p className="text-xs text-gray-600 mb-3">We'll text you 15 min before arrival.</p>
                    {loading ? (
                      <p className="text-gray-500">Loading slots...</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-red-600">No slots available. Please select a different date.</p>
                    ) : (
                      <div className="space-y-2">
                        {(slotsExpanded ? availableSlots : availableSlots.slice(0, 6)).map((slot) => {
                          const isSelected = selectedSlot?.slot_start === slot.slot_start;
                          const isFull = slot.available_units === 0;

                          return (
                            <label
                              key={`${slot.partner_id}-${slot.slot_start}`}
                              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50'
                                  : isFull
                                  ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center">
                                <input
                                  type="radio"
                                  name="slot"
                                  checked={isSelected}
                                  onChange={() => !isFull && setSelectedSlot(slot)}
                                  disabled={isFull}
                                  className="mr-3"
                                />
                                <div className={`font-medium ${isFull ? 'line-through text-gray-400' : ''}`}>
                                  {new Date(slot.slot_start).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}{' '}
                                  -{' '}
                                  {new Date(slot.slot_end).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}
                                </div>
                              </div>
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  isFull
                                    ? 'bg-red-100 text-red-700'
                                    : slot.available_units < 5
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-green-100 text-green-700'
                                }`}
                              >
                                {isFull ? 'Full' : slot.available_units < 5 ? `Only ${slot.available_units} left` : `${slot.available_units} available`}
                              </span>
                            </label>
                          );
                        })}
                        {availableSlots.length > 6 && !slotsExpanded && (
                          <button
                            type="button"
                            onClick={() => setSlotsExpanded(true)}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                          >
                            Show all {availableSlots.length} slots
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Window */}
            {selectedSlot && (
              <div className="ui-dense bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🚚 Delivery Window</h2>

                <div className="space-y-4">
                  {useDefaultDelivery && selectedDeliverySlot && (
                    <div className="relative bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-green-500" aria-hidden="true" />
                      <div className="flex items-start gap-3 pl-2">
                        <span className="text-2xl" aria-hidden="true">🚚</span>
                        <div>
                          <p className="font-semibold text-green-900">
                            Delivery: {new Date(selectedDeliverySlot.slot_start).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          <p className="text-sm text-green-700">
                            {new Date(selectedDeliverySlot.slot_start).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}{' '}
                            -{' '}
                            {new Date(selectedDeliverySlot.slot_end).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}{' '}
                            (48 hours after pickup)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!useDefaultDelivery}
                      onChange={(e) => {
                        setUseDefaultDelivery(!e.target.checked);
                        if (e.target.checked) {
                          setSelectedDeliverySlot(null);
                        }
                      }}
                      className="mr-3"
                    />
                    <span className="text-sm text-gray-700">Choose a different delivery time</span>
                  </label>

                  {!useDefaultDelivery && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Date</label>
                        <input
                          type="date"
                          value={deliveryDate}
                          onChange={(e) => {
                            setDeliveryDate(e.target.value);
                            setSelectedDeliverySlot(null);
                          }}
                          min={new Date(new Date(selectedSlot.slot_start).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                        />
                      </div>

                      {deliveryDate && availableDeliverySlots.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Available Delivery Slots</label>
                          <div className="space-y-2">
                            {availableDeliverySlots.map((slot) => (
                              <label
                                key={`${slot.partner_id}-${slot.slot_start}`}
                                className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                                  selectedDeliverySlot?.slot_start === slot.slot_start ? 'border-blue-600 bg-blue-50' : ''
                                }`}
                              >
                                <div className="flex items-center">
                                  <input
                                    type="radio"
                                    name="deliverySlot"
                                    checked={selectedDeliverySlot?.slot_start === slot.slot_start}
                                    onChange={() => setSelectedDeliverySlot(slot)}
                                    className="mr-3"
                                  />
                                  <div className="font-medium">
                                    {new Date(slot.slot_start).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true,
                                    })}{' '}
                                    -{' '}
                                    {new Date(slot.slot_end).toLocaleTimeString('en-US', {
                                      hour: 'numeric',
                                      minute: '2-digit',
                                      hour12: true,
                                    })}
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Contact */}
            <div className="ui-dense bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">✉️ Contact Information</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setPhone(formatted);
                      updatePersistedPhone(e.target.value);
                    }}
                    placeholder="(555) 123-4567"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    required
                  />
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => toggleRemember(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200"
                      />
                      <span className="group-hover:text-gray-900">
                        Remember my details on this device
                      </span>
                      <span 
                        className="text-gray-400 hover:text-gray-600 cursor-help" 
                        title="Saved in your browser only. You can clear anytime."
                      >
                        ⓘ
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        clearAll();
                        setPhone('');
                        setAddressLine2('');
                        setBedrooms(1);
                        setBathrooms(1);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      Not you? Clear saved details
                    </button>
                  </div>
                </div>

                {/* Home Size - New Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bedrooms
                    </label>
                    <select
                      value={bedrooms}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setBedrooms(value);
                        updatePersistedHomeSize({ bedrooms: value, bathrooms });
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    >
                      <option value="0">Studio</option>
                      <option value="1">1 BR</option>
                      <option value="2">2 BR</option>
                      <option value="3">3 BR</option>
                      <option value="4">4 BR</option>
                      <option value="5">5+ BR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bathrooms
                    </label>
                    <select
                      value={bathrooms}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setBathrooms(value);
                        updatePersistedHomeSize({ bedrooms, bathrooms: value });
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    >
                      <option value="1">1 BA</option>
                      <option value="1.5">1.5 BA</option>
                      <option value="2">2 BA</option>
                      <option value="2.5">2.5 BA</option>
                      <option value="3">3 BA</option>
                      <option value="3.5">3.5 BA</option>
                      <option value="4">4+ BA</option>
                    </select>
                  </div>
                </div>

                {serviceType !== 'mixed' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Notes (Optional)</label>
                    <textarea
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g., Doorman pickup, leave with concierge..."
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <button
                type="submit"
                disabled={!persistedLoaded || loading || !address || !isAddressValid || !selectedSlot || (serviceType === 'washFold' && !weightTier)}
                className="w-full bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-disabled={loading}
              >
                {submitting ? 'Scheduling…' : 'Schedule Pickup'}
              </button>
              <div aria-live="polite" aria-atomic="true" className="sr-only">
                {submitting && 'Processing your booking request'}
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-medium">💰 Pay After Pickup</p>
                <p className="text-xs text-blue-700 mt-1">
                  {serviceType === 'dryClean'
                    ? "No payment required now. We'll send you a quote after inspection."
                    : serviceType === 'mixed'
                    ? "No payment required now. We'll send a quote for all items after pickup."
                    : "No payment required now. We'll weigh your items after pickup and send you a quote to approve."}
                </p>
              </div>
            </div>

            {/* Accessibility: Prefill announcement */}
            {prefillMsg && (
              <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                {prefillMsg}
              </div>
            )}
          </form>
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} isVisible={!!toast} onClose={() => setToast(null)} />}
      
      <StickyCTA
        label={submitting ? 'Scheduling…' : 'Schedule Pickup'}
        onClick={() => {
          const form = document.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
          }
        }}
        disabled={loading || !address || !isAddressValid || !selectedSlot || (serviceType === 'washFold' && !weightTier)}
        sublabel="Pay After Pickup"
      />
    </div>
  );
}

export default function LaundryBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <LaundryBookingForm />
    </Suspense>
  );
}
