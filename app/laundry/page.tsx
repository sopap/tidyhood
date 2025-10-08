import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import Tooltip from '@/components/ui/Tooltip'
import DryPriceTooltip from '@/components/dryclean/DryPriceTooltip'

export const metadata: Metadata = {
  title: 'Wash & Fold Laundry Delivery in Harlem | $1.75/lb | Tidyhood',
  description: 'Professional wash & fold with free pickup & delivery in Harlem. Same-day options and QR-tracked bags. Book your laundry pickup now.',
  alternates: {
    canonical: 'https://tidyhood.nyc/laundry',
  },
  openGraph: {
    title: 'Wash & Fold Laundry Delivery in Harlem | $1.75/lb | Tidyhood',
    description: 'Professional wash & fold with free pickup & delivery in Harlem. Same-day options and QR-tracked bags.',
    url: 'https://tidyhood.nyc/laundry',
    siteName: 'Tidyhood',
    locale: 'en_US',
    type: 'website',
  },
}

const laundryStructuredData = {
  "@context": "https://schema.org",
  "@type": "Service",
  "serviceType": "Laundry Service",
  "provider": {
    "@type": "LocalBusiness",
    "name": "Tidyhood",
    "image": "https://tidyhood.nyc/static/og-laundry.jpg",
    "@id": "https://tidyhood.nyc/#org",
  },
  "areaServed": [
    {
      "@type": "City",
      "name": "Harlem",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Harlem",
        "addressRegion": "NY",
        "postalCode": "10026"
      }
    },
    {
      "@type": "City",
      "name": "Harlem",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Harlem",
        "addressRegion": "NY",
        "postalCode": "10027"
      }
    },
    {
      "@type": "City",
      "name": "Harlem",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Harlem",
        "addressRegion": "NY",
        "postalCode": "10030"
      }
    }
  ],
  "offers": {
    "@type": "Offer",
    "price": "1.75",
    "priceCurrency": "USD",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "1.75",
      "priceCurrency": "USD",
      "unitText": "per pound",
      "referenceQuantity": {
        "@type": "QuantitativeValue",
        "value": "1",
        "unitCode": "LBR"
      }
    }
  }
}

