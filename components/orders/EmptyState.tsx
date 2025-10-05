import React from 'react';
import Link from 'next/link';

export default function EmptyState() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
      <div className="mb-3 text-5xl" aria-hidden="true">
        📦
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h2>
      <p className="text-sm text-gray-600 mb-6">
        Book your first pickup in under a minute.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-2">
        <Link
          href="/book/laundry"
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Book Laundry
        </Link>
        <Link
          href="/book/cleaning"
          className="rounded-lg border border-blue-300 px-6 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Book Cleaning
        </Link>
      </div>
    </div>
  );
}
