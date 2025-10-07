/**
 * Payment Error Classification and Handling
 * 
 * Classifies payment errors from Stripe into actionable categories
 * and provides user-friendly messages for each error type.
 */

import { logger } from './logger';

export type PaymentErrorType = 
  | 'card_declined'
  | 'insufficient_funds'
  | 'expired_card'
  | 'invalid_card'
  | 'network_error'
  | 'stripe_error'
  | 'quota_exceeded'
  | 'authentication_required'
  | 'processing_error'
  | 'unknown';

export interface ClassifiedPaymentError {
  type: PaymentErrorType;
  message: string;
  code?: string;
  isRetryable: boolean;
  userMessage: string;
  suggestedAction?: string;
}

/**
 * Classify a Stripe payment error into a structured format
 * 
 * @param error - The error object from Stripe or the application
 * @returns Classified error with user-friendly messaging
 */
export function classifyPaymentError(error: any): ClassifiedPaymentError {
  // Stripe card errors
  if (error.type === 'StripeCardError') {
    return classifyStripeCardError(error);
  }
  
  // Stripe rate limit errors
  if (error.type === 'StripeRateLimitError' || error.statusCode === 429) {
    return {
      type: 'quota_exceeded',
      message: 'Rate limit exceeded',
      code: error.code,
      isRetryable: true,
      userMessage: 'Our system is experiencing high volume. Please try again in a moment.',
      suggestedAction: 'Wait 30 seconds and retry'
    };
  }
  
  // Stripe connection errors (retryable)
  if (error.type === 'StripeConnectionError' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return {
      type: 'network_error',
      message: 'Connection error',
      code: error.code,
      isRetryable: true,
      userMessage: 'We\'re having trouble connecting to our payment processor. Please try again.',
      suggestedAction: 'Retry immediately'
    };
  }
  
  // Stripe API errors
  if (error.type === 'StripeAPIError') {
    return {
      type: 'stripe_error',
      message: error.message || 'Stripe API error',
      code: error.code,
      isRetryable: false,
      userMessage: 'We encountered a payment processing error. Please contact support.',
      suggestedAction: 'Contact support with order ID'
    };
  }
  
  // Stripe authentication errors
  if (error.type === 'StripeAuthenticationError') {
    return {
      type: 'stripe_error',
      message: 'Stripe authentication failed',
      code: error.code,
      isRetryable: false,
      userMessage: 'Payment system configuration error. Please contact support.',
      suggestedAction: 'Contact support immediately'
    };
  }
  
  // Unknown errors
  return {
    type: 'unknown',
    message: error.message || 'Unknown payment error',
    code: error.code,
    isRetryable: false,
    userMessage: 'An unexpected error occurred. Please try again or contact support.',
    suggestedAction: 'Retry once, then contact support'
  };
}

/**
 * Classify Stripe card errors specifically
 * 
 * @param error - Stripe card error
 * @returns Classified error
 */
