/**
 * Site-wide structured data: Organization + WebSite only.
 *
 * Page-specific schema lives on the relevant page:
 * - Service schema on /laundry and /cleaning
 * - FAQPage schema on the homepage (matches visible FAQ content)
 * Keeping a single source per entity type avoids duplicate-schema conflicts
 * that make Google drop rich results.
 */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://tidyhood.nyc/#org",
      "name": "TidyHood",
      "url": "https://tidyhood.nyc",
      "logo": "https://tidyhood.nyc/logo.png",
      "description": "Professional laundry and home cleaning services in Harlem",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "171 W 131st St",
        "addressLocality": "New York",
        "addressRegion": "NY",
        "postalCode": "10027",
        "addressCountry": "US"
      },
      "telephone": "+1-917-272-8434",
      "email": "support@tidyhood.nyc",
      "sameAs": [
        "https://www.instagram.com/tidyhoodnyc",
        "https://www.facebook.com/tidyhoodnyc"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://tidyhood.nyc/#website",
      "url": "https://tidyhood.nyc",
      "name": "TidyHood",
      "publisher": {
        "@id": "https://tidyhood.nyc/#org"
      }
    }
  ]
}

export default function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
