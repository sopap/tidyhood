'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { PaymentModal } from '@/components/PaymentModal'

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

function LaundryBookingForm() {
  const router = useRouter()
  const { user } = useAuth()
  
  // Address state
  const [address, setAddress] = useState<Address | null>(null)
  const [addressLine2, setAddressLine2] = useState('')
  const [phone, setPhone] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [isAddressCollapsed, setIsAddressCollapsed] = useState(false)
  
  // Service details
  const [pounds, setPounds] = useState(15)
  const [addons, setAddons] = useState<string[]>([])
  
  // Schedule
  const [date, setDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  
  // Pricing
  const [pricing, setPricing] = useState({ subtotal: 0, tax: 0, total: 0 })
  const [loading, setLoading] = useState(false)
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)

  const addonsList = [
    { id: 'LND_RUSH_24HR', name: 'Rush Service (24hr)', price: 10 },
    { id: 'LND_DELICATE', name: 'Delicate Care', price: 10 },
    { id: 'LND_EXTRA_SOFTENER', name: 'Extra Softener', price: 3 },
    { id: 'LND_FOLDING', name: 'Professional Folding', price: 5 },
  ]

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
            
            // Pre-fill service details if it was a laundry order
            if (lastOrder.service_type === 'LAUNDRY' && lastOrder.order_details) {
              setPounds(lastOrder.order_details.lbs || 15)
              setAddons(lastOrder.order_details.addons || [])
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
      if (!address || !pounds) return

      try {
        const response = await fetch('/api/price/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: 'LAUNDRY',
            zip: address.zip,
            lbs: pounds,
            addons
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
  }, [address, pounds, addons])

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

  const handleAddonToggle = (addonId: string) => {
    setAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      router.push('/login?returnTo=/book/laundry')
      return
    }

    if (!address || !selectedSlot) {
      alert('Please complete all required fields')
      return
    }

    try {
      setLoading(true)
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
            lbs: pounds,
            addons
          }
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
      alert(err.message || 'Failed to create order. Please try again.')
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
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-primary-900">
              Tidyhood
            </Link>
            <Link href="/" className="text-gray-600 hover:text-primary-600">
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Laundry Service</h1>
            <p className="text-gray-600">Fill out the form below to schedule your pickup</p>
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
                    onAddressSelect={setAddress}
                    defaultValue={address?.formatted}
                  />
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Apartment, Suite, etc. (optional)"
                    className="input-field"
                  />
                </div>
              )}
            </div>

            {/* Service Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🧺 Service Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (pounds) - Minimum 15 lbs
                  </label>
                  <div className="flex gap-2">
                    {[15, 25, 35].map(weight => (
                      <button
                        key={weight}
                        type="button"
                        onClick={() => setPounds(weight)}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                          pounds === weight
                            ? 'border-primary-600 bg-primary-50 font-semibold'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {weight} lbs
                        <div className="text-xs text-gray-500">
                          {weight === 15 ? 'Small' : weight === 25 ? 'Medium' : 'Large'}
                        </div>
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={pounds}
                    onChange={(e) => setPounds(parseInt(e.target.value) || 15)}
                    min="15"
                    max="100"
                    className="input-field mt-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add-ons (Optional)
                  </label>
                  <div className="space-y-2">
                    {addonsList.map(addon => (
                      <label
                        key={addon.id}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={addons.includes(addon.id)}
                            onChange={() => handleAddonToggle(addon.id)}
                            className="mr-3"
                          />
                          <span>{addon.name}</span>
                        </div>
                        <span className="font-medium text-primary-600">+${addon.price}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Live Pricing */}
                {address && pricing.total > 0 && (
                  <div className="bg-primary-50 rounded-lg p-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Estimated Total:</span>
                      <span className="text-2xl font-bold text-primary-600">
                        ${pricing.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Tax-exempt service • Free pickup & delivery
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">📅 Schedule Pickup</h2>
              
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

            {/* Contact & Notes */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">✉️ Contact & Special Instructions</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
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
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g., Doorman pickup, leave with concierge, specific detergent preferences..."
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
                disabled={loading || !address || !selectedSlot}
                className="w-full btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : `Confirm & Pay $${pricing.total.toFixed(2)}`}
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                You'll be charged after pickup. Secure payment by Stripe.
              </p>
            </div>
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
