/**
 * Simple Console Logger (Pino Replacement)
 * 
 * Temporary replacement for Pino to avoid worker thread crashes.
 * Maintains the same API so all existing code works unchanged.
 * 
 * Features:
 * - Same interface as Pino
 * - PII redaction
 * - No worker threads = no crashes
 * - Easy to revert to Pino later
 */

import { env } from './env'

/**
 * PII fields that should be redacted from logs
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
 * Redact PII from an object
 */
function redactPII(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(redactPII)
  }

  const redacted: any = {}
  for (const key in obj) {
    const lowerKey = key.toLowerCase()
    if (PII_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]'
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      redacted[key] = redactPII(obj[key])
    } else {
      redacted[key] = obj[key]
    }
  }
  return redacted
}

/**
 * Format log message with metadata
 */
function formatLog(level: string, obj: any, msg?: string): string {
  const timestamp = new Date().toISOString()
  const env_name = env.NODE_ENV || 'development'
  
  const logData = {
    level,
    time: timestamp,
    env: env_name,
    service: 'tidyhood',
    ...(typeof obj === 'object' ? redactPII(obj) : {}),
    ...(msg && { msg }),
  }
  
  return JSON.stringify(logData, null, 2)
}

/**
 * Simple console-based logger with Pino-compatible API
 */
class ConsoleLogger {
  trace(obj: any, msg?: string) {
    if (env.NODE_ENV === 'development') {
      console.log('[TRACE]', formatLog('trace', obj, msg))
    }
  }

  debug(obj: any, msg?: string) {
    if (env.NODE_ENV === 'development') {
      console.log('[DEBUG]', formatLog('debug', obj, msg))
    }
  }

  info(obj: any, msg?: string) {
    console.log('[INFO]', formatLog('info', obj, msg))
  }

  warn(obj: any, msg?: string) {
    console.warn('[WARN]', formatLog('warn', obj, msg))
  }

  error(obj: any, msg?: string) {
    console.error('[ERROR]', formatLog('error', obj, msg))
  }

  fatal(obj: any, msg?: string) {
    console.error('[FATAL]', formatLog('fatal', obj, msg))
  }

  child(bindings: Record<string, any>) {
    // Return a new logger with additional context
    return new ChildLogger(bindings)
  }

  flush(callback?: () => void) {
    // Console.log is synchronous, so just call callback immediately
    if (callback) callback()
  }
}

/**
 * Child logger that includes additional context
 */
class ChildLogger {
  private bindings: Record<string, any>

  constructor(bindings: Record<string, any>) {
    this.bindings = bindings
  }

  private mergeContext(obj: any) {
    return { ...this.bindings, ...obj }
  }

  trace(obj: any, msg?: string) {
    logger.trace(this.mergeContext(obj), msg)
  }

  debug(obj: any, msg?: string) {
    logger.debug(this.mergeContext(obj), msg)
  }

  info(obj: any, msg?: string) {
    logger.info(this.mergeContext(obj), msg)
  }

  warn(obj: any, msg?: string) {
    logger.warn(this.mergeContext(obj), msg)
  }

  error(obj: any, msg?: string) {
    logger.error(this.mergeContext(obj), msg)
  }

  fatal(obj: any, msg?: string) {
    logger.fatal(this.mergeContext(obj), msg)
  }
}

/**
 * Export the logger instance
 */
export const logger = new ConsoleLogger()

/**
 * Create a child logger with additional context
 */
export function createLogger(bindings: Record<string, any>) {
  return logger.child(bindings)
}

/**
 * Create a logger for a specific API route
 */
export function createRouteLogger(route: string, method: string, correlationId?: string) {
  return logger.child({
    route,
    method,
    correlationId,
  })
}

/**
 * Helper to measure execution time
 */
export function startTimer(): () => number {
  const start = Date.now()
  return () => Date.now() - start
}

/**
 * Safe logging helper
 */
export function logSafely(
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  obj: Record<string, any>,
  msg: string
) {
  logger[level](obj, msg)
}

/**
 * Flush logs (no-op for console logger)
 */
export async function flushLogs(): Promise<void> {
  return Promise.resolve()
}

/**
 * Log an error with full context
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error(
    {
      err: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
    },
    error.message
  )
}

/**
 * Log a business metric event
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
