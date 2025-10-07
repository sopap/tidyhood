'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

/**
 * SetupIntent Completion Page
 * 
 * Handles the redirect after SetupIntent confirmation.
 * This page is shown when:
 * 1. Customer completes 3DS authentication
 * 2. SetupIntent succeeds and card is saved
 * 3. Card validation ($0.01 charge) completes
 */
export default function SetupCompletePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const setupIntentClientSecret = searchParams.get('setup_intent_client_secret');
    const setupIntentStatus = searchParams.get('redirect_status');

    if (!setupIntentClientSecret) {
      setStatus('error');
      setMessage('Missing setup intent information');
      return;
    }

    // Handle different redirect statuses
    if (setupIntentStatus === 'succeeded') {
      setStatus('success');
      setMessage('Payment method saved successfully!');
      
      // Redirect to order page after 2 seconds
      setTimeout(() => {
        router.push(`/orders/${params.id}`);
      }, 2000);
    } else if (setupIntentStatus === 'processing') {
      setStatus('loading');
      setMessage('Processing your payment method...');
      
      // Poll for completion
      pollSetupIntentStatus(params.id);
    } else {
      setStatus('error');
      setMessage('Failed to save payment method. Please try again.');
    }
  }, [searchParams, params.id, router]);

  const pollSetupIntentStatus = async (orderId: string) => {
    let attempts = 0;
    const maxAttempts = 10;
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        const order = await response.json();
        
        if (order.saved_payment_method_id) {
          setStatus('success');
          setMessage('Payment method saved successfully!');
          setTimeout(() => {
            router.push(`/orders/${orderId}`);
          }, 2000);
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          setStatus('error');
          setMessage('Timeout waiting for confirmation. Please check your order.');
          setTimeout(() => {
            router.push(`/orders/${orderId}`);
          }, 3000);
        }
      } catch (error) {
        setStatus('error');
        setMessage('Error checking status. Please check your order.');
        setTimeout(() => {
          router.push(`/orders/${orderId}`);
        }, 3000);
      }
    };
    
    poll();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Processing...
            </h1>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Success!
            </h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">
              You'll be charged $0.00 now and the exact amount after service.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Redirecting to your order...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Payment Setup Failed
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push(`/orders/${params.id}`)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Order
            </button>
          </>
        )}
      </div>
    </div>
  );
}
