'use client';

import { useState, useEffect } from 'react';
import { 
  useStripe, 
  useElements, 
  CardElement,
} from '@stripe/react-stripe-js';
import { logger } from '@/lib/logger';

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

interface Props {
  estimatedAmountCents: number;
  onPaymentMethodReady: (paymentMethodId: string) => void;
  onError: (error: string) => void;
  userId: string;
  serviceType?: 'CLEANING' | 'LAUNDRY';
}

export function StripePaymentCollector({
  estimatedAmountCents,
  onPaymentMethodReady,
  onError,
  userId,
  serviceType = 'LAUNDRY'
}: Props) {
  const stripe = useStripe();
  const elements = useElements();
  
  const [isLoading, setIsLoading] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  
  // Display amounts
  const estimateDisplay = (estimatedAmountCents / 100).toFixed(2);
  
  // Detect test mode
  const isTestMode = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_');
  
  // Load saved payment methods
  useEffect(() => {
    loadSavedCards();
  }, [userId]);
  
  // Auto-notify parent when saved card is selected
  useEffect(() => {
    if (selectedCardId && !showNewCard) {
      onPaymentMethodReady(selectedCardId);
    }
  }, [selectedCardId, showNewCard, onPaymentMethodReady]);
  
  // Auto-create payment method when card is complete
  useEffect(() => {
    if (showNewCard && cardComplete && !isLoading && stripe && elements) {
      const createPaymentMethod = async () => {
        setIsLoading(true);
        try {
          const cardElement = elements.getElement(CardElement);
          if (!cardElement) return;
          
          const { paymentMethod, error } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
          });
          
          if (error) {
            setCardError(error.message || 'Invalid card');
            onError(error.message || 'Invalid card');
          } else if (paymentMethod) {
            onPaymentMethodReady(paymentMethod.id);
          }
        } catch (error: any) {
          setCardError(error.message);
          onError(error.message);
        } finally {
          setIsLoading(false);
        }
      };
      
      createPaymentMethod();
    }
  }, [showNewCard, cardComplete, isLoading, stripe, elements, onPaymentMethodReady, onError]);
  
  const loadSavedCards = async () => {
    try {
      const response = await fetch('/api/payment/methods');
      if (response.ok) {
        const data = await response.json();
        setSavedCards(data.payment_methods || []);
        
        // Auto-select first saved card if available
        if (data.payment_methods && data.payment_methods.length > 0) {
          setSelectedCardId(data.payment_methods[0].id);
        } else {
          setShowNewCard(true);
        }
      }
    } catch (error) {
      logger.error({ 
        event: 'failed_to_load_saved_cards', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Fail gracefully - show new card form
      setShowNewCard(true);
    }
  };
  
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!stripe || !elements) {
      onError('Payment system not ready. Please refresh the page.');
      return;
    }
    
    setIsLoading(true);
    setCardError(null);
    
    try {
      // Use saved card
      if (selectedCardId && !showNewCard) {
        onPaymentMethodReady(selectedCardId);
        return;
      }
      
      // Create new payment method from card element
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card information not provided');
      }
      
      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!paymentMethod) {
        throw new Error('Failed to create payment method');
      }
      
      onPaymentMethodReady(paymentMethod.id);
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to process payment information';
      setCardError(errorMessage);
      onError(errorMessage);
      
      logger.error({
        event: 'payment_method_creation_failed',
        error: errorMessage,
        user_id: userId
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Test Mode Banner */}
      {isTestMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800 font-medium">
            🧪 Test Mode - Use test card: 4242 4242 4242 4242
          </p>
        </div>
      )}
      
      {/* Payment Setup Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">💳</span>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">
              Secure Your Booking
            </h3>
            <p className="text-sm text-blue-700 mb-2">
              We'll save your card to secure your booking. 
              <strong> You'll be charged $0.00 now</strong> and the exact amount after we weigh your items.
            </p>
            <p className="text-xs text-blue-600">
              Estimated cost: ${estimateDisplay}
            </p>
          </div>
        </div>
      </div>
      
      {/* Saved Cards */}
      {savedCards.length > 0 && !showNewCard && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Select Payment Method
          </label>
          
          {savedCards.map((card) => (
            <label
              key={card.id}
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedCardId === card.id
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment_method"
                  checked={selectedCardId === card.id}
                  onChange={() => setSelectedCardId(card.id)}
                  className="text-blue-600 focus:ring-2 focus:ring-blue-200"
                />
                <div>
                  <div className="font-medium capitalize">
                    {card.brand} •••• {card.last4}
                  </div>
                  <div className="text-sm text-gray-600">
                    Expires {card.exp_month.toString().padStart(2, '0')}/{card.exp_year}
                  </div>
                </div>
              </div>
            </label>
          ))}
          
          <button
            type="button"
            onClick={() => {
              setShowNewCard(true);
              setSelectedCardId(null);
            }}
            className="text-sm text-blue-600 hover:text-blue-700 underline"
          >
            + Use a different card
          </button>
        </div>
      )}
      
      {/* New Card Form */}
      {showNewCard && (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Card Information
          </label>
          
          <div className="border border-gray-300 rounded-lg p-3 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#1f2937',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    '::placeholder': {
                      color: '#9ca3af',
                    },
                  },
                  invalid: {
                    color: '#dc2626',
                  },
                },
                hidePostalCode: true,
              }}
              onChange={(e) => {
                setCardComplete(e.complete);
                setCardError(e.error?.message || null);
              }}
            />
          </div>
          
          {cardError && (
            <p className="text-sm text-red-600" role="alert">
              {cardError}
            </p>
          )}
          
          {savedCards.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setShowNewCard(false);
                setSelectedCardId(savedCards[0].id);
                setCardError(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              ← Use saved card
            </button>
          )}
        </div>
      )}
      
      {/* Security Notice */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span>Secured by Stripe • PCI compliant • Your card info is never stored on our servers</span>
      </div>
      
      {/* Payment Process Explanation */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 text-sm mb-2">
          How Payment Works
        </h4>
        <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
          <li>We save your card now to secure your booking ($0.00 charged today)</li>
          {serviceType === 'CLEANING' ? (
            <li>After we complete your cleaning, we calculate the final cost based on time and services provided</li>
          ) : (
            <li>After pickup, we weigh your items and calculate the exact cost</li>
          )}
          <li>If within 20% of estimate, we charge automatically</li>
          <li>If significantly different, you'll approve the final amount first</li>
          <li>You'll receive an email receipt once charged</li>
        </ol>
      </div>
      
      {/* Hidden input for form integration */}
      <input
        type="hidden"
        value={selectedCardId || (cardComplete ? 'new_card' : '')}
        required
      />
    </div>
  );
}

/**
 * Hook to manage payment method collection
 */
export function useStripePaymentMethod() {
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const handlePaymentMethodReady = (id: string) => {
    setPaymentMethodId(id);
    setIsReady(true);
    setError(null);
  };
  
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsReady(false);
  };
  
  const reset = () => {
    setPaymentMethodId(null);
    setError(null);
    setIsReady(false);
  };
  
  return {
    paymentMethodId,
    error,
    isReady,
    handlePaymentMethodReady,
    handleError,
    reset
  };
}
