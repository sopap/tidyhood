'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';
import { Toast } from '@/components/Toast';
import { Header } from '@/components/Header';
import Stepper from '@/components/booking/Stepper';
import SlotPicker from '@/components/booking/SlotPicker';
import Addons from '@/components/booking/Addons';
import EstimatePanel from '@/components/booking/EstimatePanel';
import StickyCTA from '@/components/booking/StickyCTA';
import { WeightTier, AddonKey, WEIGHT_TIER_INFO, BookingSlot, EstimateResult } from '@/lib/types';
import { announceToScreenReader } from '@/lib/a11y';
import { debounce } from '@/lib/debounce';

interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  formatted: string;
}

function LaundryBookingForm() {
  const router = useRouter();
  const { user } = useAuth();

  // Step tracking
  const [currentStep, setCurrentStep] = useState(1);

  // Address state
  const [address, setAddress] = useState<Address | null>(null);
  const [addressLine2, setAddressLine2] = useState('');
  const [isAddressCollapsed, setIsAddressCollapsed] = useState(false);

  // Service details
  const [weightTier, setWeightTier] = useState<WeightTier>('medium');
  const [addons, setAddons] = useState<Partial<Record<AddonKey, boolean>>>({});
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  // Schedule
  const [slot, setSlot] = useState<{ date: string; slot?: BookingSlot }>();

  // Contact
  const [phone, setPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Estimate
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  // Load last order for smart defaults
  useEffect(() => {
    const loadDefaults = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/orders?limit=1');
        if (response.ok) {
          const data = await response.json();
          if (data.orders && data.orders.length > 0) {
            const lastOrder = data.orders[0];

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

        if (user.phone) {
          setPhone(user.phone);
        }
      } catch (err) {
        console.error('Failed to load defaults:', err);
      }
    };

    loadDefaults();
  }, [user]);

  // Calculate estimate with debounce
  const fetchEstimate = useCallback(
    debounce(async (tier: WeightTier, selectedAddons: Partial<Record<AddonKey, boolean>>, code: string, zip: string) => {
      if (!zip) return;

      try {
        setEstimateLoading(true);
        const response = await fetch('/api/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            weightTier: tier,
            addons: selectedAddons,
            promoCode: code || undefined,
            zip,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setEstimate(result);
          announceToScreenReader(`Estimate updated: $${result.total.toFixed(2)}`);
        }
      } catch (err) {
        console.error('Estimate calculation error:', err);
      } finally {
        setEstimateLoading(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (address?.zip) {
      fetchEstimate(weightTier, addons, promoCode, address.zip);
    }
  }, [weightTier, addons, promoCode, address?.zip, fetchEstimate]);

  // Progress through steps
  useEffect(() => {
    if (address && !isAddressCollapsed) {
      setCurrentStep(2);
    } else if (isAddressCollapsed && weightTier) {
      setCurrentStep(3);
    } else if (slot?.slot) {
      setCurrentStep(4);
    }
  }, [address, isAddressCollapsed, weightTier, slot]);

  const handleAddressComplete = () => {
    setIsAddressCollapsed(true);
    announceToScreenReader('Address saved. Please select your service options.');
  };

  const handleApplyPromo = () => {
    if (promoCode.trim()) {
      setPromoApplied(true);
      announceToScreenReader('Promo code applied');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      router.push('/login?returnTo=/book/laundry');
      return;
    }

    if (!address || !slot?.slot || !phone) {
      setToast({ message: 'Please complete all required fields', type: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const idempotencyKey = `laundry-${Date.now()}-${Math.random()}`;

      // Map weight tier to pounds for API
      const lbsMap = { small: 15, medium: 25, large: 35 };
      const lbs = lbsMap[weightTier];

      // Convert addon format
      const addonsList = Object.entries(addons)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          service_type: 'LAUNDRY',
          phone,
          slot: {
            partner_id: slot.slot.partner_id,
            slot_start: slot.slot.slot_start,
            slot_end: slot.slot.slot_end,
          },
          address: {
            line1: address.line1,
            line2: addressLine2 || undefined,
            city: address.city,
            zip: address.zip,
            notes: specialInstructions || undefined,
          },
          details: {
            lbs,
            addons: addonsList,
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
    }
  };

  const isFormValid = address && slot?.slot && phone;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Laundry Service</h1>
            <p className="text-gray-600">Complete the steps below to schedule your pickup</p>
          </div>

          <Stepper currentStep={currentStep} />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Address */}
            <section className="bg-white rounded-lg shadow-md p-6" id="address-section">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">📍 Service Address</h2>
                {isAddressCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsAddressCollapsed(false)}
                    className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isAddressCollapsed && address ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900">{address.line1}</p>
                  {addressLine2 && <p className="text-sm text-gray-600">{addressLine2}</p>}
                  <p className="text-sm text-gray-600">
                    {address.city}, {address.state} {address.zip}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <AddressAutocomplete
                    onAddressSelect={setAddress}
                    defaultValue={address?.formatted}
                    showLabel={false}
                  />
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apartment, Suite, etc. (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    aria-label="Address line 2"
                  />
                  {address && !isAddressCollapsed && (
                    <button
                      type="button"
                      onClick={handleAddressComplete}
                      className="btn-primary w-full sm:w-auto"
                    >
                      Continue to Service Options
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Step 2: Service Details */}
            {address && (
              <section className="bg-white rounded-lg shadow-md p-6" id="service-section">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🧺 Service Details</h2>

                <div className="space-y-6">
                  {/* Weight Tier Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Load Size (Minimum 15 lbs)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Load size">
                      {(['small', 'medium', 'large'] as WeightTier[]).map((tier) => {
                        const info = WEIGHT_TIER_INFO[tier];
                        const isSelected = weightTier === tier;

                        return (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => setWeightTier(tier)}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${info.label}, ${info.description}, ${info.price}`}
                            className={`p-4 rounded-lg border-2 text-left transition-colors ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                                : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                            } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                          >
                            <div className="font-semibold text-gray-900">{info.label}</div>
                            <div className="text-sm text-gray-600 mt-1">{info.description}</div>
                            <div className="text-sm font-medium text-blue-600 mt-2">{info.price}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Add-ons */}
                  <Addons value={addons} onChange={setAddons} />

                  {/* Promo Code */}
                  <div>
                    <label htmlFor="promo-code" className="block text-sm font-medium text-gray-700 mb-2">
                      Promo Code (Optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="promo-code"
                        type="text"
                        value={promoCode}
                        onChange={(e) => {
                          setPromoCode(e.target.value.toUpperCase());
                          setPromoApplied(false);
                        }}
                        placeholder="Enter code"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        aria-describedby="promo-help"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={!promoCode.trim() || promoApplied}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        Apply
                      </button>
                    </div>
                    <p id="promo-help" className="mt-1 text-xs text-gray-500">
                      Try WELCOME10 for 10% off or HARLEM5 for $5 off
                    </p>
                  </div>

                  {/* Estimate Panel - Desktop */}
                  <div className="hidden md:block">
                    <EstimatePanel estimate={estimate} isLoading={estimateLoading} />
                  </div>
                </div>
              </section>
            )}

            {/* Step 3: Schedule */}
            {address && (
              <section className="bg-white rounded-lg shadow-md p-6" id="schedule-section">
                <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Schedule Pickup</h2>
                <SlotPicker zip={address.zip} value={slot} onChange={setSlot} />
              </section>
            )}

            {/* Step 4: Contact & Notes */}
            {slot?.slot && (
              <section className="bg-white rounded-lg shadow-md p-6" id="contact-section">
                <h2 className="text-xl font-bold text-gray-900 mb-4">✉️ Contact Information</h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      aria-required="true"
                    />
                  </div>

                  <div>
                    <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Notes (Optional)
                    </label>
                    <textarea
                      id="instructions"
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      placeholder="e.g., Doorman pickup, leave with concierge, specific detergent preferences..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Submit Section */}
            {isFormValid && (
              <section className="bg-white rounded-lg shadow-md p-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {loading ? 'Processing...' : 'Schedule Pickup'}
                </button>
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-900 font-medium">💰 Pay After Pickup</p>
                  <p className="text-xs text-blue-700 mt-1">
                    No payment required now. We'll weigh your items after pickup and send you a quote to approve.
                  </p>
                </div>
              </section>
            )}
          </form>
        </div>
      </main>

      {/* Sticky Mobile CTA */}
      {isFormValid && (
        <StickyCTA
          label="Schedule Pickup"
          price={estimate ? `$${estimate.total.toFixed(2)}` : undefined}
          onClick={() => document.querySelector('button[type="submit"]')?.scrollIntoView({ behavior: 'smooth' })}
          disabled={loading}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} isVisible={!!toast} onClose={() => setToast(null)} />
      )}
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
