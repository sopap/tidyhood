'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { useAuth } from '@/lib/auth-context'

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

export default function Home() {
  const { user } = useAuth()
  const [lastOrder, setLastOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user's last order for "Book Again" prompt
  useEffect(() => {
    const fetchLastOrder = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/orders?limit=1')
        if (response.ok) {
          const data = await response.json()
          if (data.orders && data.orders.length > 0) {
            setLastOrder(data.orders[0])
          }
        }
      } catch (err) {
        console.error('Failed to fetch last order:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLastOrder()
  }, [user])

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
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Harlem&apos;s Premier Laundry & Cleaning
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Professional service with same-day pickup available
            </p>
            <p className="text-sm text-gray-500">
              Serving ZIP codes: 10026, 10027, 10030
            </p>
          </div>

          {/* Returning User "Book Again" Prompt */}
          {user && lastOrder && !loading && (
            <div className="max-w-2xl mx-auto mb-12 bg-primary-50 border-2 border-primary-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">👋</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Welcome back!</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    Last order: {lastOrder.address_snapshot?.line1}, {lastOrder.address_snapshot?.city} {lastOrder.address_snapshot?.zip}
                  </p>
                  <div className="flex gap-3">
                    <Link
                      href="/book/laundry"
                      className="btn-primary text-sm py-2 px-4"
                    >
                      Book Laundry Again
                    </Link>
                    <Link
                      href="/book/cleaning"
                      className="btn-secondary text-sm py-2 px-4"
                    >
                      Book Cleaning
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Service CTAs */}
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-20">
            {/* Laundry Service */}
            <Link href="/book/laundry" className="group">
              <div className="card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent group-hover:border-primary-300">
                <div className="text-6xl mb-6 text-center">🧺</div>
                <h2 className="text-3xl font-bold mb-4 text-center">Laundry Service</h2>
                <p className="text-gray-600 mb-6 text-center">
                  Professional wash & fold with 48-hour turnaround
                </p>
                
                <div className="bg-primary-50 rounded-lg p-4 mb-6 text-center">
                  <div className="text-3xl font-bold text-primary-600">$1.75<span className="text-lg">/lb</span></div>
                  <div className="text-sm text-gray-600">15 lb minimum ($26.25)</div>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Free pickup & delivery</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Eco-friendly detergents</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>QR-coded bags for tracking</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Rush 24hr service available</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Tax-exempt service</span>
                  </li>
                </ul>

                <div className="text-center">
                  <span className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold group-hover:bg-primary-700 transition-colors">
                    Book Laundry →
                  </span>
                </div>
              </div>
            </Link>

            {/* Cleaning Service */}
            <Link href="/book/cleaning" className="group">
              <div className="card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent group-hover:border-primary-300">
                <div className="text-6xl mb-6 text-center">✨</div>
                <h2 className="text-3xl font-bold mb-4 text-center">Home Cleaning</h2>
                <p className="text-gray-600 mb-6 text-center">
                  Deep or standard cleaning by background-checked pros
                </p>
                
                <div className="bg-primary-50 rounded-lg p-4 mb-6 text-center">
                  <div className="text-3xl font-bold text-primary-600">$89<span className="text-lg">+</span></div>
                  <div className="text-sm text-gray-600">Studio from $89, 1BR $119, 2BR $149</div>
                </div>

                <ul className="space-y-3 mb-6">
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Background-checked professionals</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Eco-friendly cleaning products</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Photo documentation</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>Flexible scheduling</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span>100% satisfaction guarantee</span>
                  </li>
                </ul>

                <div className="text-center">
                  <span className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold group-hover:bg-primary-700 transition-colors">
                    Book Cleaning →
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* How It Works */}
          <div className="max-w-5xl mx-auto mt-24">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                  1
                </div>
                <h3 className="font-bold mb-2">Book Online</h3>
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
                <h3 className="font-bold mb-2">Delivered Fresh</h3>
                <p className="text-gray-600 text-sm">
                  Get your items delivered or come home to a spotless space
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
              <Link href="/terms" className="text-gray-400 hover:text-white">
                Terms
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white">
                Privacy
              </Link>
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
