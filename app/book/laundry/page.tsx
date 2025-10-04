'use client'

import { useState } from 'react'
import Link from 'next/link'

// Multi-step booking form for laundry service
export default function BookLaundryPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    zip: '',
    pounds: 15,
    addons: [] as string[],
    date: '',
    timeSlot: '',
    address: '',
    phone: '',
    specialInstructions: ''
  })

  const [pricing, setPricing] = useState({
    subtotal: 0,
    tax: 0,
    total: 0
  })
  const [loading, setLoading] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])

  const addons = [
    { id: 'LND_RUSH_24HR', name: 'Rush Service (24hr)', price: 10 },
    { id: 'LND_DELICATE', name: 'Delicate Care', price: 5 },
    { id: 'LND_EXTRA_SOFTENER', name: 'Extra Softener', price: 3 },
  ]

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
    if (step === 1) {
      await calculatePrice()
    } else if (step === 2 && formData.date) {
      await fetchAvailableSlots()
    }
    setStep(prev => Math.min(prev + 1, 4))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'LAUNDRY',
          zip: formData.zip,
          lbs: formData.pounds,
          addons: formData.addons,
          pickup_date: formData.date,
          pickup_slot: formData.timeSlot,
          address: formData.address,
          phone: formData.phone,
          special_instructions: formData.specialInstructions,
          idempotency_key: `laundry-${Date.now()}-${Math.random()}`
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create order')
      }

      const order = await response.json()
      alert(`Order created successfully! Order ID: ${order.id}`)
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
                <h2 className="text-3xl font-bold mb-6">Laundry Service Details</h2>
                
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
                <h2 className="text-3xl font-bold mb-6">Select Pickup Time</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Date
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Slot
                    </label>
                    <select
                      value={formData.timeSlot}
                      onChange={(e) => setFormData({...formData, timeSlot: e.target.value})}
                      className="input-field"
                      required
                    >
                      <option value="">Select a time slot</option>
                      <option value="09:00-11:00">9:00 AM - 11:00 AM</option>
                      <option value="11:00-13:00">11:00 AM - 1:00 PM</option>
                      <option value="13:00-15:00">1:00 PM - 3:00 PM</option>
                      <option value="15:00-17:00">3:00 PM - 5:00 PM</option>
                      <option value="17:00-19:00">5:00 PM - 7:00 PM</option>
                    </select>
                    <p className="mt-2 text-sm text-gray-500">
                      Delivery will be scheduled 48 hours after pickup (or 24 hours for rush service)
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={prevStep} className="btn-secondary">
                    ← Back
                  </button>
                  <button 
                    type="button" 
                    onClick={nextStep} 
                    disabled={loading}
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
                      Pickup Address
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      placeholder="123 Main St, Apt 4B, Harlem, NY 10027"
                      rows={3}
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
                      placeholder="e.g., Ring doorbell twice, Leave with doorman, etc."
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
                        <span>Laundry ({formData.pounds} lbs × $1.75/lb)</span>
                        <span>${(formData.pounds * 1.75).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Fee</span>
                        <span>$5.99</span>
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
                    <p className="text-sm">Pickup: {formData.date} at {formData.timeSlot}</p>
                  </div>

                  <div className="border-b pb-4">
                    <h3 className="font-bold text-lg mb-3">Contact</h3>
                    <p className="text-sm">{formData.address}</p>
                    <p className="text-sm">{formData.phone}</p>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span>Subtotal</span>
                      <span>${pricing.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Tax</span>
                      <span>${pricing.tax.toFixed(2)} <span className="text-xs text-gray-500">(tax-exempt)</span></span>
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
