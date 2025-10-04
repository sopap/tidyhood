'use client'

import { useState } from 'react'
import { Header } from '@/components/Header'

const ALLOWED_ZIPS = ['10026', '10027', '10030']

// Structured data for SEO
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
  ],
  "priceRange": "$$$",
  "serviceArea": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": 40.8116,
      "longitude": -73.9465
    },
    "geoRadius": "3000"
  },
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "Laundry and Cleaning Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Wash & Fold Laundry Service",
          "description": "Professional laundry service with pickup and delivery"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": "Home Cleaning Service",
          "description": "Professional home cleaning for apartments and houses"
        }
      }
    ]
  }
}

export default function Home() {
  const [zip, setZip] = useState('')
  const [showWaitlist, setShowWaitlist] = useState(false)
  const [email, setEmail] = useState('')

  const handleZipSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (ALLOWED_ZIPS.includes(zip)) {
      // Redirect to service selection
      window.location.href = '/services'
    } else {
      setShowWaitlist(true)
    }
  }

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Store waitlist email
    alert('Thanks! We\'ll notify you when we expand to your area.')
    setShowWaitlist(false)
    setZip('')
    setEmail('')
  }

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
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Harlem&apos;s Premier Laundry & Cleaning Service
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Professional wash & fold laundry and home cleaning services delivered
            to your door. Supporting local Harlem businesses.
          </p>

          {/* ZIP Code Gate */}
          {!showWaitlist ? (
            <div className="max-w-md mx-auto">
              <form onSubmit={handleZipSubmit} className="space-y-4">
                <div>
                  <label htmlFor="zip" className="block text-left text-sm font-medium text-gray-700 mb-2">
                    Enter your ZIP code to get started
                  </label>
                  <input
                    type="text"
                    id="zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    placeholder="10027"
                    maxLength={5}
                    pattern="[0-9]{5}"
                    className="input-field text-center text-2xl"
                    required
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Currently serving: 10026, 10027, 10030
                  </p>
                </div>
                <button type="submit" className="btn-primary w-full text-lg py-3">
                  Check Availability
                </button>
              </form>
            </div>
          ) : (
            <div className="max-w-md mx-auto card">
              <h3 className="text-2xl font-bold mb-4">
                We&apos;re not in your area yet
              </h3>
              <p className="text-gray-600 mb-6">
                Join our waitlist and we&apos;ll notify you when we expand to ZIP code {zip}.
              </p>
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    onClick={() => {
                      setShowWaitlist(false)
                      setZip('')
                    }}
                    className="btn-secondary"
                  >
                    Back
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Services Grid */}
        <div className="max-w-5xl mx-auto mt-24 grid md:grid-cols-2 gap-8">
          <div className="card hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">🧺</div>
            <h3 className="text-2xl font-bold mb-2">Laundry Service</h3>
            <p className="text-gray-600 mb-4">
              Professional wash & fold starting at $1.75/lb. 2-day turnaround.
              Rush service available.
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✓ Pick up & delivery included</li>
              <li>✓ Eco-friendly detergents</li>
              <li>✓ QR-coded bags for tracking</li>
              <li>✓ Same-day rush available</li>
            </ul>
          </div>

          <div className="card hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-2xl font-bold mb-2">Home Cleaning</h3>
            <p className="text-gray-600 mb-4">
              Deep or standard cleaning from $89. Professional cleaners,
              flexible scheduling.
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>✓ Background-checked professionals</li>
              <li>✓ Eco-friendly products</li>
              <li>✓ Photo documentation</li>
              <li>✓ 100% satisfaction guarantee</li>
            </ul>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-5xl mx-auto mt-24">
          <h3 className="text-3xl font-bold text-center mb-12">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                1
              </div>
              <h4 className="font-bold mb-2">Book Online</h4>
              <p className="text-gray-600 text-sm">
                Choose your service, pick a time slot, and get instant pricing
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                2
              </div>
              <h4 className="font-bold mb-2">We Pick Up</h4>
              <p className="text-gray-600 text-sm">
                Our partners arrive at your scheduled time
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                3
              </div>
              <h4 className="font-bold mb-2">Delivered Fresh</h4>
              <p className="text-gray-600 text-sm">
                Get your clean items delivered back to your door
              </p>
            </div>
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
