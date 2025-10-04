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

  const calculatePrice = () => {
    const basePrice = formData.pounds * 1.75
    const deliveryFee = 5.99
    const addonsCost = formData.addons.reduce((sum, addonId) => {
      const addon = addons.find(a => a.id === addonId)
      return sum + (addon?.price || 0)
    }, 0)
    
    const subtotal = basePrice + deliveryFee + addonsCost
    const tax = 0 // Laundry is tax-exempt in NYC
    const total = subtotal + tax

    setPricing({ subtotal, tax, total })
  }

  const nextStep = () => {
    if (step === 1) calculatePrice()
    setStep(prev => Math.min(prev + 1, 4))
  }

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Call API to create order
    console.log('Booking laundry service:', formData)
    alert('Booking submitted! (API integration pending)')
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
                  <button type="button" onClick={nextStep} className="btn-primary">
                    Continue to Schedule →
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
                  <button type="button" onClick={nextStep} className="btn-primary">
                    Continue to Contact Info →
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
                  <button type="submit" className="btn-primary">
                    Proceed to Payment →
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
