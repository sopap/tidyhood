import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import SiteFooter from '@/components/SiteFooter'
import StructuredData from '@/components/StructuredData'

// Get allowed ZIP codes for metadata
const allowedZips = process.env.NEXT_PUBLIC_ALLOWED_ZIPS?.split(',').map(z => z.trim()) || ['10026', '10027', '10030']
const zipsDisplay = allowedZips.join(', ')

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: 'Tidyhood | Laundry & Cleaning Services in Harlem NYC',
    template: '%s | Tidyhood'
  },
  description: `Professional laundry and home cleaning services in Harlem (${zipsDisplay}). Wash & fold from $1.75/lb, house cleaning from $89. Same-day delivery available.`,
  keywords: ['harlem laundry service', 'harlem house cleaning', 'wash and fold nyc', 'home cleaning harlem', `laundry delivery ${allowedZips[0]}`, `cleaning service ${allowedZips[0]}`, 'harlem laundromat', 'apartment cleaning nyc'],
  authors: [{ name: 'Tidyhood' }],
  creator: 'Tidyhood',
  publisher: 'Tidyhood',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png',
  },
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
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'Tidyhood - Laundry & Cleaning Services in Harlem',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tidyhood | Laundry & Cleaning Services in Harlem NYC',
    description: 'Professional wash & fold and home cleaning in Harlem',
    creator: '@tidyhood',
    images: ['/logo.png'],
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
    google: 'pTZA51tnRnKHeNpZWye6cyOx-RQ4Gi2T6MHMzZA2kBs',
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
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-V30CGJ70W7"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-V30CGJ70W7');
            `,
          }}
        />
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
