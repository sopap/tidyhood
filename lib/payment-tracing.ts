/**
 * Payment Operation Tracing
 * 
 * Provides distributed tracing for payment operations to enable
 * debugging across Stripe, database, and application boundaries.
 * 
 * In production, this integrates with OpenTelemetry or similar.
 * In development, it uses structured logging.
 */

import { logger } from './logger';

export interface TraceContext {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  operation: string;
  service: string;
}

export interface TraceAttributes {
  [key: string]: string | number | boolean;
}

/**
 * Generate a unique trace ID
 */
function generateTraceId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate a unique span ID
 */
function generateSpanId(): string {
  return Math.random().toString(36).substring(7);
}

/**
 * Trace a payment operation with automatic timing and error capture
 * 
 * @param operationName - Name of the operation (e.g., 'payment.authorize', 'payment.capture')
 * @param attributes - Additional attributes to attach to the trace
 * @param fn - The function to execute
 * @returns The result of the function
 */
export async function tracePaymentOperation<T>(
  operationName: string,
  attributes: TraceAttributes,
  fn: () => Promise<T>
): Promise<T> {
  const trace_id = attributes.trace_id as string || generateTraceId();
  const span_id = generateSpanId();
  const startTime = Date.now();
  
  const context: TraceContext = {
    trace_id,
    span_id,
    parent_span_id: attributes.parent_span_id as string,
    operation: operationName,
    service: 'payment-service'
  };
  
  logger.info({
    event: 'trace_start',
    ...context,
    ...attributes,
    timestamp: new Date().toISOString()
  });
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    
    logger.info({
      event: 'trace_success',
      ...context,
      ...attributes,
      duration_ms: duration,
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error({
      event: 'trace_error',
      ...context,
      ...attributes,
      duration_ms: duration,
      status: 'error',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      error_stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

/**
 * Create a child span for nested operations
 * 
 * @param parentTraceId - Trace ID from parent operation
 * @param parentSpanId - Span ID from parent operation
 * @param operationName - Name of the child operation
 * @param attributes - Attributes for the child span
 * @param fn - The function to execute
 */
export async function traceChildOperation<T>(
  parentTraceId: string,
  parentSpanId: string,
  operationName: string,
  attributes: TraceAttributes,
  fn: () => Promise<T>
): Promise<T> {
  return tracePaymentOperation(
    operationName,
    {
      ...attributes,
      trace_id: parentTraceId,
      parent_span_id: parentSpanId
    },
    fn
  );
}

/**
 * Simplified trace wrapper for quick integration
 * 
 * @param operationName - Name of the operation
 * @param fn - The function to execute
 */
export async function trace<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  return tracePaymentOperation(operationName, {}, fn);
}

/**
 * Extract trace context from request headers (for distributed tracing)
 * 
 * @param headers - Request headers
 * @returns Trace context if available
 */
export function extractTraceContext(headers: Headers): Partial<TraceContext> | null {
  const traceId = headers.get('x-trace-id');
  const spanId = headers.get('x-span-id');
  
  if (!traceId) return null;
  
  return {
    trace_id: traceId,
    parent_span_id: spanId || undefined
  };
}

/**
 * Inject trace context into request headers
 * 
 * @param headers - Headers object to modify
 * @param context - Trace context to inject
 */
export function injectTraceContext(
  headers: Record<string, string>,
  context: TraceContext
): void {
  headers['x-trace-id'] = context.trace_id;
  headers['x-span-id'] = context.span_id;
  if (context.parent_span_id) {
    headers['x-parent-span-id'] = context.parent_span_id;
  }
}

/**
 * Get current trace context from async local storage (if available)
 * This is a placeholder for full OpenTelemetry integration
 */
export function getCurrentTraceContext(): Partial<TraceContext> | null {
  // In production, this would use AsyncLocalStorage or similar
  // For now, return null and rely on explicit context passing
  return null;
}

/**
 * Create a trace context for a new payment operation
 * 
 * @param operation - Operation name
 * @param orderId - Order ID associated with the operation
 * @returns New trace context
 */
export function createPaymentTraceContext(
  operation: string,
  orderId?: string
): TraceContext {
  return {
    trace_id: generateTraceId(),
    span_id: generateSpanId(),
    operation,
    service: 'payment-service',
    ...(orderId && { order_id: orderId } as any)
  };
}
