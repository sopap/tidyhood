import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-10 text-sm text-slate-600">
        {/* NAP Block */}
        <div className="flex flex-col gap-2 mb-6">
          <div>
            <strong className="text-base text-gray-900">Tidyhood</strong> — Harlem Laundry Pickup & Home Cleaning
          </div>
          <div>
            Service Area: Harlem, NYC (ZIPs 10026, 10027, 10030)
          </div>
          <div>
            Hours: Mon–Sun 8:00–20:00 • Phone:{' '}
            <a className="underline hover:text-primary-600" href="tel:+12125550123">
              +1 (212) 555-0123
            </a>
          </div>
          <div>
            Email:{' '}
            <a className="underline hover:text-primary-600" href="mailto:support@tidyhood.com">
              support@tidyhood.com
            </a>
          </div>
        </div>

        {/* Internal Links with Exact-Match Anchors */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <Link className="underline hover:text-primary-600" href="/laundry">
            Wash & Fold Laundry Delivery in Harlem
          </Link>
          <Link className="underline hover:text-primary-600" href="/cleaning">
            House Cleaning Service in Harlem
          </Link>
          <Link className="underline hover:text-primary-600" href="/services">
            All Services
          </Link>
          <Link className="underline hover:text-primary-600" href="/privacy">
            Privacy
          </Link>
          <Link className="underline hover:text-primary-600" href="/terms">
            Terms
          </Link>
        </div>

        {/* Copyright */}
        <div className="mt-8 text-xs text-slate-500">
          © {new Date().getFullYear()} Tidyhood. Supporting Harlem businesses.
        </div>
      </div>
    </footer>
  )
}
