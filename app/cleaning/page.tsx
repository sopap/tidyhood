import type { Metadata } from 'next'
import Link from 'next/link'
import { Header } from '@/components/Header'
import { getCleaningDisplayPricing } from '@/lib/display-pricing'

// Get allowed ZIP codes from environment variable
const allowedZips = process.env.NEXT_PUBLIC_ALLOWED_ZIPS?.split(',').map(z => z.trim()) || ['10026', '10027', '10030']

export async function generateMetadata(): Promise<Metadata> {
  const pricing = await getCleaningDisplayPricing()
  
  return {
    title: `House Cleaning Service in Harlem | Deep Cleaning from ${pricing.studioPriceFormatted} | Tidyhood`,
    description: 'Trusted Harlem cleaners for apartments and brownstones. Eco-friendly products, flexible scheduling, satisfaction guaranteed.',
    alternates: {
      canonical: 'https://tidyhood.nyc/cleaning',
    },
    openGraph: {
      title: `House Cleaning Service in Harlem | Deep Cleaning from ${pricing.studioPriceFormatted} | Tidyhood`,
      description: 'Trusted Harlem cleaners for apartments and brownstones. Eco-friendly products, flexible scheduling, satisfaction guaranteed.',
      url: 'https://tidyhood.nyc/cleaning',
      siteName: 'Tidyhood',
      locale: 'en_US',
      type: 'website',
    },
  }
}

