/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://tidyhood.nyc',
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: 'weekly',
  priority: 0.7,
  exclude: ['/api/*', '/orders/*', '/signup', '/login', '/book/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/orders/', '/signup', '/login', '/book/'],
      },
    ],
  },
}
