'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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

  // Get ZIP codes from environment variable
  const allowedZips = process.env.NEXT_PUBLIC_ALLOWED_ZIPS?.split(',').map(z => z.trim()) || ['10026', '10027', '10030']
  const zipsDisplay = allowedZips.join(', ')

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
              Serving Harlem ZIPs: {zipsDisplay}
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
                {allowedZips.map((zip) => (
                  <div key={zip} className="flex items-center">
                    <span className="text-primary-600 text-2xl mr-2">📍</span>
                    <span className="font-bold">{zip}</span>
                  </div>
                ))}
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
              <div className="flex items-start p-6 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-gray-100 hover:border-primary-200 hover:shadow-md">
                <span className="text-4xl mr-4 flex-shrink-0">👥</span>
                <div>
                  <h3 className="font-bold mb-2 text-lg">Local Pros, Not Gig Workers</h3>
                  <p className="text-sm text-text-secondary">
                    We partner with established Harlem businesses who hire and train their teams properly.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start p-6 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-gray-100 hover:border-primary-200 hover:shadow-md">
                <span className="text-4xl mr-4 flex-shrink-0">🌿</span>
                <div>
                  <h3 className="font-bold mb-2 text-lg">Eco-Friendly Products</h3>
                  <p className="text-sm text-text-secondary">
                    Plant-based detergents and non-toxic cleaning supplies safe for your family and the planet.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start p-6 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-gray-100 hover:border-primary-200 hover:shadow-md">
                <span className="text-4xl mr-4 flex-shrink-0">💰</span>
                <div>
                  <h3 className="font-bold mb-2 text-lg">Transparent Pricing</h3>
                  <p className="text-sm text-text-secondary">
                    No hidden fees, no surprises. See exactly what you'll pay before you book.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start p-6 rounded-lg bg-white hover:bg-gray-50 transition-colors border border-gray-100 hover:border-primary-200 hover:shadow-md">
                <span className="text-4xl mr-4 flex-shrink-0">💬</span>
                <div>
                  <h3 className="font-bold mb-2 text-lg">Real Harlem Support</h3>
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
              <details className="group card-compact cursor-pointer hover:border-primary-200 transition-colors">
                <summary className="font-semibold flex items-center justify-between">
                  <span>Do you offer same-day laundry pickup in Harlem?</span>
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-text-secondary">
                  Yes. Schedule before 11 AM for same-day pickup in most Harlem ZIP codes ({zipsDisplay}). Next-day pickup is guaranteed for all bookings.
                </p>
              </details>
              
              <details className="group card-compact cursor-pointer hover:border-primary-200 transition-colors">
                <summary className="font-semibold flex items-center justify-between">
                  <span>Are Tidyhood cleaners background-checked?</span>
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-text-secondary">
                  Yes. Every cleaner passes comprehensive background checks and quality assessments before joining our network.
                </p>
              </details>
              
              <details className="group card-compact cursor-pointer hover:border-primary-200 transition-colors">
                <summary className="font-semibold flex items-center justify-between">
                  <span>What areas in Harlem do you serve?</span>
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-text-secondary">
                  We serve all of Harlem including Central Harlem, South Harlem, and Morningside Heights — ZIP codes {zipsDisplay}.
                </p>
              </details>
              
              <details className="group card-compact cursor-pointer hover:border-primary-200 transition-colors">
                <summary className="font-semibold flex items-center justify-between">
                  <span>What payment methods do you accept?</span>
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-text-secondary">
                  We accept all major credit cards, debit cards, and digital wallets through our secure payment processor. Payment is processed when you book, and you'll receive a receipt via email.
                </p>
              </details>
              
              <details className="group card-compact cursor-pointer hover:border-primary-200 transition-colors">
                <summary className="font-semibold flex items-center justify-between">
                  <span>Can I schedule recurring service?</span>
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-text-secondary">
                  Yes! You can set up weekly or bi-weekly recurring services for both laundry and cleaning. Contact us after your first booking to set up a schedule that works for you.
                </p>
              </details>
              
              <details className="group card-compact cursor-pointer hover:border-primary-200 transition-colors">
                <summary className="font-semibold flex items-center justify-between">
                  <span>How do I cancel or reschedule?</span>
                  <svg className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm text-text-secondary">
                  You can cancel or reschedule up to 4 hours before your scheduled time at no charge. Contact us via email or phone, or manage your booking through your account dashboard.
                </p>
              </details>
            </div>
          </div>
        </main>

        {/* Mobile Sticky CTA Bar */}
        <MobileCTABar />

        {/* Footer */}
        <footer className="bg-gray-900 text-white mt-16 md:mt-24 py-12 pb-24 lg:pb-12">
          <div className="container mx-auto px-4">
            {/* Logo */}
            <div className="text-center mb-8">
              <Link href="/" className="inline-block">
                <Image 
                  src="/logo.svg"
                  alt="Tidyhood"
                  width={200}
                  height={50}
                  className="h-14 md:h-16 lg:h-18 w-auto opacity-90 hover:opacity-100 transition-opacity"
                />
              </Link>
            </div>

            {/* Main Footer Content */}
            <div className="grid md:grid-cols-3 gap-8 mb-8 max-w-4xl mx-auto">
              {/* Services Column */}
              <div>
                <h3 className="font-bold text-lg mb-4">Services</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/book/laundry" className="text-gray-400 hover:text-white transition-colors text-sm">
                      Wash & Fold Laundry
                    </Link>
                  </li>
                  <li>
                    <Link href="/book/cleaning" className="text-gray-400 hover:text-white transition-colors text-sm">
                      Home Cleaning
                    </Link>
                  </li>
                  <li>
                    <Link href="/laundry" className="text-gray-400 hover:text-white transition-colors text-sm">
                      Laundry Delivery
                    </Link>
                  </li>
                  <li>
                    <Link href="/cleaning" className="text-gray-400 hover:text-white transition-colors text-sm">
                      Cleaning Service
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Company Column */}
              <div>
                <h3 className="font-bold text-lg mb-4">Company</h3>
                <ul className="space-y-2">
                  <li>
                    <Link href="/services" className="text-gray-400 hover:text-white transition-colors text-sm">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link href="#faq" className="text-gray-400 hover:text-white transition-colors text-sm">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-gray-400 hover:text-white transition-colors text-sm">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors text-sm">
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Contact Column */}
              <div>
                <h3 className="font-bold text-lg mb-4">Contact</h3>
                <ul className="space-y-3">
                  <li className="flex items-center text-sm">
                    <span className="mr-2">📧</span>
                    <a href="mailto:support@tidyhood.com" className="text-gray-400 hover:text-white transition-colors">
                      support@tidyhood.com
                    </a>
                  </li>
                  <li className="flex items-center text-sm">
                    <span className="mr-2">📞</span>
                    <a href="tel:+12125550123" className="text-gray-400 hover:text-white transition-colors">
                      +1 (212) 555-0123
                    </a>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="mr-2 mt-0.5">📍</span>
                    <span className="text-gray-400">
                      Serving Harlem, NYC<br />
                      ZIPs: {zipsDisplay}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Social Media Icons */}
            <div className="flex justify-center gap-6 mb-8">
              <a 
                href="https://instagram.com/tidyhood" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Follow us on Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                </svg>
              </a>
              <a 
                href="https://facebook.com/tidyhood" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Follow us on Facebook"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                </svg>
              </a>
              <a 
                href="https://twitter.com/tidyhood" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Follow us on Twitter"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800 pt-6">
              <p className="text-center text-gray-400 text-sm mb-3">
                © 2025 Tidyhood. Supporting Harlem businesses.
              </p>
              <div className="flex justify-center gap-4 text-xs text-gray-500">
                <Link href="/terms" className="hover:text-gray-300 transition-colors">
                  Terms
                </Link>
                <span>•</span>
                <Link href="/privacy" className="hover:text-gray-300 transition-colors">
                  Privacy
                </Link>
                <span>•</span>
                <a href="mailto:support@tidyhood.com" className="hover:text-gray-300 transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
