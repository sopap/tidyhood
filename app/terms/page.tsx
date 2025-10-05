import Link from 'next/link'
import type { Metadata } from 'next'
import { Header } from '@/components/Header'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Read Tidyhood\'s terms of service for laundry and home cleaning services in Harlem NYC.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function TermsPage() {
  const allowedZips = process.env.NEXT_PUBLIC_ALLOWED_ZIPS?.split(',').map(z => z.trim()) || ['10026', '10027', '10030']
  const zipsDisplay = allowedZips.join(', ')

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-gray-600 mb-8">Last updated: January 4, 2025</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing and using Tidyhood's laundry and home cleaning services ("Services"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these Terms of Service, please do not use our Services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Service Description</h2>
              <p className="text-gray-700 mb-4">
                Tidyhood provides:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Wash & fold laundry services with pickup and delivery</li>
                <li>Professional home cleaning services for apartments and houses</li>
                <li>Online booking and payment processing</li>
                <li>Service area: Harlem (ZIP codes {zipsDisplay})</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Booking and Payment</h2>
              <p className="text-gray-700 mb-4">
                <strong>3.1 Booking:</strong> All bookings must be made through our website or mobile app. You must provide accurate contact information and service address.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>3.2 Payment:</strong> Payment is required at the time of booking via credit card or other accepted payment methods. We use Stripe for secure payment processing.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>3.3 Pricing:</strong> Prices are displayed on our website and are subject to change. Laundry services are priced per pound with a 15 lb minimum. Cleaning services are priced by unit size.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>3.4 First Order Cap:</strong> First-time customers are subject to a spending cap of $120 per order for security purposes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Cancellation and Refund Policy</h2>
              <p className="text-gray-700 mb-4">
                <strong>4.1 Cancellation:</strong> You may cancel your order up to 24 hours before the scheduled service time for a full refund. Cancellations made less than 24 hours in advance will incur a 50% cancellation fee.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>4.2 Refunds:</strong> Refunds will be processed within 5-7 business days to the original payment method.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>4.3 Service Issues:</strong> If you are unsatisfied with the service quality, please contact us within 24 hours of service completion. We will investigate and may offer a re-service, partial refund, or full refund at our discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Liability and Lost Items</h2>
              <p className="text-gray-700 mb-4">
                <strong>5.1 Laundry Services:</strong> We take care to properly handle your items, but we are not responsible for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Damage to items due to pre-existing conditions</li>
                <li>Color bleeding or shrinkage of improperly labeled items</li>
                <li>Items valued over $100 unless specifically declared</li>
                <li>Items left in pockets</li>
              </ul>
              <p className="text-gray-700 mb-4">
                <strong>5.2 Cleaning Services:</strong> We carry liability insurance for damages caused by our cleaners during service. Claims must be filed within 48 hours of service completion.
              </p>
              <p className="text-gray-700 mb-4">
                <strong>5.3 Lost Items:</strong> Maximum liability for lost laundry items is $25 per pound or $100 per item, whichever is less.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Customer Responsibilities</h2>
              <p className="text-gray-700 mb-4">
                You agree to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provide accurate address and contact information</li>
                <li>Be available at the scheduled service time or arrange for access</li>
                <li>Secure pets during cleaning services</li>
                <li>Remove valuable or fragile items from service areas</li>
                <li>Declare any special instructions or concerns at booking time</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Privacy and Data</h2>
              <p className="text-gray-700 mb-4">
                Your privacy is important to us. Please review our <Link href="/privacy" className="text-primary-600 hover:text-primary-700">Privacy Policy</Link> for information on how we collect, use, and protect your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Modification of Terms</h2>
              <p className="text-gray-700 mb-4">
                Tidyhood reserves the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to our website. Your continued use of our Services after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For questions about these Terms of Service, please contact us:
              </p>
              <ul className="list-none text-gray-700 mb-4">
                <li>Email: support@tidyhood.com</li>
                <li>Address: Harlem, New York, NY</li>
              </ul>
            </section>
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
            <Link href="/terms" className="text-white font-medium">
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
  )
}
