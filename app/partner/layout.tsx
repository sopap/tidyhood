import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/db';
import Link from 'next/link';

export const metadata = {
  title: 'Partner Portal | TidyHood',
  description: 'TidyHood partner portal for managing orders and deliveries',
};

async function getPartner(userId: string, userEmail: string) {
  const db = getServiceClient();
  const { data } = await db
    .from('partners')
    .select('id, name, service_type, active')
    .or(`profile_id.eq.${userId},contact_email.eq.${userEmail}`)
    .single();
  return data;
}

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/partner/login');
  }

  // Redirect if not partner role
  if (user.role !== 'partner') {
    redirect('/orders?message=You do not have partner access');
  }

  // Get partner information
  const partner = await getPartner(user.id, user.email || '');

  if (!partner) {
    redirect('/partner/login?error=Partner record not found');
  }

  if (!partner.active) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-yellow-500 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Account Inactive
            </h2>
            <p className="text-gray-600 mb-6">
              Your partner account is currently inactive. Please contact support to reactivate your account.
            </p>
            <a
              href="mailto:support@tidyhood.com"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/partner" className="flex items-center space-x-2">
                <span className="text-xl font-bold text-blue-600">TidyHood</span>
                <span className="text-sm text-gray-500 hidden sm:inline">Partner Portal</span>
              </Link>
              <nav className="hidden md:flex space-x-1">
                <Link
                  href="/partner"
                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/partner/orders"
                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Orders
                </Link>
                <Link
                  href="/partner/capacity"
                  className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition"
                >
                  Capacity
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{partner.name}</p>
                  <p className="text-xs text-gray-500">{partner.service_type}</p>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-200 hidden sm:block" />
              <form action="/api/auth/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200">
          <nav className="flex space-x-1 px-4 py-2 overflow-x-auto">
            <Link
              href="/partner"
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
            >
              Dashboard
            </Link>
            <Link
              href="/partner/orders"
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
            >
              Orders
            </Link>
            <Link
              href="/partner/capacity"
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap"
            >
              Capacity
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <p>&copy; 2025 TidyHood. All rights reserved.</p>
            <a
              href="mailto:support@tidyhood.com"
              className="hover:text-gray-700"
            >
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
