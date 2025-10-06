/**
 * Structured Logging with Pino
 * 
 * Provides JSON-structured logs with automatic PII redaction.
 * Use throughout the application instead of console.log/error.
 * 
 * Features:
 * - JSON-structured output for easy parsing
 * - Automatic correlation ID tracking
 * - PII field redaction
 * - Different log levels (trace, debug, info, warn, error, fatal)
 * - Pretty printing in development
 * 
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info({ orderId: '123', userId: '456' }, 'Order created')
 *   logger.error({ err }, 'Payment failed')
 */

import pino from 'pino'
import { env } from './env'

/**
 * PII fields that should be redacted from logs
 * Never log these fields in plain text
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
 * Redact PII fields from log objects
 */
function redactPII(key: string): string {
  const lowerKey = key.toLowerCase()
  if (PII_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
    return '[REDACTED]'
  }
  return key
}

/**
 * Create Pino logger instance
 */
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  
  // Redact PII fields
  redact: {
    paths: PII_FIELDS.map((field) => `*.${field}`),
    censor: '[REDACTED]',
  },

  // Base fields included in every log
  base: {
    env: env.NODE_ENV,
    service: 'tidyhood',
  },

  // Format timestamps in ISO 8601
  timestamp: pino.stdTimeFunctions.isoTime,

  // Pretty print in development for better DX
  transport: env.NODE_ENV === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,

  // Serializers for common objects
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
})

/**
 * Create a child logger with additional context
 * 
 * @example
 * const requestLogger = createLogger({ correlationId: req.id, userId: user.id })
 * requestLogger.info('Processing order')
 */
export function createLogger(bindings: Record<string, any>) {
  return logger.child(bindings)
}

/**
 * Create a logger for a specific API route
 * Automatically includes route information
 */
export function createRouteLogger(route: string, method: string, correlationId?: string) {
  return logger.child({
    route,
    method,
    correlationId,
  })
}

/**
 * Log levels:
 * 
 * - trace (10): Very detailed debugging information
 * - debug (20): Debugging information
 * - info (30): Informational messages (default in production)
 * - warn (40): Warning messages
 * - error (50): Error messages
 * - fatal (60): Fatal errors that cause the process to exit
 */

/**
 * Helper to measure execution time
 * 
 * @example
 * const end = startTimer()
 * await doSomething()
 * logger.info({ durationMs: end() }, 'Operation completed')
 */
export function startTimer(): () => number {
  const start = Date.now()
  return () => Date.now() - start
}

/**
 * Safe logging helper that ensures objects don't contain PII
 * Use this when you're unsure if an object might contain sensitive data
 */
export function logSafely(
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  obj: Record<string, any>,
  msg: string
) {
  const sanitized = Object.keys(obj).reduce((acc, key) => {
    const lowerKey = key.toLowerCase()
    if (PII_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
      acc[key] = '[REDACTED]'
    } else {
      acc[key] = obj[key]
    }
    return acc
  }, {} as Record<string, any>)

  logger[level](sanitized, msg)
}

/**
 * Flush logs before process exit
 * Call this in process handlers to ensure logs are written
 */
export async function flushLogs(): Promise<void> {
  return new Promise((resolve) => {
    logger.flush(() => resolve())
  })
}

/**
 * Log an error with full context
 * Includes stack trace and any additional context
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error(
    {
      err: error,
      ...context,
    },
    error.message
  )
}

/**
 * Log a business metric event
 * Use this for important business events that you want to track
 */
export function logMetric(
  metric: string,
  value: number,
  unit?: string,
  tags?: Record<string, string>
) {
  logger.info(
    {
      metric,
      value,
      unit,
      tags,
      type: 'metric',
    },
    `Metric: ${metric}`
  )
}

/**
 * Log an audit event
 * Use for security-sensitive operations that need to be audited
 */
export function logAudit(
  action: string,
  actor: string,
  resource: string,
  resourceId: string,
  result: 'success' | 'failure',
  metadata?: Record<string, any>
) {
  logger.info(
    {
      type: 'audit',
      action,
      actor,
      resource,
      resourceId,
      result,
      ...metadata,
    },
    `Audit: ${action} on ${resource}`
  )
}
