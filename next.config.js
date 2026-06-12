/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: No credential fallbacks here — Supabase/Stripe/Maps values MUST be
  // set as env vars (Vercel dashboard or .env.local). lib/env.ts validates at boot.
  env: {
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
