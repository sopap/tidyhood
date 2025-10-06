/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: NEXT_PUBLIC_* variables are automatically embedded by Next.js
  // No need for explicit env block - it can interfere with build-time embedding
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
