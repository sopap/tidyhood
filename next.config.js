/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicitly set env vars from .env.production to bypass Vercel dashboard warnings
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbymheksmnenurazuvjr.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieW1oZWtzbW5lbnVyYXp1dmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2MzExNDAsImV4cCI6MjA0NjIwNzE0MH0.SSbPkXHbwHjAz7L6uBTBs4NzfXcw4w4wHDax0BoB2ZA',
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyA3fgqYiv5a-a6T-cPDFeatGLi0Nkmkxgo',
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51SEadVS3pEwV8L0SNuBjxW9A0T1HyAFXPVXlY8xom1BkDE3oo8211Tug0y7jk4u0eLaCuFEo8g1HD8qgYhDMQt120QZTVfWZ8a',
    NEXT_PUBLIC_ALLOWED_ZIPS: process.env.NEXT_PUBLIC_ALLOWED_ZIPS || '10025,10026,10027,10029,10030,10031,10032,10035,10037,10039,10128',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'tidyhood.vercel.app',
          },
        ],
        destination: 'https://tidyhood.nyc/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
