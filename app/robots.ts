import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://www.tidyhood.nyc'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/orders/',
          '/admin/',
          '/partner/',
          '/signup',
          '/login',
          '/book/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
