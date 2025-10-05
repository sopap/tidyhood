'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Header } from '@/components/Header'
import { TrustBar } from '@/components/TrustBar'
import { MobileCTABar } from '@/components/MobileCTABar'
import { useAuth } from '@/lib/auth-context'
import { 
  fadeInUpVariants, 
  staggerContainerVariants, 
  staggerItemVariants,
  cardHoverVariants 
} from '@/lib/motionVariants'

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
        <main className="container mx-auto px-4 py-4 md:py-8 lg:py-12">
          <motion.div 
            className="max-w-4xl mx-auto text-center mb-8 md:mb-12"
            initial="hidden"
            animate="visible"
            variants={fadeInUpVariants}
          >
            <h1 className="text-hero-mobile md:text-hero-tablet lg:text-hero-desktop font-bold text-gray-900 mb-4 md:mb-6">
              Harlem&apos;s Freshest Laundry & Home Cleaning Service
            </h1>
            <p className="text-lg md:text-xl text-text-secondary mb-3 md:mb-4">
              Same-day pickup, spotless results — powered by local pros you can trust.
            </p>
            <p className="text-sm md:text-base text-text-tertiary mb-4">
              Serving Harlem ZIPs: 10026, 10027, 10030
            </p>
            
            {/* Primary CTAs - Hidden on mobile (shown in sticky bar) */}
            <div className="hidden lg:flex gap-4 justify-center mt-8">
              <Link
                href="/book/laundry"
                className="btn-primary text-base md:text-lg"
                aria-label="Book laundry pickup service"
              >
                Book Laundry Pickup →
              </Link>
              <Link
                href="/book/cleaning"
                className="btn-secondary text-base md:text-lg"
                aria-label="Book home cleaning service"
              >
                Book Home Cleaning →
              </Link>
            </div>
            
            {/* Trust microcopy */}
            <p className="text-xs md:text-sm text-text-tertiary mt-4 italic">
              No hidden fees. No surprises. Just clean.
            </p>
          </motion.div>

          {/* Trust Bar */}
          <TrustBar />

          {/* Returning User "Book Again" Prompt */}
          {user && lastOrder && !loading && (
            <motion.div 
              className="max-w-2xl mx-auto my-8 md:my-12 bg-primary-50 border-2 border-primary-200 rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl" role="img" aria-label="Welcome back">👋</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">Welcome back!</h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Your last order at {lastOrder.address_snapshot?.line1}, {lastOrder.address_snapshot?.city} {lastOrder.address_snapshot?.zip} was spotless.
                  </p>
                  <div className="flex gap-3">
                    <Link
                      href="/book/laundry"
                      className="btn-primary text-sm py-2 px-4"
                      aria-label="Book laundry service again"
                    >
                      Book Laundry Again
                    </Link>
                    <Link
                      href="/book/cleaning"
                      className="btn-secondary text-sm py-2 px-4"
                      aria-label="Book cleaning service"
                    >
                      Book Cleaning
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Main Service Cards */}
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 md:gap-8 mb-16 md:mb-20 mt-8 md:mt-12">
            {/* Laundry Service Card */}
            <Link href="/book/laundry" className="group block">
              <motion.div
                className="card border-2 border-transparent group-hover:border-primary-300 h-full"
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
                aria-label="Wash and fold laundry service details"
              >
                <div className="text-5xl md:text-6xl mb-4 md:mb-6 text-center" role="img" aria-label="Laundry basket">🧺</div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-center">Wash & Fold Laundry</h2>
                <p className="text-text-secondary mb-4 md:mb-6 text-center text-sm md:text-base">
                  Professional care with 48-hour turnaround and same-day pickup options.
                </p>
                
                <div className="bg-primary-50 rounded-lg p-4 mb-4 md:mb-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-primary-600">
                    $1.75<span className="text-base md:text-lg">/lb</span>
                  </div>
                  <div className="text-xs md:text-sm text-text-secondary">15 lb minimum — $26.25</div>
                </div>

                <ul className="space-y-2 md:space-y-3 mb-6">
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Free pickup & delivery</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Eco-friendly detergents</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>QR-coded bags for tracking</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Rush 24-hr service available</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Tax-exempt for residential buildings</span>
                  </li>
                </ul>

                <div className="text-center">
                  <span className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold group-hover:bg-primary-700 transition-colors">
                    Book Laundry →
                  </span>
                </div>
              </motion.div>
            </Link>

            {/* Home Cleaning Service Card */}
            <Link href="/book/cleaning" className="group block">
              <motion.div
                className="card border-2 border-transparent group-hover:border-primary-300 h-full"
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
                aria-label="Deep or standard home cleaning service details"
              >
                <div className="text-5xl md:text-6xl mb-4 md:mb-6 text-center" role="img" aria-label="Sparkles">✨</div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-center">Deep or Standard Home Cleaning</h2>
                <p className="text-text-secondary mb-4 md:mb-6 text-center text-sm md:text-base">
                  Trusted Harlem pros for spotless apartments, condos, and brownstones.
                </p>
                
                <div className="bg-primary-50 rounded-lg p-4 mb-4 md:mb-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-primary-600">
                    $89<span className="text-base md:text-lg">+</span>
                  </div>
                  <div className="text-xs md:text-sm text-text-secondary">Studio $89 | 1BR $119 | 2BR $149</div>
                </div>

                <ul className="space-y-2 md:space-y-3 mb-6">
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Background-checked professionals</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Eco-friendly cleaning products</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Photo documentation of each visit</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Flexible scheduling & secure entry options</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>100% satisfaction guarantee</span>
                  </li>
                </ul>

                <div className="text-center">
                  <span className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold group-hover:bg-primary-700 transition-colors">
                    Book Cleaning →
                  </span>
                </div>
              </motion.div>
            </Link>
          </div>

          {/* How It Works Section */}
          <motion.div 
            className="max-w-5xl mx-auto mt-16 md:mt-24 mb-12 md:mb-16"
            variants={staggerContainerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <motion.div 
                className="text-center"
                variants={staggerItemVariants}
              >
                <div 
                  className="w-14 h-14 md:w-16 md:h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-xl md:text-2xl font-bold text-primary-600"
                  role="img"
                  aria-label="Step 1"
                >
                  1
                </div>
                <h3 className="font-bold mb-2 text-lg">Book Online</h3>
                <p className="text-text-secondary text-sm md:text-base">
                  Choose your service, pick a time slot, and pay securely.
                </p>
              </motion.div>
              
              <motion.div 
                className="text-center"
                variants={staggerItemVariants}
              >
                <div 
                  className="w-14 h-14 md:w-16 md:h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-xl md:text-2xl font-bold text-primary-600"
                  role="img"
                  aria-label="Step 2"
                >
                  2
                </div>
                <h3 className="font-bold mb-2 text-lg">We Come to You</h3>
                <p className="text-text-secondary text-sm md:text-base">
                  Our Harlem-based partners arrive at your scheduled time.
                </p>
              </motion.div>
              
              <motion.div 
                className="text-center"
                variants={staggerItemVariants}
              >
                <div 
                  className="w-14 h-14 md:w-16 md:h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-xl md:text-2xl font-bold text-primary-600"
                  role="img"
                  aria-label="Step 3"
                >
                  3
                </div>
                <h3 className="font-bold mb-2 text-lg">Delivered Fresh</h3>
                <p className="text-text-secondary text-sm md:text-base">
                  Clothes folded, homes shining, and your day uninterrupted.
                </p>
              </motion.div>
            </div>
            
            {/* Supporting local note */}
            <p className="text-center text-sm text-text-tertiary mt-8 italic">
              Proudly supporting Harlem workers & small businesses.
            </p>
          </motion.div>

          {/* Service Areas Section */}
          <div className="max-w-4xl mx-auto mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">Laundry & Cleaning Service Areas in Harlem</h2>
            <div className="card bg-gray-50 text-center">
              <p className="text-text-secondary mb-4">
                We proudly serve all of Harlem, including Central Harlem, South Harlem, and Morningside Heights. Our pickup and delivery service covers ZIP codes:
              </p>
              <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-4">
                <div className="flex items-center">
                  <span className="text-primary-600 text-2xl mr-2">📍</span>
                  <span className="font-bold">10026</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary-600 text-2xl mr-2">📍</span>
                  <span className="font-bold">10027</span>
                </div>
                <div className="flex items-center">
                  <span className="text-primary-600 text-2xl mr-2">📍</span>
                  <span className="font-bold">10030</span>
                </div>
              </div>
              <p className="text-sm text-text-tertiary">
                Near the border? Contact us — we may be able to accommodate your location.
              </p>
            </div>
          </div>

          {/* Why Choose Section */}
          <div className="max-w-4xl mx-auto mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Why Harlem Chooses Tidyhood</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start">
                <span className="text-2xl mr-3">👥</span>
                <div>
                  <h3 className="font-bold mb-1">Local Pros, Not Gig Workers</h3>
                  <p className="text-sm text-text-secondary">
                    We partner with established Harlem businesses who hire and train their teams properly.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="text-2xl mr-3">🌿</span>
                <div>
                  <h3 className="font-bold mb-1">Eco-Friendly Products</h3>
                  <p className="text-sm text-text-secondary">
                    Plant-based detergents and non-toxic cleaning supplies safe for your family and the planet.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="text-2xl mr-3">💰</span>
                <div>
                  <h3 className="font-bold mb-1">Transparent Pricing</h3>
                  <p className="text-sm text-text-secondary">
                    No hidden fees, no surprises. See exactly what you'll pay before you book.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <span className="text-2xl mr-3">💬</span>
                <div>
                  <h3 className="font-bold mb-1">Real Harlem Support</h3>
                  <p className="text-sm text-text-secondary">
                    Get help from a local team that knows the neighborhood and cares about your experience.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto mb-16 md:mb-20" id="faq">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">FAQ — Laundry & Cleaning in Harlem</h2>
            <div className="space-y-4">
              <details className="card-compact cursor-pointer">
                <summary className="font-semibold">Do you offer same-day laundry pickup in Harlem?</summary>
                <p className="mt-3 text-sm text-text-secondary">
                  Yes. Schedule before 11 AM for same-day pickup in most Harlem ZIP codes (10026, 10027, 10030). Next-day pickup is guaranteed for all bookings.
                </p>
              </details>
              
              <details className="card-compact cursor-pointer">
                <summary className="font-semibold">Are Tidyhood cleaners background-checked?</summary>
                <p className="mt-3 text-sm text-text-secondary">
                  Yes. Every cleaner passes comprehensive background checks and quality assessments before joining our network.
                </p>
              </details>
              
              <details className="card-compact cursor-pointer">
                <summary className="font-semibold">What areas in Harlem do you serve?</summary>
                <p className="mt-3 text-sm text-text-secondary">
                  We serve all of Harlem including Central Harlem, South Harlem, and Morningside Heights — ZIP codes 10026, 10027, and 10030.
                </p>
              </details>
            </div>
          </div>
        </main>

        {/* Mobile Sticky CTA Bar */}
        <MobileCTABar />

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-16 md:mt-24 py-12 pb-24 lg:pb-12">
          <div className="container mx-auto px-4 text-center">
            <p className="text-gray-400 text-sm md:text-base">
              © 2025 Tidyhood. Supporting Harlem businesses.
            </p>
            <div className="mt-4 space-x-4 md:space-x-6">
              <Link href="/terms" className="text-gray-400 hover:text-white text-sm md:text-base transition-colors">
                Terms
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-white text-sm md:text-base transition-colors">
                Privacy
              </Link>
              <a href="mailto:support@tidyhood.com" className="text-gray-400 hover:text-white text-sm md:text-base transition-colors">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
