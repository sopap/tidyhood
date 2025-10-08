'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStripe } from '@stripe/react-stripe-js';
import { logger } from '@/lib/logger';

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * 3D Secure Authentication Completion Page
 * 
 * This page handles the redirect after a customer completes
 * 3D Secure authentication for their payment method.
 * 
 * Flow:
 * 1. Customer completes 3DS challenge
 * 2. Stripe redirects here with payment_intent_client_secret
 * 3. We retrieve PaymentIntent status
 * 4. If succeeded, redirect to order page
 * 5. If failed, show error and allow retry
 */
export default function AuthCompletePage({ params }: Props) {
  const router = useRouter();
  const stripe = useStripe();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function handleAuthCompletion() {
      const { id } = await params;
      setOrderId(id);
      
      if (!stripe) {
        return;
      }

      // Get client secret from URL
      const clientSecret = new URLSearchParams(window.location.search).get(
        'payment_intent_client_secret'
      );

      if (!clientSecret) {
        setStatus('error');
        setErrorMessage('Missing payment information. Please try booking again.');
        return;
      }

      try {
        // Retrieve PaymentIntent to check status
        const { paymentIntent, error } = await stripe.retrievePaymentIntent(clientSecret);

        if (error) {
          throw new Error(error.message);
        }

        if (!paymentIntent) {
          throw new Error('Payment intent not found');
        }

        logger.info({
          event: '3ds_auth_complete',
          order_id: id,
          payment_intent_id: paymentIntent.id,
          status: paymentIntent.status
        });

        // Check final status
        if (paymentIntent.status === 'requires_capture') {
          // Success - authorization complete
          setStatus('success');
          
          // Redirect to order page after 2 seconds
          setTimeout(() => {
            router.push(`/orders/${id}`);
          }, 2000);
          
        } else if (paymentIntent.status === 'requires_action') {
          // Still needs action - shouldn't happen but handle it
          setStatus('error');
          setErrorMessage('Additional authentication required. Please contact support.');
          
        } else if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
          // Failed
          setStatus('error');
          setErrorMessage('Payment authorization failed. Please try a different payment method.');
          
        } else {
          setStatus('error');
          setErrorMessage(`Unexpected payment status: ${paymentIntent.status}`);
        }

      } catch (error: any) {
        logger.error({
          event: '3ds_auth_error',
          order_id: id,
          error: error.message
        });
        
        setStatus('error');
        setErrorMessage(error.message || 'Failed to complete payment authorization');
      }
    }

    handleAuthCompletion();
  }, [stripe, params, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {status === 'processing' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Completing Authorization...
            </h2>
            <p className="text-gray-600">
              Please wait while we finalize your payment authorization.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Authorization Complete!
            </h2>
            <p className="text-gray-600 mb-4">
              Your booking is confirmed. Redirecting to your order...
            </p>
            <div className="animate-pulse text-sm text-gray-500">
              Redirecting in a moment...
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Authorization Failed
            </h2>
            <p className="text-gray-600 mb-6">
              {errorMessage || 'We were unable to complete payment authorization.'}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/book/laundry')}
                className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/orders')}
                className="w-full bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
              >
                View My Orders
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
