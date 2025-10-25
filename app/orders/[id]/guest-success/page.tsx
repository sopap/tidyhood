'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Header } from '@/components/Header';

// Utility function to format time
const formatTime = (isoString: string) => {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

interface GuestOrder {
  id: string;
  service_type: 'LAUNDRY' | 'CLEANING';
  slot_start: string;
  slot_end: string;
  total_cents: number;
  order_details: {
    bedrooms?: number;
    bathrooms?: number;
    lbs?: number;
    deep?: boolean;
  };
  address_snapshot: {
    line1: string;
    line2?: string;
    city: string;
    zip: string;
    guest_name?: string;
    guest_email?: string;
    guest_phone?: string;
  };
  created_at: string;
}

export default function GuestSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [order, setOrder] = useState<GuestOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [accountError, setAccountError] = useState('');

  // If user is authenticated, redirect to regular order page
  useEffect(() => {
    if (!authLoading && user) {
      router.push(`/orders/${params.id}`);
    }
  }, [user, authLoading, params.id, router]);

  useEffect(() => {
    const isGuest = searchParams.get('guest') === 'true';
    
    // Only allow guest view if explicitly marked as guest
    if (!isGuest && !authLoading) {
      router.push('/login');
      return;
    }

    if (isGuest && !user) {
      fetchGuestOrder();
    }
  }, [searchParams, user, authLoading, params.id]);

  const fetchGuestOrder = async () => {
    try {
      setLoading(true);
      
      // We'll need a special endpoint that allows viewing guest orders without auth
      // For now, we'll use the regular endpoint but without auth requirement
      const response = await fetch(`/api/orders/${params.id}/guest`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load order');
      }

      const data = await response.json();
      
      // Verify this is actually a guest order (no user_id)
      if (data.user_id) {
        router.push('/login');
        return;
      }
      
      setOrder(data);
    } catch (err) {
      console.error('Error fetching guest order:', err);
      setError('Failed to load order details. Please check your email for order confirmation.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (password: string) => {
    if (!order?.address_snapshot.guest_email) return;

    try {
      setCreatingAccount(true);
      setAccountError('');

      // Create account
      const signupResponse = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: order.address_snapshot.guest_email,
          password,
          name: order.address_snapshot.guest_name || '',
        }),
      });

      if (!signupResponse.ok) {
        const error = await signupResponse.json();
        throw new Error(error.error || 'Failed to create account');
      }

      // Link order to new account
      const linkResponse = await fetch(`/api/orders/${params.id}/link-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: order.address_snapshot.guest_email,
        }),
      });

      if (!linkResponse.ok) {
        throw new Error('Account created but failed to link order');
      }

      // Success! Redirect to order page
      router.push(`/orders/${params.id}`);
    } catch (err: any) {
      setAccountError(err.message);
      setCreatingAccount(false);
    }
  };

  const getServiceLabel = () => {
    if (!order) return '';
    
    if (order.service_type === 'LAUNDRY') {
      return order.order_details.lbs 
        ? `Laundry Service (${order.order_details.lbs} lbs)` 
        : 'Laundry Service';
    }
    
    const br = order.order_details.bedrooms === 0 ? 'Studio' : `${order.order_details.bedrooms} BR`;
    const ba = `${order.order_details.bathrooms} BA`;
    const deep = order.order_details.deep ? ' · Deep Clean' : '';
    return `Cleaning · ${br}, ${ba}${deep}`;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your order...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-red-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Order</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link href="/" className="inline-block bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand-700 transition-colors">
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const guestEmail = order.address_snapshot.guest_email || '';
  const guestPhone = order.address_snapshot.guest_phone || '';
  const guestName = order.address_snapshot.guest_name || '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500 rounded-full mb-4 animate-bounce">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {order.service_type === 'LAUNDRY' ? 'Laundry' : 'Cleaning'} Confirmed! 🎉
            </h1>
            <p className="text-xl text-gray-600">
              Order <span className="font-mono font-semibold text-brand">#{order.id.slice(0, 8)}</span>
            </p>
          </div>

          {/* What Happens Next */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">📱</span>
              What Happens Next
            </h2>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Confirmation Sent</p>
                  <p className="text-sm text-gray-600">
                    We've sent a confirmation to <span className="font-medium">{guestEmail}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">SMS Updates</p>
                  <p className="text-sm text-gray-600">
                    You'll receive text updates at <span className="font-medium">{guestPhone}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">Partner Assigned</p>
                  <p className="text-sm text-gray-600">
                    A service partner will be assigned within 24 hours
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
                  ✓
                </div>
                <div>
                  <p className="font-medium text-gray-900">Service Scheduled</p>
                  <p className="text-sm text-gray-600">
                    {new Date(order.slot_start).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })} at {formatTime(order.slot_start)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Service</span>
                <span className="font-medium text-gray-900">{getServiceLabel()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date & Time</span>
                <span className="font-medium text-gray-900">
                  {new Date(order.slot_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {formatTime(order.slot_start)} - {formatTime(order.slot_end)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Address</span>
                <span className="font-medium text-gray-900 text-right">
                  {order.address_snapshot.line1}
                  {order.address_snapshot.line2 && <>, {order.address_snapshot.line2}</>}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-gray-900 font-semibold">Estimated Total</span>
                <span className="text-xl font-bold text-brand">
                  ${(order.total_cents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* 3 CTAs */}
          <div className="bg-white rounded-xl border-2 border-blue-200 shadow-lg p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
              Track Your Order in Real-Time
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Create an account to see live updates and manage your order
            </p>

            {/* Primary CTA - Create Account */}
            <button
              onClick={() => setShowAccountModal(true)}
              className="w-full bg-brand text-white font-semibold py-4 px-6 rounded-lg hover:bg-brand-700 transition-all shadow-md hover:shadow-lg mb-4 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Create Account to Track Order
            </button>

            {/* Benefits List */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Account Benefits:</p>
              <ul className="space-y-1 text-sm text-blue-800">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Real-time order tracking
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Book future services faster
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  View complete order history
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Manage payment methods
                </li>
              </ul>
            </div>

            {/* Secondary CTA - Continue as Guest */}
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-lg hover:bg-gray-200 transition-all mb-3"
            >
              Continue as Guest
            </button>

            <p className="text-sm text-gray-500 text-center mb-4">
              ✓ We'll text you all updates at {guestPhone}
            </p>

            {/* Tertiary CTA - Login */}
            <div className="text-center pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link 
                  href={`/login?returnTo=/orders/${params.id}&linkOrder=true`}
                  className="text-brand hover:text-brand-700 font-medium underline"
                >
                  Log in
                </Link>
              </p>
            </div>
          </div>

          {/* Support */}
          <div className="text-center text-sm text-gray-500">
            <p>
              Questions?{' '}
              <a 
                href={`mailto:support@tidyhood.nyc?subject=Order Support - ${order.id}&body=Hi, I need help with my order ${order.id}.`}
                className="text-brand hover:text-brand-700 underline"
              >
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Create Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowAccountModal(false);
                setAccountError('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h3>
            <p className="text-gray-600 mb-6">
              Set a password to track your order and book faster next time
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const password = formData.get('password') as string;
                handleCreateAccount(password);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={guestEmail}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={8}
                  placeholder="Enter a secure password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 8 characters
                </p>
              </div>

              {accountError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">{accountError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={creatingAccount}
                className="w-full bg-brand text-white font-semibold py-3 px-6 rounded-lg hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingAccount ? 'Creating Account...' : 'Create Account & Track Order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
