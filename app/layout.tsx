import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import SiteFooter from '@/components/SiteFooter'
import StructuredData from '@/components/StructuredData'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tidyhood.nyc'),
  title: {
    default: 'Tidyhood | Laundry & Home Cleaning in Manhattan, NYC',
    template: '%s | Tidyhood'
  },
  description: 'Born in Harlem, serving all of Manhattan. Wash & fold from $1.75/lb, house cleaning from $89. Free pickup & delivery, same-day options.',
  keywords: ['manhattan laundry service', 'harlem laundry service', 'wash and fold nyc', 'laundry pickup manhattan', 'home cleaning manhattan', 'house cleaning harlem', 'apartment cleaning nyc', 'laundry delivery nyc'],
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
    title: 'Tidyhood | Laundry & Home Cleaning in Manhattan, NYC',
    description: 'Born in Harlem, serving all of Manhattan. Wash & fold and home cleaning delivered to your door. Same-day service available.',
    url: '/',
    siteName: 'Tidyhood',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-card.png',
        width: 1200,
        height: 630,
        alt: 'Tidyhood - Laundry & Cleaning Services in Harlem',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tidyhood | Laundry & Home Cleaning in Manhattan, NYC',
    description: 'Born in Harlem, serving all of Manhattan. Wash & fold and home cleaning delivered.',
    images: ['/og-card.png'],
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
