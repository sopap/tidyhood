'use client'

import type { Metadata } from 'next'
import Link from 'next/link'

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
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-3xl font-bold text-primary-900">
              Tidyhood
            </Link>
            <nav className="space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-primary-600">
                Login
              </Link>
              <Link href="/signup" className="btn-primary">
                Sign Up
              </Link>
            </nav>
          </div>
        </header>

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
              <h2 className="text-3xl font-bold mb-4 text-center">Laundry Service</h2>
              <p className="text-gray-600 mb-6 text-center">
                Professional wash & fold with same-day or next-day service available
              </p>

              <div className="bg-primary-50 rounded-lg p-6 mb-6">
                <div className="text-center mb-4">
                  <span className="text-4xl font-bold text-primary-600">$1.75</span>
                  <span className="text-gray-600">/lb</span>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  15 lb minimum ($26.25)
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Free pickup & delivery ($5.99 value)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Eco-friendly detergents</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">QR-coded bags for tracking</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">48-hour standard turnaround</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">24-hour rush available (+$10)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Tax-exempt service</span>
                </div>
              </div>

              <Link
                href="/book/laundry"
                className="btn-primary w-full text-center block text-lg py-4"
              >
                Book Laundry Service
              </Link>
            </div>

            {/* Cleaning Service Card */}
            <div className="card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-6xl mb-6 text-center">✨</div>
              <h2 className="text-3xl font-bold mb-4 text-center">Home Cleaning</h2>
              <p className="text-gray-600 mb-6 text-center">
                Professional deep or standard cleaning by background-checked cleaners
              </p>

              <div className="bg-primary-50 rounded-lg p-6 mb-6">
                <div className="text-center mb-4">
                  <span className="text-4xl font-bold text-primary-600">$89</span>
                  <span className="text-gray-600">+</span>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Studio from $89, 1BR $119, 2BR $149
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Background-checked professionals</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Eco-friendly cleaning products</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Photo documentation</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Flexible scheduling</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Deep clean option (1.5x price)</span>
                </div>
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">100% satisfaction guarantee</span>
                </div>
              </div>

              <Link
                href="/book/cleaning"
                className="btn-primary w-full text-center block text-lg py-4"
              >
                Book Cleaning Service
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
              <a href="mailto:support@tidyhood.com" className="text-primary-600 hover:text-primary-700 font-medium">
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