export default function LaundryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(laundryStructuredData) }}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
        <Header />

        <main className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Wash & Fold Laundry Delivery in Harlem
            </h1>
            <p className="text-xl text-text-secondary mb-6">
              Professional laundry service with free pickup & delivery. Same-day options available.
            </p>
            <Link href="/book/laundry" className="btn-primary btn-lg inline-block">
              Book Laundry Pickup →
            </Link>
          </div>

          {/* Pricing Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Pricing & Packages</h2>
            <div className="card bg-primary-50 border-2 border-primary-200 mb-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary-600 mb-2">
                  $1.75<span className="text-2xl">/lb</span>
                </div>
                <p className="text-text-secondary">15 lb minimum ($26.25)</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-compact">
                <h3 className="font-bold text-lg mb-3">Standard Service (48hr)</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>$1.75/lb base rate</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Free pickup & delivery ($5.99 value)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Eco-friendly detergents included</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Tax-exempt for residential buildings</span>
                  </li>
                </ul>
              </div>
              
              <div className="card-compact border-2 border-primary-300">
                <h3 className="font-bold text-lg mb-3">Rush Service (24hr)</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>$1.75/lb + $10 rush fee</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Same benefits as standard</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>24-hour turnaround guaranteed</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Priority scheduling</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How It Works - Enhanced Steps Design */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8 text-center">How Your Laundry Journey Works</h2>
            
            {/* Desktop Timeline */}
            <div className="hidden md:block">
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-8 left-0 w-full h-0.5 bg-gray-200">
                  <div className="h-full w-full bg-primary-300"></div>
                </div>
                
                <div className="grid grid-cols-5 gap-4 relative z-10">
                  {/* Step 1: Pickup Scheduled */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white shadow-lg">
                      📅
                    </div>
                    <div className="bg-white rounded-lg border-2 border-primary-200 p-3 shadow-sm">
                      <h3 className="font-bold text-sm mb-1 text-primary-700">Pickup Scheduled</h3>
                      <p className="text-xs text-gray-600">
                        Choose your time slot online
                      </p>
                    </div>
                  </div>
                  
                  {/* Step 2: Picked Up */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white shadow-lg">
                      🧺
                    </div>
                    <div className="bg-white rounded-lg border-2 border-blue-200 p-3 shadow-sm">
                      <h3 className="font-bold text-sm mb-1 text-blue-700">Picked Up</h3>
                      <p className="text-xs text-gray-600">
                        We collect your laundry with QR-coded bags
                      </p>
                    </div>
                  </div>
                  
                  {/* Step 3: Quote Sent */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white shadow-lg">
                      💬
                    </div>
                    <div className="bg-white rounded-lg border-2 border-amber-200 p-3 shadow-sm">
                      <h3 className="font-bold text-sm mb-1 text-amber-700">Quote Sent</h3>
                      <p className="text-xs text-gray-600">
                        Receive exact pricing after weighing
                      </p>
                    </div>
                  </div>
                  
                  {/* Step 4: Processing */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white shadow-lg">
                      🧽
                    </div>
                    <div className="bg-white rounded-lg border-2 border-purple-200 p-3 shadow-sm">
                      <h3 className="font-bold text-sm mb-1 text-purple-700">Processing</h3>
                      <p className="text-xs text-gray-600">
                        Professional wash, dry & fold
                      </p>
                    </div>
                  </div>
                  
                  {/* Step 5: Completed */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 text-white shadow-lg">
                      ✅
                    </div>
                    <div className="bg-white rounded-lg border-2 border-green-200 p-3 shadow-sm">
                      <h3 className="font-bold text-sm mb-1 text-green-700">Completed</h3>
                      <p className="text-xs text-gray-600">
                        Fresh delivery to your door
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mobile Steps */}
            <div className="md:hidden space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  📅
                </div>
                <div>
                  <h3 className="font-bold text-primary-700 mb-1">Pickup Scheduled</h3>
                  <p className="text-sm text-gray-600">Choose your time slot online. We offer flexible pickup windows 8 AM - 8 PM, 7 days a week.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  🧺
                </div>
                <div>
                  <h3 className="font-bold text-blue-700 mb-1">Picked Up</h3>
                  <p className="text-sm text-gray-600">Our Harlem partner arrives with QR-coded bags and collects your laundry safely.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  💬
                </div>
                <div>
                  <h3 className="font-bold text-amber-700 mb-1">Quote Sent</h3>
                  <p className="text-sm text-gray-600">After weighing, you'll receive the exact price (usually $26-45 for most loads).</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  🧽
                </div>
                <div>
                  <h3 className="font-bold text-purple-700 mb-1">Processing</h3>
                  <p className="text-sm text-gray-600">Professional wash, dry, and fold with eco-friendly detergents and careful attention.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                  ✅
                </div>
                <div>
                  <h3 className="font-bold text-green-700 mb-1">Completed</h3>
                  <p className="text-sm text-gray-600">Fresh, clean laundry delivered back to your door within 48 hours (or 24 with rush).</p>
                </div>
              </div>
            </div>
          </section>

          {/* Service Areas */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Laundry Pickup Service Areas in Harlem</h2>
            <div className="card bg-gray-50">
              <p className="text-text-secondary mb-4">
                We proudly serve all of Harlem, including Central Harlem, South Harlem, and Morningside Heights. Our pickup service covers:
              </p>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center">
                  <span className="text-primary-600 mr-2">📍</span>
                  <span className="font-semibold">ZIP 10026</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary-600 mr-2">📍</span>
                  <span className="font-semibold">ZIP 10027</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary-600 mr-2">📍</span>
                  <span className="font-semibold">ZIP 10030</span>
                </div>
              </div>
              <p className="text-sm text-text-tertiary">
                Near the border? Contact us and we'll see if we can accommodate your location.
              </p>
            </div>
          </section>

          {/* Dry Cleaning Services Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Need Dry Cleaning Too?</h2>
            <div className="card bg-blue-50 border-2 border-blue-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg mb-2 text-blue-800">Professional Dry Cleaning Available</h3>
                  <p className="text-sm text-blue-700 mb-4">
                    We also offer professional dry cleaning services for your delicate garments, suits, dresses, and specialty items.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-800">View sample pricing:</span>
                    <Tooltip content={<DryPriceTooltip />}>
                      <button className="text-blue-600 hover:text-blue-800 underline text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1">
                        Dry Clean Price Guide ℹ️
                      </button>
                    </Tooltip>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <Link href="/book/laundry" className="btn-secondary btn-sm">
                    Add to Pickup
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Why Choose Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Why Choose Tidyhood Laundry Service</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <span className="text-2xl mr-3">🌱</span>
                <div>
                  <h3 className="font-bold mb-1">Eco-Friendly Care</h3>
                  <p className="text-sm text-text-secondary">
                    We use plant-based detergents that are gentle on your clothes and the environment.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="text-2xl mr-3">👥</span>
                <div>
                  <h3 className="font-bold mb-1">Local Harlem Pros</h3>
                  <p className="text-sm text-text-secondary">
                    Your laundry is handled by trusted local professionals, not gig workers.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="text-2xl mr-3">📱</span>
                <div>
                  <h3 className="font-bold mb-1">QR Code Tracking</h3>
                  <p className="text-sm text-text-secondary">
                    Every bag gets a unique QR code so you can track your laundry throughout the process.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="text-2xl mr-3">💰</span>
                <div>
                  <h3 className="font-bold mb-1">Transparent Pricing</h3>
                  <p className="text-sm text-text-secondary">
                    No hidden fees. You pay exactly what you see at checkout. Free delivery included.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">FAQ — Laundry Service in Harlem</h2>
            <div className="space-y-4">
              <details className="card-compact cursor-pointer">
                <summary className="font-semibold">Do you offer same-day laundry pickup in Harlem?</summary>
                <p className="mt-3 text-sm text-text-secondary">
                  Yes! Book before 11 AM and we can usually pick up the same day in most Harlem ZIP codes. Next-day pickup is guaranteed for all bookings.
                </p>
              </details>
              
              <details className="card-compact cursor-pointer">
                <summary className="font-semibold">What's included in the $1.75/lb price?</summary>
                <p className="mt-3 text-sm text-text-secondary">
                  Everything! Wash, dry, fold, eco-friendly detergent, free pickup & delivery, and QR tracking. The only extra cost is if you need rush 24-hour service ($10 fee).
                </p>
              </details>
              
              <details className="card-compact cursor-pointer">
                <summary className="font-semibold">How do I track my laundry?</summary>
                <p className="mt-3 text-sm text-text-secondary">
                  Each bag gets a unique QR code at pickup. You'll receive SMS updates when your laundry is picked up, being processed, and out for delivery.
                </p>
              </details>
              
              <details className="card-compact cursor-pointer">
                <summary className="font-semibold">What if I have special care instructions?</summary>
                <p className="mt-3 text-sm text-text-secondary">
                  You can add special instructions during booking for delicate items, specific detergent preferences, or folding requests. We'll follow them carefully.
                </p>
              </details>
            </div>
          </section>

          {/* CTA Section */}
          <div className="text-center py-12 bg-primary-50 rounded-xl">
            <h2 className="text-2xl font-bold mb-4">Ready for Fresh, Clean Laundry?</h2>
            <p className="text-text-secondary mb-6">
              Join hundreds of Harlem residents who trust Tidyhood with their laundry every week.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/book/laundry" className="btn-primary btn-lg">
                Book Laundry Pickup
              </Link>
              <Link href="/cleaning" className="btn-secondary btn-lg">
                Explore House Cleaning →
              </Link>
            </div>
          </div>

          {/* Internal Links */}
          <div className="mt-12 text-center text-sm text-text-tertiary">
            <Link href="/" className="underline hover:text-primary-600">Home</Link>
            {' · '}
            <Link href="/cleaning" className="underline hover:text-primary-600">House Cleaning Service in Harlem</Link>
            {' · '}
            <Link href="/services" className="underline hover:text-primary-600">All Services</Link>
          </div>
        </main>
      </div>
    </>
  )
}