export default async function CleaningPage() {
  const pricing = await getCleaningDisplayPricing()
  
  const cleaningStructuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "House Cleaning",
    "provider": {
      "@type": "LocalBusiness",
      "name": "Tidyhood",
      "image": "https://tidyhood.nyc/static/og-cleaning.jpg",
      "@id": "https://tidyhood.nyc/#org",
    },
    "areaServed": allowedZips.map(zip => ({
      "@type": "City",
      "name": "Harlem",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Harlem",
        "addressRegion": "NY",
        "postalCode": zip
      }
    })),
    "offers": {
      "@type": "AggregateOffer",
      "lowPrice": pricing.studioPrice.toString(),
      "highPrice": (pricing.twoBrPrice * 1.75).toFixed(0),
      "priceCurrency": "USD"
    }
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(cleaningStructuredData) }}
      />
      
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
        <Header />

        <main className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              House Cleaning Service in Harlem
            </h1>
            <p className="text-xl text-text-secondary mb-6">
              Background-checked professionals for apartments, condos, and brownstones. Standard or deep cleaning.
            </p>
            <Link href="/book/cleaning" className="btn-primary btn-lg inline-block">
              Book Cleaning Service →
            </Link>
          </div>

          {/* Pricing Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Pricing & Packages</h2>
            
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="card-compact text-center">
                <div className="font-bold text-lg mb-2">Studio</div>
                <div className="text-4xl font-bold text-primary-600 mb-2">{pricing.studioPriceFormatted}</div>
                <p className="text-sm text-text-secondary">Perfect for smaller spaces</p>
              </div>
              
              <div className="card-compact text-center border-2 border-primary-300">
                <div className="font-bold text-lg mb-2">1 Bedroom</div>
                <div className="text-4xl font-bold text-primary-600 mb-2">{pricing.oneBrPriceFormatted}</div>
                <p className="text-sm text-text-secondary">Most popular</p>
              </div>
              
              <div className="card-compact text-center">
                <div className="font-bold text-lg mb-2">2 Bedroom</div>
                <div className="text-4xl font-bold text-primary-600 mb-2">{pricing.twoBrPriceFormatted}</div>
                <p className="text-sm text-text-secondary">Great value</p>
              </div>
            </div>

            <div className="card bg-gray-50">
              <h3 className="font-bold text-lg mb-3">Additional Pricing</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span>3 Bedroom</span>
                  <span className="font-semibold">${Math.round(pricing.twoBrPrice * 1.2)}</span>
                </li>
                <li className="flex justify-between">
                  <span>4 Bedroom</span>
                  <span className="font-semibold">${Math.round(pricing.twoBrPrice * 1.47)}</span>
                </li>
                <li className="flex justify-between">
                  <span>Deep Clean (any size)</span>
                  <span className="font-semibold">1.5× standard price</span>
                </li>
                <li className="flex justify-between">
                  <span>Move-in/Move-out</span>
                  <span className="font-semibold">Contact for quote</span>
                </li>
              </ul>
            </div>
          </section>

          {/* What's Included */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">What's Included in Every Cleaning</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="card-compact">
                <h3 className="font-bold text-lg mb-3">All Rooms</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Dusting all surfaces and shelves</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Vacuuming carpets and rugs</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Mopping hard floors</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Wiping baseboards and door frames</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Taking out trash</span>
                  </li>
                </ul>
              </div>
              
              <div className="card-compact">
                <h3 className="font-bold text-lg mb-3">Kitchen & Bathroom</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Cleaning and sanitizing counters</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Scrubbing sinks and fixtures</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Cleaning mirrors and glass</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Toilet, tub, and shower cleaning</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <span>Wiping appliance exteriors</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-8">How House Cleaning Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                  1
                </div>
                <h3 className="font-bold mb-2">Schedule Online</h3>
                <p className="text-sm text-text-secondary">
                  Pick your date, time, and cleaning type. Add any special instructions or access details.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                  2
                </div>
                <h3 className="font-bold mb-2">We Clean Your Home</h3>
                <p className="text-sm text-text-secondary">
                  Our background-checked pros arrive with eco-friendly supplies and get to work on your checklist.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-primary-600">
                  3
                </div>
                <h3 className="font-bold mb-2">Enjoy Your Space</h3>
                <p className="text-sm text-text-secondary">
                  Return to a sparkling clean home. We send photos and a completion summary when done.
                </p>
              </div>
            </div>
          </section>

          {/* Service Areas */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Cleaning Service Areas in Harlem</h2>
            <div className="card bg-gray-50">
              <p className="text-text-secondary mb-4">
                We serve all of Harlem, from historic brownstones to modern high-rises. Our professional cleaners cover:
              </p>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                {allowedZips.map(zip => (
                  <div key={zip} className="flex items-center">
                    <span className="text-primary-600 mr-2">📍</span>
                    <span className="font-semibold">ZIP {zip}</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-text-tertiary">
                Covering Central Harlem, South Harlem, Morningside Heights, and surrounding neighborhoods.
              </p>
            </div>
          </section>

          {/* Why Choose Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">Why Choose Tidyhood House Cleaning</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <span className="text-2xl mr-3">✅</span>
                <div>
                  <h3 className="font-bold mb-1">Background-Checked Pros</h3>
                  <p className="text-sm text-text-secondary">
                    Every cleaner passes thorough background checks and quality assessments before joining our team.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="text-2xl mr-3">🌿</span>
                <div>
                  <h3 className="font-bold mb-1">Eco-Friendly Products</h3>
                  <p className="text-sm text-text-secondary">
                    We use plant-based, non-toxic cleaning solutions that are safe for kids, pets, and the planet.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="text-2xl mr-3">📸</span>
                <div>
                  <h3 className="font-bold mb-1">Photo Documentation</h3>
                  <p className="text-sm text-text-secondary">
                    Get before/after photos with each cleaning so you can see the results, even when you're not home.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="text-2xl mr-3">💯</span>
                <div>
                  <h3 className="font-bold mb-1">Satisfaction Guarantee</h3>
                  <p className="text-sm text-text-secondary">
                    Not happy? We'll come back within 24 hours to make it right, or issue a full refund.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold mb-6">FAQ — House Cleaning in Harlem</h2>
            <div className="space-y-4">
              <details className="card-compact cursor-pointer">
                <summary className="font-semibold">Are your cleaners background-checked?</summary>
                <p className="mt-3 text-sm text-text-secondary">
                  Yes. Every Tidyhood cleaner passes a comprehensive background check and identity verification before they can work with us.
                </p>
              </details>
              
              <details className="card-compact cursor-pointer">
                <summary className="font-semibold">What's the difference between standard and deep cleaning?</summary>
                <p className="mt-3 text-sm text-text-secondary">
                  Standard cleaning covers all surfaces, floors, and bathrooms. Deep cleaning adds inside appliances, baseboards, windows, and hard-to-reach areas. Deep cleaning is 1.5× the standard price.
                </p>
              </details>
              
              <details className="card-compact cursor-pointer">
                <summary className="font-semibold">Do I need to be home during the cleaning?</summary>
                <p className="mt-3 text-sm text-text-secondary">
                  No. Many customers provide access via doorman, lockbox, or smart lock. We'll send photos when we arrive and finish.
                </p>
              </details>
              
              <details className="card-compact cursor-pointer">
                <summary className="font-semibold">Do you bring cleaning supplies?</summary>
                <p className="mt-3 text-sm text-text-secondary">
                  Yes. We bring all eco-friendly cleaning products and equipment. If you prefer we use your products, just note that in your booking.
                </p>
              </details>
            </div>
          </section>

          {/* CTA Section */}
          <div className="text-center py-12 bg-primary-50 rounded-xl">
            <h2 className="text-2xl font-bold mb-4">Ready for a Sparkling Clean Home?</h2>
            <p className="text-text-secondary mb-6">
              Join Harlem residents who trust Tidyhood for reliable, professional home cleaning.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/book/cleaning" className="btn-primary btn-lg">
                Book Cleaning Service
              </Link>
              <Link href="/laundry" className="btn-secondary btn-lg">
                Explore Laundry Service →
              </Link>
            </div>
          </div>

          {/* Internal Links */}
          <div className="mt-12 text-center text-sm text-text-tertiary">
            <Link href="/" className="underline hover:text-primary-600">Home</Link>
            {' · '}
            <Link href="/laundry" className="underline hover:text-primary-600">Wash & Fold Laundry Delivery in Harlem</Link>
            {' · '}
            <Link href="/services" className="underline hover:text-primary-600">All Services</Link>
          </div>
        </main>
      </div>
    </>
  )
}
