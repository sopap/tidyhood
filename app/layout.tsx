import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import SiteFooter from '@/components/SiteFooter'
import StructuredData from '@/components/StructuredData'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Tidyhood | Laundry & Cleaning Services in Harlem NYC',
    template: '%s | Tidyhood'
  },
  description: 'Professional laundry and home cleaning services in Harlem (10026, 10027, 10030). Wash & fold from $1.75/lb, house cleaning from $89. Same-day delivery available.',
  keywords: ['harlem laundry service', 'harlem house cleaning', 'wash and fold nyc', 'home cleaning harlem', 'laundry delivery 10027', 'cleaning service 10026', 'harlem laundromat', 'apartment cleaning nyc'],
  authors: [{ name: 'Tidyhood' }],
  creator: 'Tidyhood',
  publisher: 'Tidyhood',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Tidyhood | Laundry & Cleaning Services in Harlem NYC',
    description: 'Professional wash & fold and home cleaning delivered to your door in Harlem. Same-day service available.',
    url: '/',
    siteName: 'Tidyhood',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tidyhood | Laundry & Cleaning Services in Harlem NYC',
    description: 'Professional wash & fold and home cleaning in Harlem',
    creator: '@tidyhood',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <StructuredData />
      </head>
      <body>
        <AuthProvider>
          {children}
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  )
}
