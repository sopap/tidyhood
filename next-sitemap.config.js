/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://www.tidyhood.nyc',
  generateRobotsTxt: false, // Using native Next.js robots.ts instead
  sitemapSize: 5000,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: [
    '/api/*',
    '/orders/*',
    '/admin/*',
    '/partner/*',
    '/signup',
    '/login',
    '/book/*',
    '/sitemap.xml', // Exclude the native sitemap
    '/robots.txt',  // Exclude the native robots
  ],
  additionalPaths: async (config) => {
    // Generate additional paths with custom metadata
    return [
      {
        loc: '/',
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/laundry',
        changefreq: 'weekly',
        priority: 0.9,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/cleaning',
        changefreq: 'weekly',
        priority: 0.9,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/services',
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/waitlist',
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/privacy',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString(),
      },
      {
        loc: '/terms',
        changefreq: 'monthly',
        priority: 0.5,
        lastmod: new Date().toISOString(),
      },
    ]
  },
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/orders/', '/admin/', '/partner/', '/signup', '/login', '/book/'],
      },
    ],
    additionalSitemaps: [
      'https://www.tidyhood.nyc/sitemap.xml',
    ],
  },
}
