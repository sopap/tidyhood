/**
 * Standard API Response Helpers
 * 
 * Provides consistent response formatting across all API routes.
 * Ensures every response includes a correlation ID for tracing.
 * 
 * Usage:
 *   return apiSuccess(data, { correlationId: req.headers.get('x-correlation-id') })
 *   return apiError('Not found', 404, { correlationId, code: 'NOT_FOUND' })
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Standard error response format
 */
export interface ApiErrorResponse {
  error: string
  code?: string
  correlationId: string
  details?: any
  timestamp: string
}

/**
 * Standard success response format
 */
export interface ApiSuccessResponse<T = any> {
  data?: T
  correlationId: string
  timestamp: string
  [key: string]: any
}

/**
 * Get correlation ID from request headers (added by middleware)
 */
export function getCorrelationId(request: NextRequest): string {
  return request.headers.get('x-correlation-id') || crypto.randomUUID()
}

/**
 * Create a success response with standard format
 * 
 * @param data The response data
 * @param options Additional options
 * @returns NextResponse with standard success format
 * 
 * @example
 * return apiSuccess({ user: { id: '123', name: 'John' } }, {
 *   correlationId: getCorrelationId(request),
 *   status: 200
 * })
 */
export function apiSuccess<T = any>(
  data: T,
  options?: {
    correlationId?: string
    status?: number
    headers?: Record<string, string>
  }
): NextResponse {
  const response: ApiSuccessResponse<T> = {
    data,
    correlationId: options?.correlationId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    status: options?.status || 200,
    headers: {
      'X-Correlation-ID': response.correlationId,
      ...options?.headers,
    },
  })
}

/**
 * Create an error response with standard format
 * 
 * @param message Error message (user-friendly)
 * @param status HTTP status code
 * @param options Additional options
 * @returns NextResponse with standard error format
 * 
 * @example
 * return apiError('Order not found', 404, {
 *   correlationId: getCorrelationId(request),
 *   code: 'ORDER_NOT_FOUND',
 *   details: { orderId: '123' }
 * })
 */
export function apiError(
  message: string,
  status: number = 500,
  options?: {
    correlationId?: string
    code?: string
    details?: any
    headers?: Record<string, string>
  }
): NextResponse {
  const response: ApiErrorResponse = {
    error: message,
    code: options?.code,
    correlationId: options?.correlationId || crypto.randomUUID(),
    details: options?.details,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(response, {
    status,
    headers: {
      'X-Correlation-ID': response.correlationId,
      ...options?.headers,
    },
  })
}

/**
 * Common error codes for consistent error handling
 */
export const ErrorCodes = {
  // Authentication & Authorization
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Validation
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  
  // Payment
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_REQUIRED: 'PAYMENT_REQUIRED',
  INVALID_PAYMENT_METHOD: 'INVALID_PAYMENT_METHOD',
  
  // Business Logic
  SLOT_NOT_AVAILABLE: 'SLOT_NOT_AVAILABLE',
  SERVICE_UNAVAILABLE_ZIP: 'SERVICE_UNAVAILABLE_ZIP',
  ORDER_CANNOT_BE_CANCELLED: 'ORDER_CANNOT_BE_CANCELLED',
  
  // Server
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const

/**
 * Helper to create validation error response
 */
export function validationError(
  details: any,
  correlationId?: string
): NextResponse {
  return apiError('Validation failed', 400, {
    correlationId,
    code: ErrorCodes.VALIDATION_FAILED,
    details,
  })
}

/**
 * Helper to create not found error response
 */
export function notFoundError(
  resource: string,
  correlationId?: string
): NextResponse {
  return apiError(`${resource} not found`, 404, {
    correlationId,
    code: ErrorCodes.NOT_FOUND,
  })
}

/**
 * Helper to create unauthorized error response
 */
export function unauthorizedError(correlationId?: string): NextResponse {
  return apiError('Unauthorized', 401, {
    correlationId,
    code: ErrorCodes.UNAUTHORIZED,
  })
}

/**
 * Helper to create forbidden error response
 */
export function forbiddenError(correlationId?: string): NextResponse {
  return apiError('Forbidden', 403, {
    correlationId,
    code: ErrorCodes.FORBIDDEN,
  })
}

/**
 * Helper to create rate limit error response
 */
export function rateLimitError(
  retryAfter?: number,
  correlationId?: string
): NextResponse {
  return apiError('Too many requests', 429, {
    correlationId,
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
    details: retryAfter ? { retryAfter } : undefined,
    headers: retryAfter ? { 'Retry-After': retryAfter.toString() } : undefined,
  })
}

/**
 * Helper to create internal server error response
 */
export function internalError(correlationId?: string): NextResponse {
  return apiError('Internal server error', 500, {
    correlationId,
    code: ErrorCodes.INTERNAL_ERROR,
  })
}
