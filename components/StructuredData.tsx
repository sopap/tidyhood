const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://tidyhood.nyc/#org",
      "name": "TidyHood",
      "url": "https://tidyhood.nyc",
      "logo": "https://tidyhood.nyc/static/logo.png",
      "description": "Professional laundry and home cleaning services in Harlem",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Harlem",
        "addressRegion": "NY",
        "postalCode": "10027",
        "addressCountry": "US"
      },
      "telephone": "+1-917-272-8434",
      "email": "support@tidyhood.com",
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
    },
    {
      "@type": "Service",
      "@id": "https://tidyhood.nyc/#laundry",
      "name": "Wash & Fold Laundry Delivery in Harlem",
      "serviceType": "Laundry Service",
      "url": "https://tidyhood.nyc/laundry",
      "provider": {
        "@id": "https://tidyhood.nyc/#org"
      },
      "areaServed": [
        {
          "@type": "PostalCodeArea",
          "postalCode": "10026"
        },
        {
          "@type": "PostalCodeArea",
          "postalCode": "10027"
        },
        {
          "@type": "PostalCodeArea",
          "postalCode": "10030"
        }
      ],
      "offers": {
        "@type": "Offer",
        "price": "1.75",
        "priceCurrency": "USD",
        "priceSpecification": {
          "@type": "UnitPriceSpecification",
          "price": "1.75",
          "priceCurrency": "USD",
          "unitText": "per pound"
        }
      }
    },
    {
      "@type": "Service",
      "@id": "https://tidyhood.nyc/#cleaning",
      "name": "House Cleaning Service in Harlem",
      "serviceType": "House Cleaning",
      "url": "https://tidyhood.nyc/cleaning",
      "provider": {
        "@id": "https://tidyhood.nyc/#org"
      },
      "areaServed": [
        {
          "@type": "PostalCodeArea",
          "postalCode": "10026"
        },
        {
          "@type": "PostalCodeArea",
          "postalCode": "10027"
        },
        {
          "@type": "PostalCodeArea",
          "postalCode": "10030"
        }
      ],
      "offers": {
        "@type": "AggregateOffer",
        "lowPrice": "89",
        "highPrice": "219",
        "priceCurrency": "USD"
      }
    },
    {
      "@type": "FAQPage",
      "@id": "https://tidyhood.nyc/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Do you offer same-day laundry pickup in Harlem?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Schedule before 11 AM for same-day pickup in most Harlem ZIP codes (10026, 10027, 10030)."
          }
        },
        {
          "@type": "Question",
          "name": "Are TidyHood cleaners background-checked?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Every cleaner passes comprehensive background checks and quality assessments before joining our team."
          }
        },
        {
          "@type": "Question",
          "name": "What areas in Harlem do you serve?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We serve all of Harlem including Central Harlem, South Harlem, and Morningside Heights - ZIP codes 10026, 10027, and 10030."
          }
        }
      ]
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://tidyhood.nyc/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Wash & Fold Laundry Delivery in Harlem",
          "item": "https://tidyhood.nyc/laundry"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "House Cleaning Service in Harlem",
          "item": "https://tidyhood.nyc/cleaning"
        }
      ]
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
