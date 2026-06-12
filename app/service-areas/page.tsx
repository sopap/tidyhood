import { Header } from '@/components/Header'
import Link from 'next/link'
import { Metadata } from 'next'
import { getAllowedZips, NEIGHBORHOODS } from '@/lib/service-area'

export const metadata: Metadata = {
  title: 'Service Areas — All of Manhattan | TidyHood NYC',
  description:
    'TidyHood picks up and delivers across all of Manhattan — Harlem, Upper West Side, Upper East Side, Midtown, Downtown, and everywhere in between. Check your neighborhood.',
  alternates: {
    canonical: 'https://tidyhood.nyc/service-areas',
  },
  openGraph: {
    title: 'Service Areas — All of Manhattan | TidyHood NYC',
    description:
      'Born in Harlem, now serving all of Manhattan. Check if we serve your neighborhood and ZIP code.',
  },
}

export default function ServiceAreasPage() {
  const allowedZips = getAllowedZips()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Serving All of Manhattan
            </h1>
            <p className="text-lg text-gray-700">
              TidyHood started in Harlem and now picks up and delivers across the
              entire borough — from Inwood down to Battery Park City. Not sure about
              your address? Email{' '}
              <a href="mailto:support@tidyhood.nyc" className="text-primary-600 hover:text-primary-700 underline">
                support@tidyhood.nyc
              </a>{' '}
              and we&apos;ll confirm availability.
            </p>
          </div>

          {/* Neighborhoods Section */}
          <div className="space-y-4 mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Neighborhoods We Serve</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {NEIGHBORHOODS.map((hood) => (
                <div key={hood.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{hood.name}</h3>
                  <p className="text-sm text-gray-600">
                    <strong>ZIPs:</strong> {hood.zips.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ZIP Codes Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              All ZIP Codes We Serve ({allowedZips.length})
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {allowedZips.map((zip) => (
                <div key={zip} className="bg-primary-50 border border-primary-200 rounded-lg px-2 py-2 text-center">
                  <span className="text-sm font-bold text-primary-900">{zip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Service Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-3">What to Expect</h2>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="text-blue-600 mr-2 mt-0.5">✓</span>
                <span><strong>Flexible pickup windows:</strong> Same-day or next-day in most areas</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2 mt-0.5">✓</span>
                <span><strong>Building access:</strong> Walk-ups, elevator buildings, and doorman buildings welcome</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2 mt-0.5">✓</span>
                <span><strong>Clear pricing:</strong> Know your cost before we clean (laundry: per pound; cleaning: per home size)</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-600 mr-2 mt-0.5">✓</span>
                <span><strong>Easy rescheduling:</strong> Free when you give us 24 hours notice</span>
              </li>
            </ul>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">Ready to Book?</h2>
            <p className="text-lg mb-6 text-primary-50">
              Choose laundry pickup or home cleaning—both with transparent pricing and flexible scheduling.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/book/laundry"
                className="inline-block bg-white text-primary-700 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Book Laundry Service
              </Link>
              <Link
                href="/book/cleaning"
                className="inline-block bg-white text-primary-700 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Book Home Cleaning
              </Link>
            </div>
          </div>

          {/* Contact Section */}
          <div className="mt-8 text-center text-gray-600">
            <p className="mb-2">
              Not sure if we serve your area? Have a special request?
            </p>
            <p>
              Email us at{' '}
              <a href="mailto:support@tidyhood.nyc" className="text-primary-600 hover:text-primary-700 underline font-medium">
                support@tidyhood.nyc
              </a>
              {' '}and we&apos;ll help you out.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
