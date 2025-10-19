'use client'

import Link from 'next/link'
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function SiteFooter() {
  const [zipsDisplay, setZipsDisplay] = useState('10026, 10027, 10030')
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    // Load zip codes on client side to avoid hydration mismatch
    const allowedZips = process.env.NEXT_PUBLIC_ALLOWED_ZIPS?.split(',').map(z => z.trim()) || ['10026', '10027', '10030']
    setZipsDisplay(allowedZips.join(', '))
  }, [])

  return (
    <footer className="bg-gray-900 text-white" role="contentinfo">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 mb-10">
          {/* Company Info */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <img 
                src="/logo.svg" 
                alt="TidyHood - Laundry and Cleaning Services"
                className="h-20 w-auto brightness-0 invert"
              />
            </Link>
            <p className="text-base text-gray-300 mb-4">
              Professional laundry pickup and home cleaning services for Harlem residents.
            </p>
            {/* Social Media Links */}
            <div className="flex gap-4 mt-4">
              <a 
                href="https://facebook.com/tidyhood" 
                aria-label="Follow us on Facebook"
                className="text-gray-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://twitter.com/tidyhood" 
                aria-label="Follow us on Twitter"
                className="text-gray-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="https://instagram.com/tidyhood" 
                aria-label="Follow us on Instagram"
                className="text-gray-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-base font-semibold text-white mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin className="h-5 w-5 text-primary-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-base text-gray-300">
                  <strong className="text-white">Service Area:</strong> Harlem, NYC<br />
                  <span className="text-sm text-gray-400" suppressHydrationWarning>ZIPs: {zipsDisplay}</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="h-5 w-5 text-primary-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <a 
                    href="tel:+19172728434" 
                    className="text-base text-gray-300 hover:text-white transition-colors underline"
                  >
                    +1 (917) 272-8434
                  </a>
                  <div className="text-sm text-gray-400">Mon–Sun 8:00–20:00</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-5 w-5 text-primary-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <a 
                  href="mailto:support@tidyhood.nyc" 
                  className="text-base text-gray-300 hover:text-white transition-colors underline"
                >
                  support@tidyhood.nyc
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-base font-semibold text-white mb-4">Quick Links</h3>
            <nav aria-label="Footer navigation">
              <ul className="space-y-2">
                <li>
                  <Link 
                    href="/laundry" 
                    className="text-base text-gray-300 hover:text-white transition-colors underline"
                  >
                    Wash & Fold Laundry Delivery
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/cleaning" 
                    className="text-base text-gray-300 hover:text-white transition-colors underline"
                  >
                    House Cleaning Services
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/services" 
                    className="text-base text-gray-300 hover:text-white transition-colors underline"
                  >
                    All Services
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/privacy" 
                    className="text-base text-gray-300 hover:text-white transition-colors underline"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link 
                    href="/terms" 
                    className="text-base text-gray-300 hover:text-white transition-colors underline"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          {/* Copyright and Tagline */}
          <div className="text-center">
            <p className="text-sm text-gray-400">
              © {currentYear} TidyHood. Supporting Harlem businesses.
            </p>
          </div>
        </div>
      </div>

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'LocalBusiness',
            name: 'TidyHood',
            description: 'Professional laundry pickup and home cleaning services in Harlem, NYC',
            url: 'https://tidyhood.nyc',
            telephone: '+1-917-272-8434',
            email: 'support@tidyhood.nyc',
            address: {
              '@type': 'PostalAddress',
              addressLocality: 'Harlem',
              addressRegion: 'NY',
              postalCode: zipsDisplay.split(',')[0]?.trim() || '10026',
              addressCountry: 'US'
            },
            areaServed: {
              '@type': 'GeoCircle',
              geoMidpoint: {
                '@type': 'GeoCoordinates',
                latitude: 40.8116,
                longitude: -73.9465
              },
              geoRadius: '5000'
            },
            openingHoursSpecification: {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              opens: '08:00',
              closes: '20:00'
            },
            sameAs: [
              'https://facebook.com/tidyhood',
              'https://twitter.com/tidyhood',
              'https://instagram.com/tidyhood'
            ]
          })
        }}
      />
    </footer>
  )
}
