/**
 * Circuit Breaker for Stripe API
 * 
 * Prevents cascade failures when Stripe API is experiencing issues.
 * Implements the circuit breaker pattern with three states:
 * - CLOSED: Normal operation
 * - OPEN: Too many failures, reject requests immediately
 * - HALF_OPEN: Testing if service has recovered
 */

import { logger } from './logger';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;     // Number of failures before opening circuit
  successThreshold: number;     // Number of successes to close circuit
  timeout: number;              // How long to wait before trying again (ms)
  monitoringWindow: number;     // Time window for tracking failures (ms)
}

interface FailureRecord {
  timestamp: number;
  error: string;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: FailureRecord[] = [];
  private successes = 0;
  private nextAttemptTime = 0;
  
  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}
  
  /**
   * Execute a function with circuit breaker protection
   * 
   * @param fn - The function to execute
   * @returns The result of the function
   * @throws Error if circuit is OPEN
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check circuit state
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        const error = new Error(
          `Circuit breaker is OPEN for ${this.name}. Service temporarily unavailable.`
        );
        logger.warn({
          event: 'circuit_breaker_open',
          circuit: this.name,
          state: this.state,
          next_attempt: new Date(this.nextAttemptTime).toISOString()
        });
        throw error;
      }
      
      // Timeout elapsed, try half-open
      this.state = 'HALF_OPEN';
      this.successes = 0;
      
      logger.info({
        event: 'circuit_breaker_half_open',
        circuit: this.name
      });
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }
  
  /**
   * Handle successful execution
   */
  private onSuccess() {
    this.successes++;
    
    if (this.state === 'HALF_OPEN') {
      if (this.successes >= this.config.successThreshold) {
        // Enough successes, close the circuit
        this.state = 'CLOSED';
        this.failures = [];
        this.successes = 0;
        
        logger.info({
          event: 'circuit_breaker_closed',
          circuit: this.name
        });
      }
    } else if (this.state === 'CLOSED') {
      // Clean up old failures outside monitoring window
      const cutoff = Date.now() - this.config.monitoringWindow;
      this.failures = this.failures.filter(f => f.timestamp > cutoff);
    }
  }
  
  /**
   * Handle failed execution
   */
  private onFailure(error: any) {
    const failureRecord: FailureRecord = {
      timestamp: Date.now(),
      error: error.message || 'Unknown error'
    };
    
    this.failures.push(failureRecord);
    
    // Clean up old failures
    const cutoff = Date.now() - this.config.monitoringWindow;
    this.failures = this.failures.filter(f => f.timestamp > cutoff);
    
    // Check if we should open the circuit
    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN state reopens the circuit
      this.openCircuit();
    } else if (this.state === 'CLOSED') {
      // Check if failure threshold exceeded
      if (this.failures.length >= this.config.failureThreshold) {
        this.openCircuit();
      }
    }
  }
  
  /**
   * Open the circuit breaker
   */
  private openCircuit() {
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.config.timeout;
    this.successes = 0;
    
    logger.error({
      event: 'circuit_breaker_opened',
      circuit: this.name,
      failure_count: this.failures.length,
      recent_errors: this.failures.slice(-5).map(f => f.error),
      next_attempt: new Date(this.nextAttemptTime).toISOString()
    });
  }
  
  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }
  
  /**
   * Get circuit breaker stats
   */
  getStats() {
    return {
      state: this.state,
      failure_count: this.failures.length,
      success_count: this.successes,
      next_attempt: this.state === 'OPEN' ? new Date(this.nextAttemptTime).toISOString() : null,
      recent_failures: this.failures.slice(-10)
    };
  }
  
  /**
   * Manually reset the circuit breaker (for admin use)
   */
  reset() {
    this.state = 'CLOSED';
    this.failures = [];
    this.successes = 0;
    this.nextAttemptTime = 0;
    
    logger.info({
      event: 'circuit_breaker_reset',
      circuit: this.name
    });
  }
}

/**
 * Circuit breaker instance for Stripe API
 */
export const stripeCircuitBreaker = new CircuitBreaker('stripe-api', {
  failureThreshold: 5,      // Open circuit after 5 failures
  successThreshold: 3,       // Close circuit after 3 successes
  timeout: 60000,           // Wait 60 seconds before trying again
  monitoringWindow: 120000, // Track failures over 2 minute window
});

/**
 * Circuit breaker instance for Stripe Payment Intents specifically
 */
export const stripePaymentCircuitBreaker = new CircuitBreaker('stripe-payment-intents', {
  failureThreshold: 3,      // More sensitive for payment operations
  successThreshold: 2,       
  timeout: 30000,           // Wait 30 seconds
  monitoringWindow: 60000,  // 1 minute window
});

/**
 * Execute a Stripe API call with circuit breaker protection
 * 
 * @param fn - The Stripe API function to call
 * @param usePaymentBreaker - Use payment-specific circuit breaker (more sensitive)
 * @returns The result of the API call
 */
export async function executeWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  usePaymentBreaker = false
): Promise<T> {
  const breaker = usePaymentBreaker 
    ? stripePaymentCircuitBreaker 
    : stripeCircuitBreaker;
  
  return breaker.execute(fn);
}

/**
 * Check if Stripe API is available
 * 
 * @returns True if circuit is not OPEN
 */
export function isStripeAvailable(): boolean {
  return stripeCircuitBreaker.getState() !== 'OPEN';
}

/**
 * Check if Stripe Payment API is available
 * 
 * @returns True if payment circuit is not OPEN
 */
export function isStripePaymentAvailable(): boolean {
  return stripePaymentCircuitBreaker.getState() !== 'OPEN';
}

/**
 * Get health status for all circuit breakers
 */
export function getCircuitBreakerHealth() {
  return {
    stripe_api: stripeCircuitBreaker.getStats(),
    stripe_payment_api: stripePaymentCircuitBreaker.getStats(),
    all_healthy: isStripeAvailable() && isStripePaymentAvailable()
  };
}
