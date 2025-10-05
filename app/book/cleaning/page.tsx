'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { PaymentModal } from '@/components/PaymentModal'
import { Toast } from '@/components/Toast'
import { Header } from '@/components/Header'
import CleaningTypeSelector from '@/components/cleaning/CleaningTypeSelector'
import CleaningAddons from '@/components/cleaning/CleaningAddons'
import EstimateBadge from '@/components/cleaning/EstimateBadge'
import FrequencySelector from '@/components/cleaning/FrequencySelector'
import { CleaningType, CleaningAddonKey, Frequency } from '@/lib/types'
import { usePersistentBooking, formatPhone } from '@/hooks/usePersistentBooking'

interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  formatted: string
}

interface TimeSlot {
  partner_id: string
  partner_name: string
  slot_start: string
  slot_end: string
  available_units: number
  max_units: number
  service_type: string
}

function CleaningBookingForm() {
  const router = useRouter()
  const { user } = useAuth()
  
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
  } = usePersistentBooking()
  
  // Address state
  const [address, setAddress] = useState<Address | null>(null)
  const [isAddressValid, setIsAddressValid] = useState(false)
  const [addressLine2, setAddressLine2] = useState('')
  const [phone, setPhone] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isAddressCollapsed, setIsAddressCollapsed] = useState(false)
  
  // Service details
  const [bedrooms, setBedrooms] = useState(1)
  const [bathrooms, setBathrooms] = useState(1)
  const [cleaningType, setCleaningType] = useState<CleaningType>('standard')
  const [addons, setAddons] = useState<Record<CleaningAddonKey, boolean>>({} as Record<CleaningAddonKey, boolean>)
  const [frequency, setFrequency] = useState<Frequency>('oneTime')
  const [firstVisitDeep, setFirstVisitDeep] = useState(false)
  
  // Schedule
  const [date, setDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  
  // Pricing
  const [pricing, setPricing] = useState({ subtotal: 0, tax: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)

  // Hydrate form from persisted data on mount
  useEffect(() => {
    if (!persistedLoaded) return

    // Set phone with formatting
    if (persistedPhone) {
      setPhone(formatPhone(persistedPhone))
    }

    // Set address fields
    if (persistedAddress?.line1) {
      setAddressLine2(persistedAddress.line2 || '')
    }

    // Set home size
    if (persistedHomeSize?.bedrooms !== undefined) {
      setBedrooms(persistedHomeSize.bedrooms)
    }
    if (persistedHomeSize?.bathrooms !== undefined) {
      setBathrooms(persistedHomeSize.bathrooms)
    }
  }, [persistedLoaded, persistedPhone, persistedAddress, persistedHomeSize])

  // Load last order for smart defaults
  useEffect(() => {
    const loadLastOrder = async () => {
      if (!user) return

      try {
        const response = await fetch('/api/orders?limit=1')
        if (response.ok) {
          const data = await response.json()
          if (data.orders && data.orders.length > 0) {
            const lastOrder = data.orders[0]
            
            // Pre-fill address
            if (lastOrder.address_snapshot) {
              setAddress({
                line1: lastOrder.address_snapshot.line1,
                line2: lastOrder.address_snapshot.line2,
                city: lastOrder.address_snapshot.city,
                state: 'NY',
                zip: lastOrder.address_snapshot.zip,
                formatted: `${lastOrder.address_snapshot.line1}, ${lastOrder.address_snapshot.city}, NY ${lastOrder.address_snapshot.zip}`
              })
              setAddressLine2(lastOrder.address_snapshot.line2 || '')
              setIsAddressCollapsed(true)
            }
            
            // Pre-fill service details if it was a cleaning order
            if (lastOrder.service_type === 'CLEANING' && lastOrder.order_details) {
              setBedrooms(lastOrder.order_details.bedrooms || 1)
              setBathrooms(lastOrder.order_details.bathrooms || 1)
              if (lastOrder.order_details.cleaningType) {
                setCleaningType(lastOrder.order_details.cleaningType)
              }
            }
          }
        }
        
        // Pre-fill phone from user profile
        if (user.phone) {
          setPhone(user.phone)
        }
      } catch (err) {
        console.error('Failed to load last order:', err)
      }
    }

    loadLastOrder()
  }, [user])

  // Calculate price whenever service details change
  useEffect(() => {
    const calculatePrice = async () => {
      if (!address) return

      try {
        // Determine deep clean: explicit selection OR first visit deep for recurring
        const isDeep = cleaningType === 'deep' || (frequency !== 'oneTime' && firstVisitDeep)
        
        const response = await fetch('/api/price/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: 'CLEANING',
            zip: address.zip,
            bedrooms,
            bathrooms,
            deep: isDeep,
            addons: Object.keys(addons).filter(key => addons[key as CleaningAddonKey]),
            frequency,
            visitsCompleted: 0, // First visit, so no recurring discount yet
            firstVisitDeep: frequency !== 'oneTime' && firstVisitDeep
          })
        })

        if (response.ok) {
          const quote = await response.json()
          setPricing({
            subtotal: quote.subtotal_cents / 100,
            tax: quote.tax_cents / 100,
            total: quote.total_cents / 100
          })
        }
      } catch (err) {
        console.error('Price calculation error:', err)
      }
    }

    calculatePrice()
  }, [address, bedrooms, bathrooms, cleaningType, addons, frequency, firstVisitDeep])

  // Fetch slots when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!date || !address) return

      try {
        setLoading(true)
        const response = await fetch(
          `/api/slots?service=CLEANING&zip=${address.zip}&date=${date}`
        )
        if (response.ok) {
          const data = await response.json()
          setAvailableSlots(data.slots || [])
        }
      } catch (err) {
        console.error('Failed to fetch slots:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSlots()
  }, [date, address])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      router.push('/login?returnTo=/book/cleaning')
      return
    }

    if (!address || !selectedSlot) {
      setToast({ message: 'Please complete all required fields', type: 'warning' })
      return
    }

    try {
      setLoading(true)
      
      // Step 1: Create subscription if recurring
      let subscriptionId: string | undefined
      if (frequency !== 'oneTime') {
        const subResponse = await fetch('/api/recurring/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            service_type: 'CLEANING',
            frequency,
            day_of_week: new Date(selectedSlot.slot_start).getDay(),
            time_window: new Date(selectedSlot.slot_start).toLocaleTimeString('en-US', {
              hour: 'numeric',
              hour12: true
            }).replace(' ', '–') + new Date(selectedSlot.slot_end).toLocaleTimeString('en-US', {
              hour: 'numeric',
              hour12: true
            }),
            default_addons: addons,
            first_visit_deep: firstVisitDeep,
            next_date: null, // Will be set after first visit completes
          })
        })

        if (subResponse.ok) {
          const { plan } = await subResponse.json()
          subscriptionId = plan.id
        }
      }

      // Step 2: Create order
      const idempotencyKey = `cleaning-${Date.now()}-${Math.random()}`

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({
          service_type: 'CLEANING',
          slot: {
            partner_id: selectedSlot.partner_id,
            slot_start: selectedSlot.slot_start,
            slot_end: selectedSlot.slot_end
          },
          address: {
            line1: address.line1,
            line2: addressLine2 || undefined,
            city: address.city,
            zip: address.zip,
            notes: specialInstructions || undefined
          },
          details: {
            bedrooms,
            bathrooms,
            cleaningType,
            addons: Object.keys(addons).filter(key => addons[key as CleaningAddonKey]),
            frequency,
            firstVisitDeep
          },
          subscription_id: subscriptionId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create order')
      }

      const order = await response.json()
      
      // Show payment modal instead of redirecting
      setCreatedOrderId(order.id)
      setShowPaymentModal(true)
    } catch (err: any) {
      console.error('Order creation error:', err)
      setToast({ 
        message: err.message || 'Failed to create order. Please try again.', 
        type: 'error' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentSuccess = () => {
    if (createdOrderId) {
      router.push(`/orders/${createdOrderId}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Cleaning Service</h1>
            <p className="text-gray-600">Fill out the form below to schedule your cleaning</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Address Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">📍 Service Address</h2>
                {isAddressCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsAddressCollapsed(false)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isAddressCollapsed && address ? (
                <div className="bg-primary-50 rounded-lg p-4">
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
                      setAddress(addr)
                      if (addr) {
                        updatePersistedAddress({
                          line1: addr.line1,
                          line2: addressLine2,
                          zip: addr.zip,
                        })
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
                      setAddressLine2(e.target.value)
                      if (address) {
                        updatePersistedAddress({
                          line1: address.line1,
                          line2: e.target.value,
                          zip: address.zip,
                        })
                      }
                    }}
                    placeholder="Apartment, Suite, etc. (optional)"
                    className="input-field"
                  />
                </div>
              )}
            </div>

            {/* Home Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">✨ Home Details</h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bedrooms
                    </label>
                    <select
                      value={bedrooms}
                      onChange={(e) => {
                        const value = parseInt(e.target.value)
                        setBedrooms(value)
                        updatePersistedHomeSize({ bedrooms: value, bathrooms })
                      }}
                      className="input-field"
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
                        const value = parseInt(e.target.value)
                        setBathrooms(value)
                        updatePersistedHomeSize({ bedrooms, bathrooms: value })
                      }}
                      className="input-field"
                    >
                      <option value="1">1 BA</option>
                      <option value="2">2 BA</option>
                      <option value="3">3 BA</option>
                      <option value="4">4+ BA</option>
                    </select>
                  </div>
                </div>

                {/* Frequency Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Frequency
                  </label>
                  <FrequencySelector 
                    value={frequency} 
                    onChange={setFrequency}
                    firstVisitDeep={firstVisitDeep}
                    onFirstVisitDeepChange={setFirstVisitDeep}
                  />
                </div>

                {/* Cleaning Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cleaning Type
                  </label>
                  <CleaningTypeSelector value={cleaningType} onChange={setCleaningType} />
                </div>

                {/* Add-ons with compact styling */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add-ons (Optional)
                    </label>
                    <EstimateBadge addons={addons} />
                  </div>
                  <CleaningAddons type={cleaningType} value={addons} onChange={setAddons} />
                </div>

                {/* Live Pricing */}
                {address && pricing.total > 0 && (
                  <div className="bg-primary-50 rounded-lg p-4 mt-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>${pricing.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax (8.875%):</span>
                        <span>${pricing.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-primary-200">
                        <span className="font-medium">Estimated Total:</span>
                        <span className="text-2xl font-bold text-primary-600">
                          ${pricing.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-2">
                      Final price confirmed after cleaning
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Schedule Cleaning</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cleaning Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value)
                      setSelectedSlot(null)
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="input-field"
                    required
                  />
                </div>

                {date && address && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Time Slots
                    </label>
                    {loading ? (
                      <p className="text-gray-500">Loading slots...</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-red-600">No slots available. Please select a different date.</p>
                    ) : (
                      <div className="space-y-2">
                        {availableSlots.map(slot => (
                          <label
                            key={`${slot.partner_id}-${slot.slot_start}`}
                            className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                              selectedSlot?.slot_start === slot.slot_start
                                ? 'border-primary-600 bg-primary-50'
                                : ''
                            }`}
                          >
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="slot"
                                checked={selectedSlot?.slot_start === slot.slot_start}
                                onChange={() => setSelectedSlot(slot)}
                                className="mr-3"
                              />
                              <div>
                                <div className="font-medium">
                                  {new Date(slot.slot_start).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}{' '}
                                  -{' '}
                                  {new Date(slot.slot_end).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </div>
                                <div className="text-sm text-gray-600">{slot.partner_name}</div>
                              </div>
                            </div>
                            <span className="text-sm text-gray-500">
                              {slot.available_units} available
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Contact & Notes */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">✉️ Contact Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value)
                      setPhone(formatted)
                      updatePersistedPhone(e.target.value)
                    }}
                    placeholder="(555) 123-4567"
                    className="input-field"
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
                        clearAll()
                        setPhone('')
                        setAddressLine2('')
                        setBedrooms(1)
                        setBathrooms(1)
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      Not you? Clear saved details
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cleaning Notes (Optional)
                  </label>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g., Pets at home, areas needing special attention, access instructions..."
                    rows={3}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <button
                type="submit"
                disabled={!persistedLoaded || loading || !address || !isAddressValid || !selectedSlot}
                className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : `Confirm & Pay $${pricing.total.toFixed(2)}`}
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                You'll be charged after cleaning. Secure payment by Stripe.
              </p>
            </div>
            {/* Accessibility: Prefill announcement */}
            {prefillMsg && (
              <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                {prefillMsg}
              </div>
            )}
          </form>

          {/* Payment Modal */}
          {createdOrderId && (
            <PaymentModal
              isOpen={showPaymentModal}
              onClose={() => setShowPaymentModal(false)}
              orderId={createdOrderId}
              amount={Math.round(pricing.total * 100)}
              onSuccess={handlePaymentSuccess}
            />
          )}
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default function CleaningBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CleaningBookingForm />
    </Suspense>
  )
}
