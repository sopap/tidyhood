import Link from 'next/link'
import type { Metadata } from 'next'
import { Header } from '@/components/Header'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Learn how Tidyhood protects your personal information and data privacy. GDPR and CCPA compliant.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: January 4, 2025</p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 mb-4">
                Tidyhood ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our laundry and home cleaning services.
              </p>
              <p className="text-gray-700 mb-4">
                By using our services, you agree to the collection and use of information in accordance with this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">2.1 Personal Information</h3>
              <p className="text-gray-700 mb-4">
                When you create an account or book a service, we collect:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Name and contact information (email, phone number)</li>
                <li>Service address and delivery instructions</li>
                <li>Payment information (processed securely through Stripe)</li>
                <li>Account credentials (email and hashed password)</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">2.2 Service Information</h3>
              <p className="text-gray-700 mb-4">
                When you use our services, we collect:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Order details (service type, date, time, pricing)</li>
                <li>Special instructions or preferences</li>
                <li>Photos of cleaning work (with your consent)</li>
                <li>Communication history with our support team</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">2.3 Technical Information</h3>
              <p className="text-gray-700 mb-4">
                We automatically collect:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>IP address and browser information</li>
                <li>Device information and operating system</li>
                <li>Usage data and analytics</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">
                We use your information to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Process and fulfill your service orders</li>
                <li>Communicate with you about your orders and account</li>
                <li>Send SMS and email notifications about service status</li>
                <li>Process payments and prevent fraud</li>
                <li>Improve our services and customer experience</li>
                <li>Comply with legal obligations</li>
                <li>Send promotional offers (with your consent)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">4.1 Service Partners</h3>
              <p className="text-gray-700 mb-4">
                We share necessary information with our partner laundromats and cleaning service providers to fulfill your orders. Partners are contractually obligated to protect your information.
              </p>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">4.2 Service Providers</h3>
              <p className="text-gray-700 mb-4">
                We use third-party services for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Payment processing (Stripe)</li>
                <li>SMS notifications (Twilio)</li>
                <li>Email communications</li>
                <li>Cloud hosting (Vercel, Supabase)</li>
                <li>Analytics (Google Analytics)</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">4.3 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">
                We may disclose your information if required by law, court order, or to protect our rights and safety.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Encrypted data transmission (SSL/TLS)</li>
                <li>Secure password storage (hashing and salting)</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
                <li>PCI-DSS compliant payment processing</li>
              </ul>
              <p className="text-gray-700 mb-4">
                However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Your Privacy Rights</h2>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">6.1 Access and Correction</h3>
              <p className="text-gray-700 mb-4">
                You can access and update your personal information through your account settings or by contacting us.
              </p>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">6.2 Data Deletion</h3>
              <p className="text-gray-700 mb-4">
                You can request deletion of your account and personal data. Some information may be retained for legal or legitimate business purposes.
              </p>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">6.3 Marketing Opt-Out</h3>
              <p className="text-gray-700 mb-4">
                You can opt out of promotional emails by clicking the unsubscribe link or contacting us. Transactional emails (order confirmations, etc.) cannot be opted out of.
              </p>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">6.4 California Privacy Rights (CCPA)</h3>
              <p className="text-gray-700 mb-4">
                California residents have additional rights including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Right to know what personal information is collected</li>
                <li>Right to delete personal information</li>
                <li>Right to opt-out of sale of personal information (we do not sell your information)</li>
                <li>Right to non-discrimination for exercising privacy rights</li>
              </ul>

              <h3 className="text-xl font-bold text-gray-900 mb-3 mt-6">6.5 GDPR Rights (European Users)</h3>
              <p className="text-gray-700 mb-4">
                European users have rights under GDPR including access, rectification, erasure, data portability, and objection to processing.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies and Tracking</h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Maintain your session and preferences</li>
                <li>Analyze usage patterns and improve our services</li>
                <li>Provide personalized content</li>
                <li>Enable third-party services</li>
              </ul>
              <p className="text-gray-700 mb-4">
                You can control cookies through your browser settings, but this may limit some functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700 mb-4">
                Our services are not directed to children under 18. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain your information for as long as necessary to provide services and comply with legal obligations. Order history is kept for 7 years for tax purposes. Account data is deleted within 30 days of account closure request.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Changes to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this Privacy Policy from time to time. We will notify you of significant changes via email or prominent notice on our website. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                For questions or concerns about this Privacy Policy or to exercise your privacy rights, contact us:
              </p>
              <ul className="list-none text-gray-700 mb-4">
                <li>Email: <a href="mailto:support@tidyhood.nyc" className="text-primary-600 hover:text-primary-700">support@tidyhood.nyc</a></li>
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
            <Link href="/terms" className="text-gray-400 hover:text-white">
              Terms
            </Link>
            <Link href="/privacy" className="text-white font-medium">
              Privacy
            </Link>
            <a href="mailto:support@tidyhood.nyc" className="text-gray-400 hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
