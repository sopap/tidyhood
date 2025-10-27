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
  
  // Load saved payment methods (only for authenticated users)
  useEffect(() => {
    if (userId) {
      loadSavedCards();
    } else {
      // Guest users - skip saved cards and show new card form
      setShowNewCard(true);
    }
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
  
  // State for progressive disclosure
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  
  return (
    <div className="space-y-6">
      {!showPaymentForm ? (
        /* Progressive Disclosure - Show button first */
        <div className="text-center py-8">
          <button
            type="button"
            onClick={() => setShowPaymentForm(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg px-12 py-4 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
          >
            <span>💳</span>
            <span>Save Card Securely</span>
          </button>
          
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>256-bit encryption</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Powered by Stripe</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>PCI compliant</span>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            💡 Your card is saved securely but not charged until service is complete
          </p>
        </div>
      ) : (
        /* Show actual payment form after click */
        <>
          {/* Final reassurance before form */}
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-green-900 font-semibold mb-2">
              ✓ Your card is securely saved (not charged)
            </p>
            <p className="text-xs text-green-700">
              We'll charge <strong>${estimateDisplay}</strong> only after we complete your service and confirm the final amount.
            </p>
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
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              256-bit SSL
            </span>
            <span>💯 Money-back guarantee</span>
          </div>
        </>
      )}
      
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
