'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { PaymentModal } from '@/components/PaymentModal'
import { Toast } from '@/components/Toast'
import { Header } from '@/components/Header'
import { PolicyBanner, ServiceInfoBanner, PaymentBanner, DryCleanBanner, RushServiceBanner } from '@/components/ui/InfoBanner'
import { PriceSummary, EstimateBadge } from '@/components/ui/PriceDisplay'
import { usePersistentBooking, formatPhone } from '@/hooks/usePersistentBooking'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { StripePaymentCollector } from '@/components/booking/StripePaymentCollector'
import { isSetupIntentEnabled } from '@/lib/feature-flags'

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

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

type LaundryServiceType = 'washFold' | 'dryClean' | 'mixed'
type WeightTier = 'small' | 'medium' | 'large'

function LaundryBookingForm() {
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
  const [serviceType, setServiceType] = useState<LaundryServiceType>('washFold')
  const [weightTier, setWeightTier] = useState<WeightTier>('medium')
  const [estimatedPounds, setEstimatedPounds] = useState<number>(15)
  const [rushService, setRushService] = useState(false)
  
  // Schedule
  const [date, setDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  
  // Pricing
  const [pricing, setPricing] = useState({ subtotal: 0, tax: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  
  // Payment modal state (old flow)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)
  
  // Setup Intent state (new flow)
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isSetupIntentFlow, setIsSetupIntentFlow] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
  }, [persistedLoaded, persistedPhone, persistedAddress])

  // Check feature flag for Setup Intent
  useEffect(() => {
    const checkFeatureFlag = async () => {
      const enabled = await isSetupIntentEnabled()
      setIsSetupIntentFlow(enabled)
    }
    checkFeatureFlag()
  }, [])
  
  // Handle 3DS redirect return
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const setupIntentClientSecret = urlParams.get('setup_intent_client_secret')
    const redirectStatus = urlParams.get('redirect_status')
    
    if (setupIntentClientSecret) {
      if (redirectStatus === 'succeeded') {
        setToast({
          message: 'Payment method verified successfully! Completing your booking...',
          type: 'success'
        })
      } else if (redirectStatus === 'failed') {
        setToast({
          message: 'Payment verification failed. Please try again.',
          type: 'error'
        })
      }
    }
  }, [])
  
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
              setIsAddressValid(true)
              setIsAddressCollapsed(true)
            }
            
            // Pre-fill service details if it was a laundry order
            if (lastOrder.service_type === 'LAUNDRY' && lastOrder.order_details) {
              if (lastOrder.order_details.serviceType) {
                setServiceType(lastOrder.order_details.serviceType)
              }
              if (lastOrder.order_details.weightTier) {
                setWeightTier(lastOrder.order_details.weightTier)
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

  // Update estimated pounds based on weight tier
  useEffect(() => {
    const tierPounds = {
      small: 10,
      medium: 15,
      large: 25
    }
    setEstimatedPounds(tierPounds[weightTier])
  }, [weightTier])

  // Calculate price whenever service details change
  useEffect(() => {
    const calculatePrice = async () => {
      if (!address) return

      try {
        const response = await fetch('/api/price/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: 'LAUNDRY',
            zip: address.zip,
            lbs: estimatedPounds, // API expects 'lbs' not 'estimatedPounds'
            addons: [], // No addons for now
            rushService
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
  }, [address, serviceType, weightTier, estimatedPounds, rushService])

  // Fetch slots when date changes
  useEffect(() => {
    const fetchSlots = async () => {
      if (!date || !address) return

      try {
        setLoading(true)
        const response = await fetch(
          `/api/slots?service=LAUNDRY&zip=${address.zip}&date=${date}`
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
      router.push('/login?returnTo=/book/laundry')
      return
    }

    if (!address || !selectedSlot) {
      setToast({ message: 'Please complete all required fields', type: 'warning' })
      return
    }
    
    // If Setup Intent is enabled, require payment method
    if (isSetupIntentFlow && !paymentMethodId) {
      setToast({ message: 'Please provide a payment method', type: 'warning' })
      return
    }

    try {
      setLoading(true)
      setSubmitting(true)

      let orderId: string

      if (isSetupIntentFlow && paymentMethodId) {
        // NEW FLOW: Use Setup Intent saga
        
        const setupResponse = await fetch('/api/payment/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_type: 'LAUNDRY',
            service_category: serviceType,
            estimated_amount_cents: Math.round(pricing.total * 100),
            payment_method_id: paymentMethodId,
            slot: {
              partner_id: selectedSlot.partner_id,
              slot_start: selectedSlot.slot_start,
              slot_end: selectedSlot.slot_end,
            },
            address: {
              line1: address.line1,
              line2: addressLine2 || undefined,
              city: address.city,
              zip: address.zip,
              notes: specialInstructions || undefined,
            },
            phone: phone,
            details: {
              serviceType,
              weightTier: serviceType === 'washFold' ? weightTier : undefined,
              estimatedPounds: serviceType === 'washFold' ? estimatedPounds : undefined,
              rushService
            }
          })
        })

        if (!setupResponse.ok) {
          const error = await setupResponse.json()
          throw new Error(error.error || 'Failed to setup payment')
        }

        const setupResult = await setupResponse.json()
        orderId = setupResult.order_id
      } else {
        // OLD FLOW: Deferred payment (existing code)
        
        const idempotencyKey = `laundry-${Date.now()}-${Math.random()}`

        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
          },
          body: JSON.stringify({
            service_type: 'LAUNDRY',
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
              serviceType,
              weightTier: serviceType === 'washFold' ? weightTier : undefined,
              estimatedPounds: serviceType === 'washFold' ? estimatedPounds : undefined,
              rushService
            }
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create order')
        }

        const order = await response.json()
        orderId = order.id
      }

      // Redirect to order page
      router.push(`/orders/${orderId}`)
      
    } catch (err: any) {
      console.error('Order creation error:', err)
      setToast({ 
        message: err.message || 'Failed to create order. Please try again.', 
        type: 'error' 
      })
    } finally {
      setLoading(false)
      setSubmitting(false)
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Laundry Service</h1>
            <p className="text-gray-600">Schedule your laundry pickup and delivery</p>
          </div>

          {/* Cancellation Policy Banner */}
          <PolicyBanner />

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Address Section */}
            <div className="card-standard card-padding">
              <div className="flex items-center justify-between mb-4">
                <h2 className="heading-section">📍 Pickup Address</h2>
                {isAddressCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsAddressCollapsed(false)}
                    className="text-sm text-brand hover:text-brand-700 transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              {isAddressCollapsed && address ? (
                <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
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

            {/* Service Details */}
            <div className="card-standard card-padding">
              <h2 className="heading-section">👕 Service Details</h2>
              
              <div className="space-y-4">
                {/* Service Type Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Type
                  </label>
                  <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setServiceType('washFold')}
                      className={`p-4 border-2 rounded-xl text-center transition-all ${
                        serviceType === 'washFold'
                          ? 'border-brand bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">🧺</div>
                      <div className="font-medium text-sm">Wash & Fold</div>
                      <div className="text-xs text-gray-500 mt-1">Per pound pricing</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceType('dryClean')}
                      className={`p-4 border-2 rounded-xl text-center transition-all ${
                        serviceType === 'dryClean'
                          ? 'border-brand bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">👔</div>
                      <div className="font-medium text-sm">Dry Clean</div>
                      <div className="text-xs text-gray-500 mt-1">Per item pricing</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceType('mixed')}
                      className={`p-4 border-2 rounded-xl text-center transition-all ${
                        serviceType === 'mixed'
                          ? 'border-brand bg-brand-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-2">🔄</div>
                      <div className="font-medium text-sm">Mixed</div>
                      <div className="text-xs text-gray-500 mt-1">Both services</div>
                    </button>
                  </div>
                </div>

                {/* Weight Tier (for Wash & Fold) */}
                {serviceType === 'washFold' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Load Size
                    </label>
                    <div className="grid grid-cols-1 xs:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setWeightTier('small')}
                        className={`p-4 border-2 rounded-xl text-center transition-all ${
                          weightTier === 'small'
                            ? 'border-brand bg-brand-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">Small</div>
                        <div className="text-xs text-gray-500 mt-1">~10 lbs</div>
                        <div className="text-xs text-gray-400">1-2 loads</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWeightTier('medium')}
                        className={`p-4 border-2 rounded-xl text-center transition-all ${
                          weightTier === 'medium'
                            ? 'border-brand bg-brand-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">Medium</div>
                        <div className="text-xs text-gray-500 mt-1">~15 lbs</div>
                        <div className="text-xs text-gray-400">2-3 loads</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWeightTier('large')}
                        className={`p-4 border-2 rounded-xl text-center transition-all ${
                          weightTier === 'large'
                            ? 'border-brand bg-brand-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">Large</div>
                        <div className="text-xs text-gray-500 mt-1">~25 lbs</div>
                        <div className="text-xs text-gray-400">3-4 loads</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* Dry Clean Notice */}
                {(serviceType === 'dryClean' || serviceType === 'mixed') && (
                  <DryCleanBanner />
                )}

                {/* Service Information Banner */}
                <ServiceInfoBanner service="laundry" />

                {/* Rush Service Option */}
                <div>
                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                    <input
                      type="checkbox"
                      checked={rushService}
                      onChange={(e) => setRushService(e.target.checked)}
                      className="w-6 h-6"
                    />
                    <div className="flex-1">
                      <div className="font-medium">⚡ 24-Hour Rush Service (+25%)</div>
                      <div className="text-sm text-gray-500">
                        Same-day return if picked up before 11 AM, otherwise next-day delivery
                      </div>
                    </div>
                  </label>
                </div>

                {/* Live Pricing */}
                {address && pricing.total > 0 && (
                  <PriceSummary
                    rows={[
                      { label: 'Subtotal', amount: pricing.subtotal },
                      { label: 'Tax (8.875%)', amount: pricing.tax }
                    ]}
                    total={pricing.total}
                    totalLabel={serviceType === 'washFold' ? 'Estimated Total' : 'Estimated Minimum'}
                    note={serviceType === 'washFold' 
                      ? 'Final price based on actual weight'
                      : 'Final price confirmed after inspection'}
                    className="mt-4"
                  />
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="card-standard card-padding">
              <h2 className="heading-section">📅 Schedule Pickup</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pickup Date
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

            {/* Payment Method Collection - Only if Setup Intent enabled */}
            {isSetupIntentFlow && address && selectedSlot && pricing.total > 0 && (
              <div className="card-standard card-padding">
                <h2 className="heading-section">💳 Payment Method</h2>
                
                <Elements stripe={stripePromise}>
                  <StripePaymentCollector
                    estimatedAmountCents={Math.round(pricing.total * 100)}
                    onPaymentMethodReady={setPaymentMethodId}
                    onError={setPaymentError}
                    userId={user?.id || ''}
                  />
                </Elements>
                
                {paymentError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{paymentError}</p>
                  </div>
                )}
                
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700">
                    💡 <strong>$0.00 charged now.</strong> Your card is securely saved. You'll be charged the exact amount after we complete your laundry.
                  </p>
                </div>
              </div>
            )}

            {/* Contact & Notes */}
            <div className="card-standard card-padding">
              <h2 className="heading-section">✉️ Contact Information</h2>
              
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
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      Not you? Clear saved details
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g., Stain treatment preferences, fabric softener requests, access instructions..."
                    rows={4}
                    maxLength={500}
                    className="textarea-field"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {specialInstructions.length}/500 characters
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="card-standard card-padding">
              <button
                type="submit"
                disabled={
                  !persistedLoaded || 
                  loading || 
                  submitting ||
                  !address || 
                  !isAddressValid || 
                  !selectedSlot ||
                  !phone?.trim() ||
                  phone.replace(/\D/g, '').length < 10 ||
                  (isSetupIntentFlow && !paymentMethodId)
                }
                className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Scheduling…' : 'Schedule Pickup'}
              </button>
              
              {/* Payment messaging */}
              <PaymentBanner isSetupIntent={isSetupIntentFlow} className="mt-4" />
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

export default function LaundryBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LaundryBookingForm />
    </Suspense>
  )
}
