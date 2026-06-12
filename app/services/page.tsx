import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { getLaundryDisplayPricing, getCleaningDisplayPricing } from '@/lib/display-pricing'

export const metadata: Metadata = {
  title: 'Our Services — Laundry Pickup & Home Cleaning',
  description:
    'Wash & fold laundry with free pickup & delivery, plus professional home cleaning across all of Manhattan. Transparent pricing, easy online booking.',
  alternates: {
    canonical: 'https://tidyhood.nyc/services',
  },
  openGraph: {
    title: 'Our Services — Laundry Pickup & Home Cleaning | Tidyhood',
    description:
      'Wash & fold laundry with free pickup & delivery, plus professional home cleaning across all of Manhattan.',
    url: 'https://tidyhood.nyc/services',
    siteName: 'Tidyhood',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/og-card.png', width: 1200, height: 630, alt: 'Tidyhood - Laundry & Cleaning in Manhattan' }],
  },
}

export default async function ServicesPage() {
  const [laundry, cleaning] = await Promise.all([
    getLaundryDisplayPricing(),
    getCleaningDisplayPricing(),
  ])

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
          "provider": { "@id": "https://tidyhood.nyc/#org" },
          "areaServed": { "@type": "City", "name": "Manhattan, New York" },
          "offers": {
            "@type": "Offer",
            "price": laundry.perLbPrice.toFixed(2),
            "priceCurrency": "USD",
            "priceSpecification": {
              "@type": "UnitPriceSpecification",
              "price": laundry.perLbPrice.toFixed(2),
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
          "provider": { "@id": "https://tidyhood.nyc/#org" },
          "areaServed": { "@type": "City", "name": "Manhattan, New York" },
          "offers": {
            "@type": "AggregateOffer",
            "lowPrice": cleaning.studioPrice.toString(),
            "highPrice": (cleaning.twoBrPrice * 1.5).toFixed(0),
            "priceCurrency": "USD"
          }
        }
      }
    ]
  }

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
              Select the service that fits your needs. Both include pickup and delivery across all of Manhattan.
            </p>
          </div>

          {/* Service Cards */}
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Laundry Service Card */}
            <div className="card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-6xl mb-6 text-center">🧺</div>
              <h2 className="text-3xl font-bold mb-4 text-center">Premium Wash &amp; Fold Service</h2>
              <p className="text-gray-600 mb-6 text-center">
                Same-day pickup, 48-hour return. Professional care that fits your schedule.
              </p>

              <div className="bg-primary-50 rounded-lg p-6 mb-6">
                <div className="text-center mb-4">
                  <span className="text-4xl font-bold text-primary-600">{laundry.perLbPriceFormatted}</span>
                  <span className="text-gray-600">/lb</span>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  ({laundry.minWeightLbs}-lbs minimum)
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-gray-700">Contactless pickup &amp; delivery (FREE)</span>
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
              <h2 className="text-3xl font-bold mb-4 text-center">Professional Home Cleaning</h2>
              <p className="text-gray-600 mb-6 text-center">
                Background-verified professionals delivering spotless results with 100% satisfaction guarantee.
              </p>

              <div className="bg-primary-50 rounded-lg p-6 mb-6">
                <div className="text-center mb-4">
                  <span className="text-4xl font-bold text-primary-600">Starting at {cleaning.studioPriceFormatted}</span>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Studio {cleaning.studioPriceFormatted} • 1BR {cleaning.oneBrPriceFormatted} • 2BR {cleaning.twoBrPriceFormatted}
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
      </div>
    </>
  )
}
