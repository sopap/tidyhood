import React from 'react';
import Link from 'next/link';

export default function StickyActions() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 backdrop-blur md:hidden">
      <div className="flex gap-2">
        <Link
          href="/book/laundry"
          className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-center font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Book Laundry
        </Link>
        <Link
          href="/book/cleaning"
          className="flex-1 rounded-lg border border-blue-300 px-4 py-3 text-center font-semibold text-blue-700 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Book Cleaning
        </Link>
      </div>
    </div>
  );
}
