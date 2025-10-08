'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { PaymentModal } from '@/components/PaymentModal'
import { Toast } from '@/components/Toast'
import { Header } from '@/components/Header'
import { PolicyBanner, ServiceInfoBanner, PaymentBanner, DryCleanBanner, RushServiceBanner } from '@/components/ui/InfoBanner'
import { PriceSummary, EstimateBadge } from '@/components/ui/PriceDisplay'
import { usePersistentBooking, formatPhone } from '@/hooks/usePersistentBooking'
import { useBookingDraft, BookingDraft } from '@/hooks/useBookingDraft'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { StripePaymentCollector } from '@/components/booking/StripePaymentCollector'
import AddressRequiredState from '@/components/booking/AddressRequiredState'
import { isSetupIntentEnabled } from '@/lib/feature-flags'
import { 
  findSlotClosestTo24Hours, 
  getMinimumDeliveryDate, 
  findEarliestDeliverySlot 
} from '@/lib/slots'

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
  const searchParams = useSearchParams()
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
  
  // Booking draft (for unauthenticated users)
  const {
    saveDraft,
    restoreDraft,
    clearDraft,
  } = useBookingDraft('LAUNDRY')
  
  // Track if we've restored from draft (to prevent last order from overwriting)
  const [hasRestoredFromDraft, setHasRestoredFromDraft] = useState(false)
  
  // Key to force AddressAutocomplete remount when address is restored
  const [addressKey, setAddressKey] = useState(0)
  
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
  const [deliveryDate, setDeliveryDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [availableDeliverySlots, setAvailableDeliverySlots] = useState<TimeSlot[]>([])
  const [selectedDeliverySlot, setSelectedDeliverySlot] = useState<TimeSlot | null>(null)
  const [loadingDeliverySlots, setLoadingDeliverySlots] = useState(false)
  
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
  
  // Set default pickup date to earliest date with available slots (at least 6h away)
  useEffect(() => {
    const findEarliestAvailableDate = async () => {
      if (!address) return
      
      const now = new Date()
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      
      // Check today and next 7 days
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() + i)
        const dateStr = checkDate.toISOString().split('T')[0]
        
        try {
          const response = await fetch(
            `/api/slots?service=LAUNDRY&zip=${address.zip}&date=${dateStr}`
          )
          if (response.ok) {
            const data = await response.json()
            const slots = data.slots || []
            
            // Check if any slots are available (server already filters out slots within 6h)
            if (slots.length > 0) {
              setDate(dateStr)
              return
            }
          }
        } catch (err) {
          console.error('Failed to check slots for date:', dateStr, err)
        }
      }
      
      // Fallback to tomorrow if no slots found
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      setDate(tomorrow.toISOString().split('T')[0])
    }
    
    findEarliestAvailableDate()
  }, [address])

  // Restore draft after login (takes priority over last order)
  useEffect(() => {
    // Only proceed if persistedLoaded is ready
    if (!persistedLoaded) {
      return
    }
    
    // Check if we should restore from draft
    const shouldRestore = searchParams.get('restore') === 'true'
    if (!shouldRestore) {
      return
    }
    
    // Wait for user to be authenticated before restoring
    if (!user) {
      console.log('Waiting for user auth to complete before restoring draft...')
      return
    }
    
    const draft = restoreDraft()
    
    // Debug: Log what we're restoring
    console.log('=== RESTORING DRAFT ===')
    console.log('Draft:', draft)
    
    if (draft && draft.serviceType === 'LAUNDRY' && draft.laundry) {
      // Restore shared fields
      if (draft.phone) {
        console.log('Restoring phone:', draft.phone)
        setPhone(formatPhone(draft.phone))
      }
      if (draft.address) {
        console.log('Restoring address:', draft.address)
        setAddress(draft.address)
        setIsAddressValid(true)
        setIsAddressCollapsed(false) // Keep it expanded so user can see it was restored
        if (draft.address.line2) setAddressLine2(draft.address.line2)
        // Force AddressAutocomplete to remount with the restored value
        setAddressKey(prev => prev + 1)
      }
      if (draft.specialInstructions) setSpecialInstructions(draft.specialInstructions)
      if (draft.pickupDate) setDate(draft.pickupDate)
      
      // Restore pickup slot with proper typing
      if (draft.pickupSlot) {
        setSelectedSlot({
          partner_id: draft.pickupSlot.partner_id,
          partner_name: '', // Will be filled when slots are fetched
          slot_start: draft.pickupSlot.slot_start,
          slot_end: draft.pickupSlot.slot_end,
          available_units: 0,
          max_units: 0,
          service_type: 'LAUNDRY'
        })
      }
      
      // Restore laundry-specific fields
      setServiceType(draft.laundry.serviceType)
      if (draft.laundry.weightTier) setWeightTier(draft.laundry.weightTier)
      if (draft.laundry.estimatedPounds) setEstimatedPounds(draft.laundry.estimatedPounds)
      setRushService(draft.laundry.rushService)
      if (draft.laundry.deliveryDate) setDeliveryDate(draft.laundry.deliveryDate)
      
      // Restore delivery slot with proper typing
      if (draft.laundry.deliverySlot) {
        setSelectedDeliverySlot({
          partner_id: draft.laundry.deliverySlot.partner_id,
          partner_name: '', // Will be filled when slots are fetched
          slot_start: draft.laundry.deliverySlot.slot_start,
          slot_end: draft.laundry.deliverySlot.slot_end,
          available_units: 0,
          max_units: 0,
          service_type: 'LAUNDRY'
        })
      }
      
      // Mark that we've restored from draft
      setHasRestoredFromDraft(true)
      
      // Clear draft after successful restore
      clearDraft()
      
      // Clear the restore parameter from URL
      router.replace('/book/laundry', { scroll: false })
      
      // Show success message
      setToast({
        message: '✨ Your booking information has been restored!',
        type: 'success'
      })
    }
  }, [user, persistedLoaded, searchParams, restoreDraft, clearDraft, router])

  // Load last order for smart defaults (only if we haven't restored from draft)
  useEffect(() => {
    const loadLastOrder = async () => {
      if (!user || hasRestoredFromDraft) return

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
  }, [user, hasRestoredFromDraft])

  // Calculate price whenever service details change
  useEffect(() => {
    const calculatePrice = async () => {
      if (!address) return

      // Calculate pounds directly based on weight tier to avoid race conditions
      const tierPounds = {
        small: 15,
        medium: 25,
        large: 50
      }
      const pounds = tierPounds[weightTier]
      
      // Update estimatedPounds state for display purposes
      setEstimatedPounds(pounds)

      try {
        const response = await fetch('/api/price/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: 'LAUNDRY',
            zip: address.zip,
            lbs: pounds, // Use calculated pounds directly
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
  }, [address, serviceType, weightTier, rushService])

  // Find earliest delivery date with available slots when pickup slot or rush service changes
  useEffect(() => {
    const findEarliestDeliveryDate = async () => {
      if (!selectedSlot || !address) {
        setDeliveryDate('') // Clear if no slot selected
        return
      }
      
      // Calculate minimum delivery date (48h for standard, 24h for rush)
      const minDeliveryDate = getMinimumDeliveryDate(selectedSlot.slot_end, rushService)
      
      // CRITICAL: Log for debugging to verify correct calculation
      console.log('Pickup ends:', selectedSlot.slot_end)
      console.log('Rush service:', rushService)
      console.log('Minimum delivery date:', minDeliveryDate)
      console.log('Browser timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone)
      
      // Parse the minimum date - it's already in YYYY-MM-DD format from getMinimumDeliveryDate
      // which uses NY timezone internally, so we just use it as-is
      const minDateStr = minDeliveryDate
      
      // Search up to 14 days to find first date with valid slots
      for (let i = 0; i < 14; i++) {
        // Work with date strings directly to avoid timezone conversion issues
        const checkDate = new Date(minDateStr + 'T12:00:00') // Use noon to avoid DST issues
        checkDate.setDate(checkDate.getDate() + i)
        const dateStr = checkDate.toISOString().split('T')[0]
        
        try {
          const response = await fetch(
            `/api/slots?service=LAUNDRY&zip=${address.zip}&date=${dateStr}`
          )
          if (response.ok) {
            const data = await response.json()
            const slots: TimeSlot[] = data.slots || []
            
            // Check if there are valid slots that meet the minimum time requirement
            if (slots.length > 0) {
              const validSlot = findEarliestDeliverySlot<TimeSlot>(
                slots,
                selectedSlot.slot_end,
                rushService
              )
              
              // Only use this date if it has at least one valid slot
              if (validSlot) {
                console.log('Found valid delivery date with slots:', dateStr)
                setDeliveryDate(dateStr)
                setSelectedDeliverySlot(null)
                return
              }
            }
          }
        } catch (err) {
          console.error('Failed to check delivery slots for date:', dateStr, err)
        }
      }
      
      // If no valid slots found in 14 days, set to minimum date anyway
      // The UI will show a warning that no slots meet the requirement
      console.log('No valid slots found, using minimum date:', minDateStr)
      setDeliveryDate(minDateStr)
      setSelectedDeliverySlot(null)
    }
    
    findEarliestDeliveryDate()
  }, [selectedSlot, rushService, address])

  // Fetch pickup slots when date changes
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
          const slots: TimeSlot[] = data.slots || []
          setAvailableSlots(slots)
          
          // Auto-select slot closest to 24h from now only if no slot is currently selected
          if (slots.length > 0 && !selectedSlot) {
            const closestSlot = findSlotClosestTo24Hours<TimeSlot>(slots)
            if (closestSlot) {
              setSelectedSlot(closestSlot)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch slots:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSlots()
  }, [date, address])

  // Fetch delivery slots when delivery date changes
  useEffect(() => {
    const fetchDeliverySlots = async () => {
      if (!deliveryDate || !address || !selectedSlot) return

      try {
        setLoadingDeliverySlots(true)
        const response = await fetch(
          `/api/slots?service=LAUNDRY&zip=${address.zip}&date=${deliveryDate}`
        )
        if (response.ok) {
          const data = await response.json()
          const slots: TimeSlot[] = data.slots || []
          setAvailableDeliverySlots(slots)
          
          // Auto-select earliest valid delivery slot only if no slot is currently selected
          if (slots.length > 0 && !selectedDeliverySlot) {
            const earliestSlot = findEarliestDeliverySlot<TimeSlot>(
              slots,
              selectedSlot.slot_end,
              rushService
            )
            if (earliestSlot) {
              setSelectedDeliverySlot(earliestSlot)
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch delivery slots:', err)
      } finally {
        setLoadingDeliverySlots(false)
      }
    }

    fetchDeliverySlots()
  }, [deliveryDate, address, selectedSlot, rushService])

  // Handle login required (save draft and redirect)
  const handleLoginRequired = () => {
    // Debug: Log what we're saving
    console.log('=== SAVING DRAFT ===')
    console.log('Address:', address)
    console.log('Phone:', phone)
    console.log('Service Type:', serviceType)
    
    // Save whatever form state we have (even if incomplete)
    const draftData = {
      serviceType: 'LAUNDRY' as const,
      timestamp: Date.now(),
      phone,
      address: address || undefined, // Can be null - that's OK!
      specialInstructions,
      pickupDate: date,
      pickupSlot: selectedSlot || undefined,
      laundry: {
        serviceType,
        weightTier,
        estimatedPounds,
        rushService,
        deliveryDate: deliveryDate || undefined,
        deliverySlot: selectedDeliverySlot || undefined,
      }
    }
    
    console.log('Draft to save:', JSON.stringify(draftData, null, 2))
    saveDraft(draftData)
    
    // Redirect with restore parameter to trigger draft restoration after auth
    router.push('/login?returnTo=/book/laundry&restore=true')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      handleLoginRequired()
      return
    }

    // Validate required fields
    if (!address || !selectedSlot) {
      setToast({ message: 'Please complete all required fields', type: 'warning' })
      return
    }
    
    // CRITICAL: Delivery date is REQUIRED - validate it exists
    if (!deliveryDate) {
      setToast({ message: 'Please select a delivery date', type: 'warning' })
      return
    }
    
    // Delivery time slot is optional - if not selected, we'll coordinate manually
    // (This allows booking even when no time slots are available)
    
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
            delivery_slot: selectedDeliverySlot ? {
              partner_id: selectedDeliverySlot.partner_id,
              slot_start: selectedDeliverySlot.slot_start,
              slot_end: selectedDeliverySlot.slot_end,
            } : undefined,
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
              weightTier: (serviceType === 'washFold' || serviceType === 'mixed') ? weightTier : undefined,
              estimatedPounds: (serviceType === 'washFold' || serviceType === 'mixed') ? estimatedPounds : undefined,
              rushService,
              preferredDeliveryDate: deliveryDate
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
            delivery_slot: selectedDeliverySlot ? {
              partner_id: selectedDeliverySlot.partner_id,
              slot_start: selectedDeliverySlot.slot_start,
              slot_end: selectedDeliverySlot.slot_end,
            } : undefined,
            address: {
              line1: address.line1,
              line2: addressLine2 || undefined,
              city: address.city,
              zip: address.zip,
              notes: specialInstructions || undefined
            },
            details: {
              serviceType,
              weightTier: (serviceType === 'washFold' || serviceType === 'mixed') ? weightTier : undefined,
              estimatedPounds: (serviceType === 'washFold' || serviceType === 'mixed') ? estimatedPounds : undefined,
              rushService,
              preferredDeliveryDate: deliveryDate
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

      // Clear draft on successful booking
      clearDraft()
      
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

  // Scroll to address section
  const handleScrollToAddress = () => {
    const addressSection = document.querySelector('[data-address-section]')
    if (addressSection) {
      addressSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      })
      // Focus on the address input after scrolling
      setTimeout(() => {
        const addressInput = addressSection.querySelector('input')
        if (addressInput) {
          addressInput.focus()
        }
      }, 500)
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
            <div className="card-standard card-padding" data-address-section>
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
                    key={addressKey}
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

                {/* Weight Tier (for Wash & Fold and Mixed) */}
                {(serviceType === 'washFold' || serviceType === 'mixed') && (
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
                        <div className="text-xs text-gray-500 mt-1">~15 lbs</div>
                        <div className="text-xs text-gray-400">2-3 loads</div>
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
                        <div className="text-xs text-gray-500 mt-1">~25 lbs</div>
                        <div className="text-xs text-gray-400">3-4 loads</div>
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
                        <div className="text-xs text-gray-500 mt-1">~50 lbs</div>
                        <div className="text-xs text-gray-400">6-8 loads</div>
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

                {/* Same Day Service Option */}
                <div>
                  <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                    <input
                      type="checkbox"
                      checked={rushService}
                      onChange={(e) => setRushService(e.target.checked)}
                      className="w-6 h-6"
                    />
                    <div className="flex-1">
                      <div className="font-medium">⚡ Same Day Service (+25%)</div>
                      <div className="text-sm text-gray-500">
                        Pickup before 11 AM: delivery same day (6-8 PM or 8-10 PM). After 11 AM: next-day delivery
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
              
              {!address ? (
                <AddressRequiredState onEnterAddress={handleScrollToAddress} />
              ) : (
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {availableSlots.map(slot => (
                          <label
                            key={`${slot.partner_id}-${slot.slot_start}`}
                            className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all hover:border-primary-300 ${
                              selectedSlot?.slot_start === slot.slot_start
                                ? 'border-primary-600 bg-primary-50 ring-2 ring-primary-200'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <input
                                type="radio"
                                name="slot"
                                checked={selectedSlot?.slot_start === slot.slot_start}
                                onChange={() => setSelectedSlot(slot)}
                                className="flex-shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm">
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
                                <div className="text-xs text-gray-500 truncate">{slot.partner_name}</div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                              {slot.available_units}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Delivery Date Selector */}
                {date && selectedSlot && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🚚 Preferred Delivery Date
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => {
                        const newDate = e.target.value
                        const minDate = getMinimumDeliveryDate(selectedSlot.slot_end, rushService)
                        
                        // Validate that the selected date meets minimum requirements
                        if (newDate < minDate) {
                          setToast({
                            message: `Delivery date must be at least ${rushService ? '24' : '48'} hours after pickup. Minimum date is ${new Date(minDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`,
                            type: 'warning'
                          })
                          setDeliveryDate(minDate)
                        } else {
                          setDeliveryDate(newDate)
                        }
                        setSelectedDeliverySlot(null) // Clear slot when date changes manually
                      }}
                      min={getMinimumDeliveryDate(selectedSlot.slot_end, rushService)}
                      max={new Date(new Date(selectedSlot.slot_end).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      className="input-field"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Default is 2 days after pickup. You can choose any date between 1-7 days after pickup.
                      {rushService && ' Rush service will override this to next-day delivery.'}
                    </p>
                    {deliveryDate && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          📅 Your laundry will be delivered on{' '}
                          <span className="font-medium">
                            {new Date(deliveryDate + 'T12:00:00').toLocaleDateString('en-US', {
                              timeZone: 'America/New_York',
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Delivery Time Slots */}
                    {deliveryDate && address && selectedSlot && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🕐 Delivery Time Slots <span className="text-xs font-normal text-gray-500">(Optional)</span>
                        </label>
                        {loadingDeliverySlots ? (
                          <p className="text-gray-500">Loading delivery slots...</p>
                        ) : (() => {
                          // Filter slots to only show valid ones based on service type and pickup time
                          const validSlots = availableDeliverySlots.filter(slot => {
                            const pickupEnd = new Date(selectedSlot.slot_end)
                            const deliveryStart = new Date(slot.slot_start)
                            
                            // Check if pickup ends at or before 11 AM in NY timezone
                            const pickupEndHourNY = parseInt(pickupEnd.toLocaleTimeString('en-US', {
                              timeZone: 'America/New_York',
                              hour: '2-digit',
                              hour12: false
                            }))
                            
                            // Determine minimum hours based on service type and pickup time
                            let minimumHours: number
                            if (rushService && pickupEndHourNY <= 11) {
                              // Same day service: if pickup ends at or before 11 AM, can deliver same day evening
                              minimumHours = 0
                            } else if (rushService) {
                              // Same day service: if pickup after 11 AM, deliver next day (24h)
                              minimumHours = 24
                            } else {
                              // Standard service: 48 hours
                              minimumHours = 48
                            }
                            
                            const minimumTime = new Date(pickupEnd.getTime() + minimumHours * 60 * 60 * 1000)
                            return deliveryStart >= minimumTime
                          })
                          
                          return validSlots.length === 0 ? (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-blue-800 text-sm font-medium mb-1">
                                ✓ You can proceed without selecting a time slot
                              </p>
                              <p className="text-blue-700 text-xs">
                                Our team will schedule your delivery during business hours and contact you to confirm the exact time. 
                                Your laundry will be delivered on your selected date.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                      <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg mb-2">
                        <p className="text-xs text-blue-700">
                          💡 Select your preferred delivery time (optional). If not selected, we'll schedule during business hours.
                          {!rushService && ' (Only showing slots at least 48 hours after pickup end time)'}
                          {rushService && ' (Only showing slots at least 24 hours after pickup end time)'}
                        </p>
                      </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {validSlots.map(slot => (
                                  <label
                                    key={`delivery-${slot.partner_id}-${slot.slot_start}`}
                                    className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all hover:border-green-300 ${
                                      selectedDeliverySlot?.slot_start === slot.slot_start
                                        ? 'border-green-600 bg-green-50 ring-2 ring-green-200'
                                        : 'border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <input
                                        type="radio"
                                        name="deliverySlot"
                                        checked={selectedDeliverySlot?.slot_start === slot.slot_start}
                                        onChange={() => setSelectedDeliverySlot(slot)}
                                        className="flex-shrink-0"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="font-medium text-sm">
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
                                        <div className="text-xs text-gray-500 truncate">{slot.partner_name}</div>
                                      </div>
                                    </div>
                                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                      {slot.available_units}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}
                </div>
              )}
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
              {!user ? (
                <button
                  type="button"
                  onClick={handleLoginRequired}
                  className="w-full btn-primary text-lg py-4"
                >
                  Log In to Complete Booking
                </button>
              ) : (
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
              )}
              
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

function LaundryBookingPageWrapper() {
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
      <LaundryBookingPageWrapper />
    </Suspense>
  )
}
