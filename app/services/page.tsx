'use client'

import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'

// This would normally be in a separate metadata export, but since this is a client component,
// we'll need to handle SEO differently or make this a server component with client components inside

const servicesStructuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "Service",
        "name": "Wash & Fold Laundry Service",
        "description": "Professional laundry service with pickup and delivery",
        "provider": {
          "@type": "LocalBusiness",
          "name": "Tidyhood"
        },
        "areaServed": {
          "@type": "City",
          "name": "Harlem, New York"
        },
        "offers": {
          "@type": "Offer",
          "price": "1.75",
          "priceCurrency": "USD",
          "priceSpecification": {
            "@type": "UnitPriceSpecification",
            "price": "1.75",
            "priceCurrency": "USD",
            "unitText": "per pound"
          }
        }
      }
    },
    {
      "@type": "ListItem",
      "position": 2,
      "item": {
        "@type": "Service",
        "name": "Home Cleaning Service",
        "description": "Professional home cleaning for apartments and houses",
        "provider": {
          "@type": "LocalBusiness",
          "name": "Tidyhood"
        },
        "areaServed": {
          "@type": "City",
          "name": "Harlem, New York"
        },
        "offers": {
          "@type": "AggregateOffer",
          "lowPrice": "89",
          "highPrice": "219",
          "priceCurrency": "USD"
        }
      }
    }
  ]
}

export default function ServicesPage() {
  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(servicesStructuredData) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
        <Header />

        {/* Main Content */}
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Choose Your Service
            </h1>
            <p className="text-xl text-gray-600">
              Select the service that fits your needs. Both include pickup and delivery in Harlem.
            </p>
          </div>

          {/* Service Cards */}
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Laundry Service Card */}
            <div className="card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-6xl mb-6 text-center">🧺</div>
              <h2 className="text-3xl font-bold mb-4 text-center">Harlem's Premium Wash & Fold Service</h2>
              <p className="text-gray-600 mb-6 text-center">
                Same-day pickup, 48-hour return. Professional care that fits your schedule.
              </p>

              <div className="bg-primary-50 rounded-lg p-6 mb-6">
                <div className="text-center mb-4">
                  <span className="text-4xl font-bold text-primary-600">$1.75</span>
                  <span className="text-gray-600">/lb</span>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  (15-lbs minimum)
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Contactless pickup & delivery (FREE)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Real-time order tracking via QR codes</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Eco-friendly, gentle on fabrics</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">24-hour rush service available</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">No sales tax (residential buildings)</span>
                </div>
              </div>

              <Link
                href="/book/laundry"
                className="btn-primary w-full text-center block text-lg py-4"
              >
                Schedule Pickup
              </Link>
            </div>

            {/* Cleaning Service Card */}
            <div className="card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-6xl mb-6 text-center">✨</div>
              <h2 className="text-3xl font-bold mb-4 text-center">Professional Home Cleaning by Harlem Experts</h2>
              <p className="text-gray-600 mb-6 text-center">
                Background-verified professionals delivering spotless results with 100% satisfaction guarantee.
              </p>

              <div className="bg-primary-50 rounded-lg p-6 mb-6">
                <div className="text-center mb-4">
                  <span className="text-4xl font-bold text-primary-600">Starting at $89</span>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Studio $89 • 1BR $119 • 2BR $149
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">100% satisfaction guarantee</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Background-verified professionals</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Before/after photos sent to you</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Eco-friendly cleaning products</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Flexible scheduling + secure key management</span>
                </div>
              </div>

              <Link
                href="/book/cleaning"
                className="btn-primary w-full text-center block text-lg py-4"
              >
                Get Quote
              </Link>
            </div>
          </div>

          {/* Additional Info */}
          <div className="max-w-3xl mx-auto mt-16 text-center">
            <h3 className="text-2xl font-bold mb-4">Not sure which service you need?</h3>
            <p className="text-gray-600 mb-6">
              You can book both services! Many customers use our laundry service weekly
              and schedule cleaning bi-weekly.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
                ← Back to Home
              </Link>
              <span className="text-gray-300">|</span>
              <a href="mailto:support@tidyhood.nyc" className="text-primary-600 hover:text-primary-700 font-medium">
                Contact Support
              </a>
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
              <a href="mailto:support@tidyhood.nyc" className="text-gray-400 hover:text-white">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
