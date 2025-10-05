'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { fadeInUpVariants } from '@/lib/motionVariants'

export default function WaitlistPage() {
  const [formData, setFormData] = useState({
    email: '',
    zip_code: '',
    service_interest: 'both' as 'laundry' | 'cleaning' | 'both',
    message: '',
    honeypot: '' // Bot protection
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit')
      }

      setSuccess(true)
      setFormData({
        email: '',
        zip_code: '',
        service_interest: 'both',
        message: '',
        honeypot: ''
      })
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-3 md:py-4">
        <Link href="/" className="inline-block hover:opacity-80 transition-opacity">
          <Image 
            src="/logo.svg"
            alt="TidyHood"
            width={420}
            height={105}
            priority
            className="h-22 md:h-25 lg:h-28 w-auto"
          />
        </Link>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-12 pb-24 md:pb-12">
        <motion.div 
          className="max-w-2xl mx-auto"
          initial="hidden"
          animate="visible"
          variants={fadeInUpVariants}
        >
          {/* Hero Section */}
          <div className="text-center mb-8 md:mb-12">
            <div className="text-5xl md:text-6xl mb-4" role="img" aria-label="Celebration">🎉</div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Coming Soon to Your Area!
            </h1>
            <p className="text-lg md:text-xl text-text-secondary mb-2">
              We're expanding our laundry pickup and home cleaning services across NYC.
            </p>
            <p className="text-base md:text-lg text-text-tertiary">
              Join the waitlist and be the first to know when we launch in your neighborhood.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <motion.div 
              className="card bg-green-50 border-2 border-green-200 mb-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl" role="img" aria-label="Success">✅</span>
                <div>
                  <h3 className="font-bold text-lg text-green-900 mb-1">You're on the list!</h3>
                  <p className="text-sm text-green-800">
                    We'll notify you as soon as we expand to your area. Keep an eye on your inbox!
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Link href="/book/laundry" className="btn-secondary text-center">
                  View Current Service Areas
                </Link>
                <Link href="/" className="btn-outline text-center">
                  Back to Home
                </Link>
              </div>
            </motion.div>
          )}

          {/* Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="card">
              {/* Honeypot field - hidden from users, visible to bots */}
              <input
                type="text"
                name="honeypot"
                value={formData.honeypot}
                onChange={handleChange}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              <div className="space-y-5 md:space-y-6">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
                    placeholder="your.email@example.com"
                    disabled={loading}
                    aria-required="true"
                  />
                </div>

                {/* ZIP Code */}
                <div>
                  <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    id="zip_code"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleChange}
                    required
                    pattern="\d{5}"
                    maxLength={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
                    placeholder="10001"
                    disabled={loading}
                    aria-required="true"
                  />
                  <p className="mt-1 text-xs text-text-tertiary">Enter your 5-digit ZIP code</p>
                </div>

                {/* Service Interest */}
                <div>
                  <label htmlFor="service_interest" className="block text-sm font-medium text-gray-700 mb-2">
                    What service are you interested in? *
                  </label>
                  <select
                    id="service_interest"
                    name="service_interest"
                    value={formData.service_interest}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base bg-white"
                    disabled={loading}
                    aria-required="true"
                  >
                    <option value="both">Both Laundry & Cleaning</option>
                    <option value="laundry">Laundry Service Only</option>
                    <option value="cleaning">Home Cleaning Only</option>
                  </select>
                </div>

                {/* Optional Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Comments (Optional)
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base resize-none"
                    placeholder="Let us know if you have any special requests or questions..."
                    disabled={loading}
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Join waitlist"
                >
                  {loading ? 'Submitting...' : 'Join the Waitlist →'}
                </button>

                <p className="text-xs text-center text-text-tertiary">
                  We respect your privacy. Your email will only be used to notify you about our service launch.
                </p>
              </div>
            </form>
          )}

          {/* Benefits Section */}
          <div className="mt-8 md:mt-12 grid sm:grid-cols-2 gap-4 md:gap-6">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-white border border-gray-100">
              <span className="text-2xl flex-shrink-0" role="img" aria-label="Notification">🔔</span>
              <div>
                <h3 className="font-semibold mb-1">Be the First</h3>
                <p className="text-sm text-text-secondary">Get notified before public launch in your area</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-white border border-gray-100">
              <span className="text-2xl flex-shrink-0" role="img" aria-label="Discount">💰</span>
              <div>
                <h3 className="font-semibold mb-1">Early Bird Offer</h3>
                <p className="text-sm text-text-secondary">Exclusive discount for waitlist members</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-white border border-gray-100">
              <span className="text-2xl flex-shrink-0" role="img" aria-label="Feedback">💬</span>
              <div>
                <h3 className="font-semibold mb-1">Shape Our Service</h3>
                <p className="text-sm text-text-secondary">Share your needs and preferences</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-white border border-gray-100">
              <span className="text-2xl flex-shrink-0" role="img" aria-label="Priority">⭐</span>
              <div>
                <h3 className="font-semibold mb-1">Priority Access</h3>
                <p className="text-sm text-text-secondary">Skip the line when we launch</p>
              </div>
            </div>
          </div>

          {/* Current Service Areas Link */}
          <div className="mt-8 text-center">
            <p className="text-sm text-text-secondary mb-3">
              Already in our service area?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/book/laundry" className="btn-secondary">
                Book Laundry Service
              </Link>
              <Link href="/book/cleaning" className="btn-secondary">
                Book Cleaning Service
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-text-tertiary">
            <Link href="/" className="hover:text-primary-600">Home</Link>
            {' · '}
            <Link href="/services" className="hover:text-primary-600">Services</Link>
            {' · '}
            <a href="mailto:support@tidyhood.com" className="hover:text-primary-600">Contact</a>
          </p>
        </div>
      </footer>
    </div>
  )
}
