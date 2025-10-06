/**
 * Sentry Error Tracking Integration
 * 
 * Captures and tracks errors in production with context.
 * Automatically filters out PII and adds useful context.
 * 
 * Setup Instructions:
 * 1. Create a Sentry account at https://sentry.io
 * 2. Create a new Next.js project
 * 3. Copy the DSN to .env.local as SENTRY_DSN
 * 4. Set SENTRY_ENVIRONMENT (e.g., 'production', 'staging')
 * 
 * Usage:
 *   import { captureError, captureMessage } from '@/lib/sentry'
 *   try {
 *     // risky operation
 *   } catch (error) {
 *     captureError(error, { orderId: '123' })
 *   }
 */

import * as Sentry from '@sentry/nextjs'
import { env } from './env'

/**
 * PII fields that should NEVER be sent to Sentry
 */
const PII_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'creditCard',
  'ssn',
  'phone',
  'email',
  'address',
  'firstName',
  'lastName',
  'name',
  'dob',
  'birthdate',
]

/**
 * Initialize Sentry
 * Only initializes if SENTRY_DSN is configured
 */
export function initSentry() {
  if (!env.SENTRY_DSN) {
    console.warn('⚠️  Sentry DSN not configured - error tracking disabled')
    return
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    
    // Sample rate for transactions (0.0 to 1.0)
    tracesSampleRate: env.SENTRY_SAMPLE_RATE,

    // Don't send errors in development
    enabled: env.NODE_ENV === 'production',

    // These integrations are automatically enabled in @sentry/nextjs
    // No need to manually configure them

    // Filter out PII before sending
    beforeSend(event, hint) {
      // Redact PII from event data
      if (event.request) {
        event.request = redactPII(event.request)
      }
      if (event.user) {
        event.user = redactPII(event.user)
      }
      if (event.contexts) {
        event.contexts = redactPII(event.contexts)
      }
      if (event.extra) {
        event.extra = redactPII(event.extra)
      }
      
      return event
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome.runtime',
      // Network errors
      'NetworkError',
      'Failed to fetch',
      // User cancelled actions
      'AbortError',
      'The user aborted a request',
    ],

    // Tag releases for better tracking
    release: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
  })

  console.log('✅ Sentry initialized')
}

/**
 * Recursively redact PII from objects
 */
function redactPII(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(redactPII)
  }

  const redacted: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    if (PII_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]'
    } else if (value && typeof value === 'object') {
      redacted[key] = redactPII(value)
    } else {
      redacted[key] = value
    }
  }
  return redacted
}

/**
 * Capture an error with optional context
 * 
 * @param error The error to capture
 * @param context Additional context (will be filtered for PII)
 * @param level Error severity level
 * 
 * @example
 * captureError(error, { orderId: '123', userId: 'abc' }, 'error')
 */
export function captureError(
  error: Error,
  context?: Record<string, any>,
  level: Sentry.SeverityLevel = 'error'
) {
  if (!env.SENTRY_DSN) {
    console.error('Error:', error, 'Context:', context)
    return
  }

  Sentry.captureException(error, {
    level,
    extra: context ? redactPII(context) : undefined,
  })
}

/**
 * Capture a message (not an error)
 * Useful for logging important events or warnings
 * 
 * @example
 * captureMessage('Payment webhook received but order not found', {
 *   level: 'warning',
 *   context: { eventId: '123' }
 * })
 */
export function captureMessage(
  message: string,
  options?: {
    level?: Sentry.SeverityLevel
    context?: Record<string, any>
  }
) {
  if (!env.SENTRY_DSN) {
    console.log('Message:', message, 'Context:', options?.context)
    return
  }

  Sentry.captureMessage(message, {
    level: options?.level || 'info',
    extra: options?.context ? redactPII(options.context) : undefined,
  })
}

/**
 * Set user context for error tracking
 * IMPORTANT: Only set non-PII identifiers
 * 
 * @example
 * setUser({ id: user.id, role: user.role })
 */
export function setUser(user: { id: string; role?: string; [key: string]: any }) {
  if (!env.SENTRY_DSN) return

  Sentry.setUser({
    id: user.id,
    // Don't send PII like email, name, etc.
    ...redactPII(user),
  })
}

/**
 * Clear user context (call on logout)
 */
export function clearUser() {
  if (!env.SENTRY_DSN) return
  Sentry.setUser(null)
}

/**
 * Add breadcrumb for tracking user actions
 * Breadcrumbs help understand what led to an error
 * 
 * @example
 * addBreadcrumb({
 *   message: 'User clicked checkout button',
 *   category: 'user.action',
 *   level: 'info',
 *   data: { orderId: '123' }
 * })
 */
export function addBreadcrumb(breadcrumb: {
  message: string
  category?: string
  level?: Sentry.SeverityLevel
  data?: Record<string, any>
}) {
  if (!env.SENTRY_DSN) return

  Sentry.addBreadcrumb({
    ...breadcrumb,
    data: breadcrumb.data ? redactPII(breadcrumb.data) : undefined,
    timestamp: Date.now() / 1000,
  })
}

/**
 * Set custom tag for filtering errors in Sentry
 * 
 * @example
 * setTag('payment_provider', 'stripe')
 */
export function setTag(key: string, value: string) {
  if (!env.SENTRY_DSN) return
  Sentry.setTag(key, value)
}

/**
 * Set multiple tags at once
 */
export function setTags(tags: Record<string, string>) {
  if (!env.SENTRY_DSN) return
  Sentry.setTags(tags)
}

/**
 * Set extra context data
 * Will be filtered for PII
 */
export function setContext(name: string, context: Record<string, any>) {
  if (!env.SENTRY_DSN) return
  Sentry.setContext(name, redactPII(context))
}

/**
 * Start a span for performance monitoring
 * 
 * @example
 * await startSpan({ name: 'order.create', op: 'db.query' }, async (span) => {
 *   // ... do work
 * })
 */
export async function startSpan<T>(
  context: { name: string; op?: string },
  callback: (span: any) => Promise<T>
): Promise<T> {
  if (!env.SENTRY_DSN) {
    return callback(null)
  }
  
  return Sentry.startSpan(context, callback)
}

/**
 * Flush pending events
 * Call before process exit to ensure all events are sent
 */
export async function flush(timeout = 2000): Promise<boolean> {
  if (!env.SENTRY_DSN) return true
  return Sentry.flush(timeout)
}
