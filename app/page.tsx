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
  "name": "TidyHood",
  "description": "Professional laundry and home cleaning services in Harlem",
  "url": process.env.NEXT_PUBLIC_SITE_URL || "https://tidyhood.nyc",
  "telephone": "+1-917-272-8434",
  "email": "support@tidyhood.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "171 W 131st St",
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

// FAQPage Schema for rich snippets
const faqStructuredData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do you offer same-day laundry pickup in Harlem?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Schedule before 11 AM for same-day pickup in most Harlem ZIP codes (10026, 10027, 10030). Next-day pickup is guaranteed for all bookings."
      }
    },
    {
      "@type": "Question",
      "name": "Are TidyHood cleaners background-checked?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. Every cleaner passes comprehensive background checks and quality assessments before joining our network."
      }
    },
    {
      "@type": "Question",
      "name": "What areas in Harlem do you serve?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We serve all of Harlem including Central Harlem, South Harlem, and Morningside Heights — ZIP codes 10026, 10027, 10030."
      }
    },
    {
      "@type": "Question",
      "name": "What payment methods do you accept?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We accept all major credit cards, debit cards, and digital wallets through our secure payment processor. Payment is processed when you book, and you'll receive a receipt via email."
      }
    },
    {
      "@type": "Question",
      "name": "Can I schedule recurring service?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! You can set up weekly or bi-weekly recurring services for both laundry and cleaning. Contact us after your first booking to set up a schedule that works for you."
      }
    },
    {
      "@type": "Question",
      "name": "How do I cancel or reschedule?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can cancel or reschedule up to 4 hours before your scheduled time at no charge. Contact us via email or phone, or manage your booking through your account dashboard."
      }
    }
  ]
}

// Service Schema for better search visibility
const servicesStructuredData = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "Laundry Service",
    "provider": {
      "@type": "LocalBusiness",
      "name": "TidyHood"
    },
    "areaServed": {
      "@type": "City",
      "name": "Harlem, New York"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Laundry Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Wash & Fold Laundry",
            "description": "Professional wash and fold service with same-day pickup and 48-hour return"
          }
        }
      ]
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "House Cleaning Service",
    "provider": {
      "@type": "LocalBusiness",
      "name": "TidyHood"
    },
    "areaServed": {
      "@type": "City",
      "name": "Harlem, New York"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Cleaning Services",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Standard Home Cleaning",
            "description": "Professional home cleaning by background-verified experts"
          }
        }
      ]
    }
  }
]

export default function Home() {
  const { user } = useAuth()
  const [lastOrder, setLastOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pricing, setPricing] = useState({
    laundryPerLb: '$2.15',
    laundryMinLbs: '15',
    cleaningStudio: '$89',
  })

  // Get ZIP codes from environment variable
  const allowedZips = process.env.NEXT_PUBLIC_ALLOWED_ZIPS?.split(',').map(z => z.trim()) || ['10026', '10027', '10030']
  const zipsDisplay = allowedZips.join(', ')

  // Fetch user's last order and pricing
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch pricing from database
        const pricingRes = await fetch('/api/admin/settings/pricing')
        if (pricingRes.ok) {
          const pricingData = await pricingRes.json()
          const rules = pricingData.rules || []
          
          const perLbRule = rules.find((r: any) => r.unit_key === 'LND_WF_PERLB')
          const minRule = rules.find((r: any) => r.unit_key === 'LND_WF_MIN_LBS')
          const studioRule = rules.find((r: any) => r.unit_key === 'CLN_STD_STUDIO')
          
          setPricing({
            laundryPerLb: perLbRule ? `$${(perLbRule.unit_price_cents / 100).toFixed(2)}` : '$2.15',
            laundryMinLbs: minRule ? `${(minRule.unit_price_cents / 100)}` : '15',
            cleaningStudio: studioRule ? `$${Math.floor(studioRule.unit_price_cents / 100)}` : '$89',
          })
        }

        // Fetch last order if user is logged in
        if (user) {
          const response = await fetch('/api/orders?limit=1')
          if (response.ok) {
            const data = await response.json()
            if (data.orders && data.orders.length > 0) {
              setLastOrder(data.orders[0])
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  return (
    <>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      {servicesStructuredData.map((service, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }}
        />
      ))}
      
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
            <h1 className="text-[28px] leading-tight xs:text-hero-mobile md:text-hero-tablet lg:text-hero-desktop font-bold text-gray-900 mb-4 md:mb-6">
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
              className="max-w-2xl mx-auto my-8 md:my-12 bg-primary-50 border-2 border-primary-200 rounded-xl p-6 shadow-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-start gap-4">
                <div className="text-3xl" role="img" aria-label="Welcome back">🎉</div>
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
                      className="btn-secondary text-sm py-2 px-4 font-semibold"
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
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 md:gap-10 mb-16 md:mb-20 mt-8 md:mt-12">
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
                <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-center">Harlem's Premium Wash & Fold Service</h2>
                <p className="text-text-secondary mb-4 md:mb-6 text-center text-sm md:text-base">
                  Same-day pickup, 48-hour return. Professional care that fits your schedule.
                </p>
                
                <div className="bg-primary-50 rounded-lg p-4 mb-4 md:mb-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-primary-600">
                    {pricing.laundryPerLb}<span className="text-base md:text-lg">/lb</span>
                  </div>
                  <div className="text-xs md:text-sm text-text-secondary">({pricing.laundryMinLbs} lb minimum)</div>
                </div>

                <ul className="space-y-2 md:space-y-3 mb-6">
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Contactless pickup & delivery (FREE)</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Real-time order tracking via QR codes</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Eco-friendly, gentle on fabrics</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>24-hour rush service available</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>No sales tax (residential buildings)</span>
                  </li>
                </ul>

                <div className="text-center">
                  <span className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold group-hover:bg-primary-700 transition-colors">
                    Schedule Pickup →
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
                <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-center">Professional Home Cleaning by Harlem Experts</h2>
                <p className="text-text-secondary mb-4 md:mb-6 text-center text-sm md:text-base">
                  Background-verified professionals delivering spotless results with 100% satisfaction guarantee.
                </p>
                
                <div className="bg-primary-50 rounded-lg p-4 mb-4 md:mb-6 text-center">
                  <div className="text-2xl md:text-3xl font-bold text-primary-600">
                    Starting at {pricing.cleaningStudio}
                  </div>
                  <div className="text-xs md:text-sm text-text-secondary">Studio {pricing.cleaningStudio} • 1BR $119 • 2BR $149</div>
                </div>

                <ul className="space-y-2 md:space-y-3 mb-6">
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>100% satisfaction guarantee</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Background-verified professionals</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Before/after photos sent to you</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Eco-friendly cleaning products</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5" aria-hidden="true">✓</span>
                    <span>Flexible scheduling + secure key management</span>
                  </li>
                </ul>

                <div className="text-center">
                  <span className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold group-hover:bg-primary-700 transition-colors">
                    Get Quote →
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
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Why Harlem Chooses TidyHood</h2>
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
                  <span>Are TidyHood cleaners background-checked?</span>
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
      </div>
    </>
  )
}
