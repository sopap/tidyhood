/**
 * Custom error types for Partner Portal operations
 * Provides type-safe error handling with specific error types
 */

import { VALIDATION_MESSAGES } from './constants';

/**
 * Base error class for all partner-related errors
 */
export class PartnerError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PartnerError';
    Object.setPrototypeOf(this, PartnerError.prototype);
  }
}

/**
 * Quote validation error
 * Thrown when quote parameters don't meet validation requirements
 */
export class QuoteValidationError extends PartnerError {
  constructor(public errors: string[]) {
    super('Quote validation failed', 'QUOTE_VALIDATION_ERROR');
    this.name = 'QuoteValidationError';
    Object.setPrototypeOf(this, QuoteValidationError.prototype);
  }

  /**
   * Get formatted error message for display
   */
  getErrorMessage(): string {
    return this.errors.join(', ');
  }

  /**
   * Check if error is about quote amount
   */
  isAmountError(): boolean {
    return this.errors.some(
      e => e === VALIDATION_MESSAGES.QUOTE_TOO_LOW || 
           e === VALIDATION_MESSAGES.QUOTE_TOO_HIGH
    );
  }
}

/**
 * Invalid status transition error
 * Thrown when attempting an invalid status change
 */
export class InvalidTransitionError extends PartnerError {
  constructor(
    public fromStatus: string,
    public toStatus: string
  ) {
    super(
      `Cannot transition from ${fromStatus} to ${toStatus}`,
      'INVALID_TRANSITION'
    );
    this.name = 'InvalidTransitionError';
    Object.setPrototypeOf(this, InvalidTransitionError.prototype);
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return VALIDATION_MESSAGES.INVALID_TRANSITION;
  }
}

/**
 * Order not found error
 * Thrown when attempting to access an order that doesn't exist or isn't assigned to partner
 */
export class OrderNotFoundError extends PartnerError {
  constructor(public orderId: string) {
    super(`Order ${orderId} not found or not accessible`, 'ORDER_NOT_FOUND');
    this.name = 'OrderNotFoundError';
    Object.setPrototypeOf(this, OrderNotFoundError.prototype);
  }
}

/**
 * Quote already exists error
 * Thrown when attempting to submit a quote for an order that already has one
 */
export class QuoteExistsError extends PartnerError {
  constructor(public orderId: string) {
    super(`Order ${orderId} already has a quote`, 'QUOTE_EXISTS');
    this.name = 'QuoteExistsError';
    Object.setPrototypeOf(this, QuoteExistsError.prototype);
  }

  getUserMessage(): string {
    return 'This order already has a quote. Please refresh the page.';
  }
}

/**
 * Authorization error
 * Thrown when partner doesn't have permission for the action
 */
export class UnauthorizedError extends PartnerError {
  constructor(message: string = 'You do not have permission for this action') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Network/API error
 * Thrown when API requests fail
 */
export class ApiError extends PartnerError {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message, 'API_ERROR');
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return this.statusCode !== undefined && 
           this.statusCode >= 500 && 
           this.statusCode < 600;
  }

  getUserMessage(): string {
    if (this.statusCode === 404) {
      return 'The requested resource was not found.';
    }
    if (this.statusCode && this.statusCode >= 500) {
      return 'A server error occurred. Please try again.';
    }
    return 'An error occurred. Please try again.';
  }
}

/**
 * Type guard to check if error is a PartnerError
 */
export function isPartnerError(error: unknown): error is PartnerError {
  return error instanceof PartnerError;
}

/**
 * Type guard to check if error is a QuoteValidationError
 */
export function isQuoteValidationError(error: unknown): error is QuoteValidationError {
  return error instanceof QuoteValidationError;
}

/**
 * Type guard to check if error is an InvalidTransitionError
 */
export function isInvalidTransitionError(error: unknown): error is InvalidTransitionError {
  return error instanceof InvalidTransitionError;
}

/**
 * Type guard to check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Helper function to extract user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (isPartnerError(error)) {
    // Check for getUserMessage method
    if ('getUserMessage' in error && typeof error.getUserMessage === 'function') {
      return error.getUserMessage();
    }
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Helper function to log error for monitoring
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  console.error('[Partner Error]', {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(isPartnerError(error) ? { code: error.code } : {})
    } : error,
    context,
    timestamp: new Date().toISOString()
  });
}
