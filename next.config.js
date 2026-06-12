/** @type {import('next').NextConfig} */
const nextConfig = {
  // NOTE: No credential fallbacks here — Supabase/Stripe/Maps values MUST be
  // set as env vars (Vercel dashboard or .env.local). lib/env.ts validates at boot.
  env: {
    // Default: all of Manhattan (kept in sync with lib/service-area.ts MANHATTAN_ZIPS)
    NEXT_PUBLIC_ALLOWED_ZIPS: process.env.NEXT_PUBLIC_ALLOWED_ZIPS || '10001,10002,10003,10004,10005,10006,10007,10009,10010,10011,10012,10013,10014,10016,10017,10018,10019,10021,10022,10023,10024,10025,10026,10027,10028,10029,10030,10031,10032,10033,10034,10035,10036,10037,10038,10039,10040,10044,10065,10069,10075,10128,10280,10282',
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
      {
        // Canonical host: apex. Redirect www -> apex.
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.tidyhood.nyc',
          },
        ],
        destination: 'https://tidyhood.nyc/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