function classifyStripeCardError(error: any): ClassifiedPaymentError {
  const code = error.code || error.decline_code;
  
  // Insufficient funds
  if (code === 'insufficient_funds') {
    return {
      type: 'insufficient_funds',
      message: error.message,
      code,
      isRetryable: false,
      userMessage: 'Your card was declined due to insufficient funds.',
      suggestedAction: 'Use a different payment method'
    };
  }
  
  // Expired card
  if (code === 'expired_card') {
    return {
      type: 'expired_card',
      message: error.message,
      code,
      isRetryable: false,
      userMessage: 'Your card has expired.',
      suggestedAction: 'Update card information'
    };
  }
  
  // Invalid card number
  if (code === 'invalid_number' || code === 'incorrect_number') {
    return {
      type: 'invalid_card',
      message: error.message,
      code,
      isRetryable: false,
      userMessage: 'The card number you entered is invalid.',
      suggestedAction: 'Re-enter card number'
    };
  }
  
  // Invalid CVC
  if (code === 'invalid_cvc' || code === 'incorrect_cvc') {
    return {
      type: 'invalid_card',
      message: error.message,
      code,
      isRetryable: false,
      userMessage: 'The security code (CVC) you entered is invalid.',
      suggestedAction: 'Re-enter CVC'
    };
  }
  
  // Card not supported
  if (code === 'card_not_supported') {
    return {
      type: 'card_declined',
      message: error.message,
      code,
      isRetryable: false,
      userMessage: 'This type of card is not supported.',
      suggestedAction: 'Use a different card'
    };
  }
  
  // Processing error
  if (code === 'processing_error') {
    return {
      type: 'processing_error',
      message: error.message,
      code,
      isRetryable: true,
      userMessage: 'There was an error processing your card. Please try again.',
      suggestedAction: 'Retry immediately'
    };
  }
  
  // 3D Secure authentication required
  if (code === 'authentication_required') {
    return {
      type: 'authentication_required',
      message: error.message,
      code,
      isRetryable: true,
      userMessage: 'Your card requires additional authentication.',
      suggestedAction: 'Complete 3D Secure challenge'
    };
  }
  
  // Generic card declined
  return {
    type: 'card_declined',
    message: error.message,
    code,
    isRetryable: false,
    userMessage: 'Your card was declined. Please try a different payment method.',
    suggestedAction: 'Use a different card or contact your bank'
  };
}

/**
 * Log a payment error with full context
 * 
 * @param error - The error object
 * @param orderId - The order ID associated with the error
 * @param operation - The operation that failed (e.g., 'authorize', 'capture')
 * @param additionalContext - Any additional context to log
 * @returns The classified error
 */
export async function logPaymentError(
  error: any,
  orderId: string,
  operation: string,
  additionalContext?: Record<string, any>
): Promise<ClassifiedPaymentError> {
  const classified = classifyPaymentError(error);
  
  logger.error({
    event: 'payment_error',
    operation,
    order_id: orderId,
    error_type: classified.type,
    error_code: classified.code,
    error_message: classified.message,
    user_message: classified.userMessage,
    is_retryable: classified.isRetryable,
    suggested_action: classified.suggestedAction,
    ...additionalContext,
    stack: error.stack
  });
  
  return classified;
}

/**
 * Determine if an error should trigger a retry
 * 
 * @param error - The classified error
 * @param attemptNumber - Current attempt number (0-indexed)
 * @param maxRetries - Maximum number of retries allowed
 * @returns True if should retry
 */
export function shouldRetry(
  error: ClassifiedPaymentError,
  attemptNumber: number,
  maxRetries: number
): boolean {
  // Don't retry if not retryable
  if (!error.isRetryable) {
    return false;
  }
  
  // Don't retry if max attempts reached
  if (attemptNumber >= maxRetries) {
    return false;
  }
  
  // Only retry specific error types
  const retryableTypes: PaymentErrorType[] = [
    'network_error',
    'quota_exceeded',
    'processing_error'
  ];
  
  return retryableTypes.includes(error.type);
}

/**
 * Create a user-facing error response
 * 
 * @param error - The classified error
 * @returns Object suitable for API response
 */
export function createErrorResponse(error: ClassifiedPaymentError) {
  return {
    error: error.userMessage,
    code: error.code || error.type,
    retryable: error.isRetryable,
    suggested_action: error.suggestedAction
  };
}

/**
 * Check if an error indicates a payment method issue
 * (as opposed to a system/network issue)
 * 
 * @param error - The classified error
 * @returns True if the issue is with the payment method
 */
export function isPaymentMethodIssue(error: ClassifiedPaymentError): boolean {
  const paymentMethodTypes: PaymentErrorType[] = [
    'card_declined',
    'insufficient_funds',
    'expired_card',
    'invalid_card'
  ];
  
  return paymentMethodTypes.includes(error.type);
}

/**
 * Get recommended action code for monitoring/metrics
 * 
 * @param error - The classified error
 * @returns Action code string
 */
export function getActionCode(error: ClassifiedPaymentError): string {
  if (error.isRetryable) {
    return 'RETRY';
  }
  
  if (isPaymentMethodIssue(error)) {
    return 'UPDATE_PAYMENT_METHOD';
  }
  
  return 'CONTACT_SUPPORT';
}
