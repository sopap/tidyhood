'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/Header'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { ServiceChips } from '@/components/ServiceChips'
import { useAuth } from '@/lib/auth-context'
import { usePreferences } from '@/lib/use-preferences'

const structuredData = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Tidyhood",
  "description": "Professional laundry and home cleaning services in Harlem",
  "url": process.env.NEXT_PUBLIC_SITE_URL || "https://tidyhood.vercel.app",
  "telephone": "+1-XXX-XXX-XXXX",
  "email": "support@tidyhood.com",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "New York",
    "addressRegion": "NY",
    "addressCountry": "US",
    "postalCode": "10027"
  },
  "areaServed": [
    {
      "@type": "City",
      "name": "Harlem",
      "containedInPlace": {
        "@type": "City",
        "name": "New York"
      }
    }
  ]
}

interface Address {
  line1: string
  line2?: string
  city: string
  state: string
  zip: string
  formatted: string
}

export default function Home() {
  const router = useRouter()
  const { user } = useAuth()
  const { preferences, loading: prefsLoading } = usePreferences()
  
  const [selectedService, setSelectedService] = useState<'LAUNDRY' | 'CLEANING' | 'BOTH' | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState('')

  // Load user's saved addresses and preferences
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return

      try {
        // Fetch saved addresses
        const response = await fetch('/api/addresses')
        if (response.ok) {
          const data = await response.json()
          setSavedAddresses(data.addresses || [])
          
          // Auto-select last used address
          const lastAddress = data.addresses?.find((a: any) => 
            a.id === preferences.last_address_id
          ) || data.addresses?.[0]
          
          if (lastAddress) {
            setSelectedAddress({
              line1: lastAddress.line1,
              line2: lastAddress.line2,
              city: lastAddress.city,
              state: 'NY',
              zip: lastAddress.zip,
              formatted: `${lastAddress.line1}${lastAddress.line2 ? ', ' + lastAddress.line2 : ''}, ${lastAddress.city}, NY ${lastAddress.zip}`
            })
          }
        }
      } catch (err) {
        console.error('Failed to load user data:', err)
      }
    }

    if (user && !prefsLoading) {
      loadUserData()
      // Pre-select last service
      if (preferences.last_service) {
        setSelectedService(preferences.last_service)
      }
    }
  }, [user, preferences, prefsLoading])

  const handleServiceChange = (service: 'LAUNDRY' | 'CLEANING') => {
    if (selectedService === service) {
      // Deselect if clicking same service
      setSelectedService(null)
    } else {
      setSelectedService(service)
    }
  }

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address)
  }

  const handleGetStarted = () => {
    if (!selectedAddress) {
      alert('Please enter your address')
      return
    }

    if (!selectedService) {
      alert('Please select a service')
      return
    }

    // Store selection in sessionStorage for booking page
    sessionStorage.setItem('booking-data', JSON.stringify({
      service: selectedService,
      address: selectedAddress
    }))

    // Navigate to unified booking page
    router.push('/book')
  }

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Store waitlist email
    alert('Thanks! We\'ll notify you when we expand to your area.')
    setShowWaitlist(false)
    setWaitlistEmail('')
  }

  // Dynamic CTA text
  const getCtaText = () => {
    if (!selectedService) return 'Get Started'
    if (selectedService === 'LAUNDRY') return 'Schedule Pickup →'
    if (selectedService === 'CLEANING') return 'Schedule Cleaning →'
    if (selectedService === 'BOTH') return 'Schedule Services →'
    return 'Get Started'
  }

  const isCtaEnabled = selectedAddress && selectedService

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
        <Header />

        {/* Hero Section */}
        <main className="container mx-auto px-4 py-12 md:py-16">
          {!showWaitlist ? (
            <div className="max-w-2xl mx-auto">
              {/* Hero Text */}
              <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                  Harlem&apos;s Premier Laundry & Cleaning
                </h1>
                <p className="text-lg text-gray-600 mb-2">
                  Pickup as soon as today • Harlem-first • Insured partners
                </p>
                {user && (
                  <p className="text-sm text-primary-600 font-medium">
                    Welcome back! Your usual service is preselected
                  </p>
                )}
              </div>

              {/* Booking Form */}
              <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 space-y-6">
                {/* Address Input */}
                <AddressAutocomplete
                  onAddressSelect={handleAddressSelect}
                  savedAddresses={savedAddresses}
                  defaultValue={selectedAddress?.formatted}
                />

                {/* Service Selection */}
                <ServiceChips
                  selected={selectedService}
                  onChange={handleServiceChange}
                  allowMultiple={false}
                />

                {/* Live Microcopy */}
                {selectedService && (
                  <div className="text-sm text-gray-600 text-center bg-gray-50 rounded-lg p-3">
                    {selectedService === 'LAUNDRY' && (
                      <>🧺 Same-day pickup available. You&apos;ll get text updates.</>
                    )}
                    {selectedService === 'CLEANING' && (
                      <>✨ Professional cleaners. 100% satisfaction guarantee.</>
                    )}
                  </div>
                )}

                {/* Dynamic CTA Button */}
                <button
                  onClick={handleGetStarted}
                  disabled={!isCtaEnabled}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-all ${
                    isCtaEnabled
                      ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {getCtaText()}
                </button>

                {!selectedAddress && (
                  <p className="text-xs text-gray-500 text-center">
                    Enter your address and select a service to continue
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Waitlist Form */
            <div className="max-w-md mx-auto card">
              <h3 className="text-2xl font-bold mb-4">
                We&apos;re not in your area yet
              </h3>
              <p className="text-gray-600 mb-6">
                Join our waitlist and we&apos;ll notify you when we expand to your area.
              </p>
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input-field"
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary flex-1">
                    Join Waitlist
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWaitlist(false)}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* How It Works */}
          <div className="max-w-5xl mx-auto mt-20">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                  1
                </div>
                <h3 className="font-bold mb-2">Select & Schedule</h3>
                <p className="text-gray-600 text-sm">
                  Choose your service, pick a time slot, and get instant pricing
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                  2
                </div>
                <h3 className="font-bold mb-2">We Come to You</h3>
                <p className="text-gray-600 text-sm">
                  Our partners arrive at your scheduled time
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                  3
                </div>
                <h3 className="font-bold mb-2">Relax & Enjoy</h3>
                <p className="text-gray-600 text-sm">
                  Get your clean items delivered or come home to a spotless space
                </p>
              </div>
            </div>
          </div>

          {/* Services Overview */}
          <div className="max-w-5xl mx-auto mt-20 grid md:grid-cols-2 gap-8">
            <div className="card hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">🧺</div>
              <h3 className="text-2xl font-bold mb-2">Laundry Service</h3>
              <p className="text-gray-600 mb-4">
                Professional wash & fold starting at $1.75/lb. 48-hour turnaround.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ Free pickup & delivery</li>
                <li>✓ Eco-friendly detergents</li>
                <li>✓ QR-coded bags for tracking</li>
                <li>✓ Rush service available</li>
              </ul>
            </div>

            <div className="card hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-2xl font-bold mb-2">Home Cleaning</h3>
              <p className="text-gray-600 mb-4">
                Deep or standard cleaning from $89. Professional cleaners, flexible scheduling.
              </p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>✓ Background-checked professionals</li>
                <li>✓ Eco-friendly products</li>
                <li>✓ Photo documentation</li>
                <li>✓ 100% satisfaction guarantee</li>
              </ul>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-24 py-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-gray-400">
              © 2025 Tidyhood. Supporting Harlem businesses.
            </p>
            <div className="mt-4 space-x-4">
              <a href="/terms" className="text-gray-400 hover:text-white">
                Terms
              </a>
              <a href="/privacy" className="text-gray-400 hover:text-white">
                Privacy
              </a>
              <a href="mailto:support@tidyhood.com" className="text-gray-400 hover:text-white">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
