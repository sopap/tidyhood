'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

// Type for available time slots from API
interface TimeSlot {
  partner_id: string
  partner_name: string
  slot_start: string
  slot_end: string
  available_units: number
  max_units: number
  service_type: string
}

// Type for saved booking data
interface SavedBookingData {
  formData: {
    zip: string
    pounds: number
    // bathrooms removed
    // deep removed
    addons: string[]
    date: string
    addressLine1: string
    addressLine2: string
    city: string
    phone: string
    specialInstructions: string
  }
  selectedSlot: TimeSlot | null
  pricing: {
    subtotal: number
    tax: number
    total: number
  }
  step: number
}

// Multi-step booking form for cleaning service
function BookingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    zip: '',
    pounds: 15,
    // bathrooms removed
    // deep removed
    addons: [] as string[],
    date: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    phone: '',
    specialInstructions: ''
  })

  const [pricing, setPricing] = useState({
    subtotal: 0,
    tax: 0,
    total: 0
  })
  const [loading, setLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  // Restore booking data from sessionStorage if returning from login
  useEffect(() => {
    const shouldRestore = searchParams.get('restore') === 'true'
    if (shouldRestore) {
      try {
        const savedData = sessionStorage.getItem('pending-laundry-order')
        if (savedData) {
          const parsed: SavedBookingData = JSON.parse(savedData)
          setFormData(parsed.formData)
          setSelectedSlot(parsed.selectedSlot)
          setPricing(parsed.pricing)
          setStep(parsed.step)
          // Clear the saved data
          sessionStorage.removeItem('pending-laundry-order')
          // Remove restore param from URL
          router.replace('/book/laundry')
        }
      } catch (err) {
        console.error('Failed to restore booking data:', err)
      }
    }
  }, [searchParams, router])

  const addons = [
    { id: 'LND_RUSH_24HR', name: 'Rush Service (24hr)', price: 10 },
    { id: 'LND_DELICATE', name: 'Delicate Care', price: 10 },
    { id: 'LND_EXTRA_SOFTENER', name: 'Extra Softener', price: 3 },
    { id: 'LND_FOLDING', name: 'Professional Folding', price: 5 },
  ]

  const basePrices: Record<number, number> = {
    0: 89,  // Studio
    1: 119, // 1BR
    2: 149, // 2BR
    3: 179, // 3BR
    4: 219, // 4BR+
  }

  const handleAddonToggle = (addonId: string) => {
    setFormData(prev => ({
      ...prev,
      addons: prev.addons.includes(addonId)
        ? prev.addons.filter(id => id !== addonId)
        : [...prev.addons, addonId]
    }))
  }

  const calculatePrice = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/price/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'LAUNDRY',
          zip: formData.zip,
          lbs: formData.pounds,
          addons: formData.addons
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to calculate price')
      }

      const quote = await response.json()
      setPricing({
        subtotal: quote.subtotal_cents / 100,
        tax: quote.tax_cents / 100,
        total: quote.total_cents / 100
      })
    } catch (err) {
      console.error('Price calculation error:', err)
      alert('Failed to calculate price. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = async () => {
    // Validate required fields before proceeding
    if (step === 1) {
      if (!formData.zip || formData.zip.length !== 5) {
        alert('Please enter a valid 5-digit ZIP code')
        return
      }
      await calculatePrice()
      setStep(2)
    } else if (step === 2) {
      if (!formData.date) {
        alert('Please select a service date')
        return
      }
      // Fetch slots when date is selected, if not already fetched
      if (availableSlots.length === 0) {
        await fetchAvailableSlots()
      }
      if (!selectedSlot) {
        alert('Please select a time slot')
        return
      }
      setStep(3)
    } else if (step === 3) {
      if (!formData.addressLine1) {
        alert('Please enter your street address')
        return
      }
      if (!formData.city) {
        alert('Please enter your city')
        return
      }
      if (!formData.phone) {
        alert('Please enter your phone number')
        return
      }
      setStep(4)
    }
  }

  const fetchAvailableSlots = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/slots?service=LAUNDRY&zip=${formData.zip}&date=${formData.date}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch slots')
      }

      const data = await response.json()
      setAvailableSlots(data.slots || [])
    } catch (err) {
      console.error('Slots fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  const saveBookingData = () => {
    const bookingData: SavedBookingData = {
      formData,
      selectedSlot,
      pricing,
      step
    }
    sessionStorage.setItem('pending-laundry-order', JSON.stringify(bookingData))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedSlot) {
      alert('Please select a time slot')
      return
    }

    // Check if user is authenticated
    if (!user) {
      // Save booking data before redirecting to login
      saveBookingData()
      // Redirect to login with return URL
      router.push('/login?returnTo=/book/laundry&restore=true')
      return
    }
    
    try {
      setLoading(true)
      
      // Generate idempotency key
      const idempotencyKey = `laundry-${Date.now()}-${Math.random()}`
      
      // Format request body to match API schema
      const requestBody = {
        service_type: 'LAUNDRY',
        slot: {
          partner_id: selectedSlot.partner_id,
          slot_start: selectedSlot.slot_start,
          slot_end: selectedSlot.slot_end
        },
        address: {
          line1: formData.addressLine1,
          line2: formData.addressLine2 || undefined,
          city: formData.city,
          zip: formData.zip,
          notes: formData.specialInstructions || undefined
        },
        details: {
          lbs: formData.pounds,
          // bathrooms removed
          // deep removed
          addons: formData.addons
        }
      }
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create order')
      }

      const order = await response.json()
      alert(`Order created successfully! Order ID: ${order.id}`)
      // Clear any saved booking data
      sessionStorage.removeItem('pending-laundry-order')
      // TODO: Redirect to payment or order confirmation page
      window.location.href = `/orders/${order.id}`
    } catch (err: any) {
      console.error('Order creation error:', err)
      alert(err.message || 'Failed to create order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-primary-900">
              Tidyhood
            </Link>
            <Link href="/services" className="text-gray-600 hover:text-primary-600">
              ← Back to Services
            </Link>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  s <= step ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 text-gray-400'
                }`}>
                  {s}
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    s < step ? 'bg-primary-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between max-w-3xl mx-auto mt-2">
            <span className="text-xs text-gray-600">Service Details</span>
            <span className="text-xs text-gray-600">Schedule</span>
            <span className="text-xs text-gray-600">Contact Info</span>
            <span className="text-xs text-gray-600">Review & Pay</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Service Details */}
            {step === 1 && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-3xl font-bold mb-6">Cleaning Service Details</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      value={formData.zip}
                      onChange={(e) => setFormData({...formData, zip: e.target.value})}
                      placeholder="10027"
                      maxLength={5}
                      pattern="[0-9]{5}"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (lbs) - Minimum 15 lbs
                    </label>
                    <input
                      type="number"
                      value={formData.pounds}
                      onChange={(e) => setFormData({...formData, pounds: parseInt(e.target.value)})}
                      min="15"
                      max="100"
                      className="input-field"
                      required
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Estimate: Small load ~15 lbs, Medium ~25 lbs, Large ~35 lbs
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Add-ons (Optional)
                    </label>
                    <div className="space-y-3">
                      {addons.map((addon) => (
                        <label key={addon.id} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={formData.addons.includes(addon.id)}
                            onChange={() => handleAddonToggle(addon.id)}
                            className="mr-3"
                          />
                          <span className="flex-1">{addon.name}</span>
                          <span className="font-medium text-primary-600">+${addon.price}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button 
                    type="button" 
                    onClick={nextStep} 
                    disabled={loading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : 'Continue to Schedule →'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Schedule */}
            {step === 2 && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-3xl font-bold mb-6">Select Service Date & Time</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cleaning Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={async (e) => {
                        setFormData({...formData, date: e.target.value})
                        setSelectedSlot(null)
                        // Fetch slots when date changes
                        if (e.target.value) {
                          setLoading(true)
                          try {
                            const response = await fetch(
                              `/api/slots?service=LAUNDRY&zip=${formData.zip}&date=${e.target.value}`
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
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="input-field"
                      required
                    />
                  </div>

                  {formData.date && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Available Time Slots
                      </label>
                      {loading ? (
                        <p className="text-gray-500">Loading available slots...</p>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-red-600">No slots available for this date. Please select a different date.</p>
                      ) : (
                        <div className="space-y-2">
                          {availableSlots.map((slot) => (
                            <label
                              key={`${slot.partner_id}-${slot.slot_start}`}
                              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                                selectedSlot?.slot_start === slot.slot_start ? 'border-primary-600 bg-primary-50' : ''
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
                                    })} - {new Date(slot.slot_end).toLocaleTimeString('en-US', { 
                                      hour: 'numeric', 
                                      minute: '2-digit',
                                      hour12: true 
                                    })}
                                  </div>
                                  <div className="text-sm text-gray-600">{slot.partner_name}</div>
                                </div>
                              </div>
                              <span className="text-sm text-gray-500">
                                {slot.available_units} spots available
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-sm text-gray-500">
                        Pickup will be processed within 24-48 hours
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={prevStep} className="btn-secondary">
                    ← Back
                  </button>
                  <button 
                    type="button" 
                    onClick={nextStep} 
                    disabled={loading || !selectedSlot}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Loading...' : 'Continue to Contact Info →'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Contact Info */}
            {step === 3 && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-3xl font-bold mb-6">Contact Information</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={formData.addressLine1}
                      onChange={(e) => setFormData({...formData, addressLine1: e.target.value})}
                      placeholder="123 Main St"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apartment, Suite, etc. (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.addressLine2}
                      onChange={(e) => setFormData({...formData, addressLine2: e.target.value})}
                      placeholder="Apt 4B"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      placeholder="New York"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="(555) 123-4567"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Instructions (Optional)
                    </label>
                    <textarea
                      value={formData.specialInstructions}
                      onChange={(e) => setFormData({...formData, specialInstructions: e.target.value})}
                      placeholder="e.g., Focus on kitchen and bathroom, Use specific cleaning products, Pet-friendly products only, etc."
                      rows={3}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={prevStep} className="btn-secondary">
                    ← Back
                  </button>
                  <button type="button" onClick={nextStep} className="btn-primary">
                    Review Order →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Pay */}
            {step === 4 && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <h2 className="text-3xl font-bold mb-6">Review Your Order</h2>
                
                <div className="space-y-6">
                  {/* Order Summary */}
                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-3">Service Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Laundry Service ({formData.pounds} lbs)</span>
                        <span>${(formData.pounds * 1.75).toFixed(2)}</span>
                      </div>
                      {formData.addons.map(addonId => {
                        const addon = addons.find(a => a.id === addonId)
                        return addon ? (
                          <div key={addonId} className="flex justify-between">
                            <span>{addon.name}</span>
                            <span>+${addon.price}</span>
                          </div>
                        ) : null
                      })}
                    </div>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-3">Schedule</h3>
                    <p className="text-sm">
                      Service Date: {formData.date} at {selectedSlot ? (
                        <>
                          {new Date(selectedSlot.slot_start).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })} - {new Date(selectedSlot.slot_end).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </>
                      ) : 'No slot selected'}
                    </p>
                    {selectedSlot && (
                      <p className="text-sm text-gray-600">Partner: {selectedSlot.partner_name}</p>
                    )}
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-3">Contact</h3>
                    <p className="text-sm">
                      {formData.addressLine1}
                      {formData.addressLine2 && `, ${formData.addressLine2}`}
                    </p>
                    <p className="text-sm">{formData.city}, NY {formData.zip}</p>
                    <p className="text-sm">{formData.phone}</p>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal</span>
                      <span>${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Tax (8.875%)</span>
                      <span>${pricing.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t pt-2 mt-2">
                      <span>Total</span>
                      <span className="text-primary-600">${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={prevStep} className="btn-secondary">
                    ← Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Creating Order...' : 'Proceed to Payment →'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  )
}

export default function BookCleaningPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking form...</p>
        </div>
      </div>
    }>
      <BookingForm />
    </Suspense>
  )
}
