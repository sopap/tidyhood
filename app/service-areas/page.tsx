import { Header } from '@/components/Header'
import SiteFooter from '@/components/SiteFooter'
import Link from 'next/link'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Service Areas in Harlem & Morningside Heights | TidyHood NYC',
  description: 'TidyHood serves Central Harlem, Morningside Heights, Hamilton Heights, and parts of Upper West Side. See all ZIP codes: 10025, 10026, 10027, 10029, 10030, 10031, 10032, 10035, 10037, 10039, 10128.',
  openGraph: {
    title: 'Service Areas in Harlem & Morningside Heights | TidyHood NYC',
    description: 'TidyHood serves Central Harlem, Morningside Heights, Hamilton Heights, and parts of Upper West Side. Check if we serve your ZIP code.',
  },
}

export default function ServiceAreasPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Service Areas: Harlem & Nearby
            </h1>
            <p className="text-lg text-gray-700">
              We currently serve Central Harlem, Morningside Heights, Hamilton Heights, 
              and parts of Upper West Side. If you're near the border of our service area, 
              email <a href="mailto:support@tidyhood.nyc" className="text-primary-600 hover:text-primary-700 underline">support@tidyhood.nyc</a> and we'll confirm availability.
            </p>
          </div>

          {/* ZIP Codes Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">ZIP Codes We Serve</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {['10025', '10026', '10027', '10029', '10030', '10031', '10032', '10035', '10037', '10039', '10128'].map(zip => (
                <div key={zip} className="bg-primary-50 border border-primary-200 rounded-lg px-4 py-3 text-center">
                  <span className="text-lg font-bold text-primary-900">{zip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Neighborhoods Section */}
          <div className="space-y-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Neighborhoods</h2>

            {/* Central Harlem */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Central Harlem</h3>
              <p className="text-gray-700 mb-3">
                Our core service area includes Central Harlem from 110th to 155th Street. 
                We handle walk-ups and elevator buildings with equal care, and our partners 
                know the neighborhood's building quirks—from pre-war walk-ups to newer developments.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Common ZIPs:</strong> 10026, 10027, 10030, 10037, 10039
              </p>
            </div>

            {/* Morningside Heights */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Morningside Heights</h3>
              <p className="text-gray-700 mb-3">
                From Columbia University down to Cathedral Parkway, we serve the entire Morningside 
                Heights corridor. Expect flexible pickup windows that work around your schedule, 
                whether you're a student, faculty, or neighborhood resident.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Common ZIPs:</strong> 10025, 10027
              </p>
            </div>

            {/* Hamilton Heights */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Hamilton Heights</h3>
              <p className="text-gray-700 mb-3">
                We cover Hamilton Heights from 135th to 155th Street. Our team is experienced 
                with the neighborhood's classic brownstones and apartment buildings. Same-day 
                service often available when you book by 11 AM.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Common ZIPs:</strong> 10031, 10032, 10039
              </p>
            </div>

            {/* Upper West Side (Border) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">Upper West Side (Select Areas)</h3>
              <p className="text-gray-700 mb-3">
                We serve parts of Upper West Side near Morningside Heights and Central Harlem. 
                Buildings with doormen are welcome—just let us know your building's procedures 
                in the booking notes.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Common ZIPs:</strong> 10025, 10128
              </p>
            </div>

            {/* East Harlem (Select Areas) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">East Harlem (Select Areas)</h3>
              <p className="text-gray-700 mb-3">
                We cover select areas of East Harlem, primarily near the western border. 
                If you're in this area, we recommend checking availability at booking or 
                contacting us directly.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Common ZIPs:</strong> 10029, 10035
              </p>
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
              {' '}and we'll help you out.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
