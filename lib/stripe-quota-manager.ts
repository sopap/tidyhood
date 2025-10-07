/**
 * Stripe API Quota Manager
 * 
 * Manages Stripe API request quota to prevent hitting rate limits.
 * Stripe has a limit of 100 requests per second. This manager ensures
 * we stay below that limit through request queuing and throttling.
 */

import { logger } from './logger';

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
}

class StripeQuotaManager {
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly MAX_REQUESTS_PER_SECOND = 95; // Leave 5 requests as buffer
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  
  /**
   * Execute a Stripe API call with quota management
   * 
   * @param fn - The Stripe API function to call
   * @returns Promise that resolves with the API result
   */
  async executeWithQuota<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        fn,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      this.queue.push(request);
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Process queued requests respecting rate limits
   */
  private async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      await this.waitForQuota();
      
      const request = this.queue.shift();
      if (!request) continue;
      
      this.requestCount++;
      
      try {
        const result = await request.fn();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
    
    this.processing = false;
  }
  
  /**
   * Wait until we have quota available
   */
  private async waitForQuota() {
    const now = Date.now();
    const elapsed = now - this.windowStart;
    
    // Reset window if 1 second has passed
    if (elapsed >= 1000) {
      this.requestCount = 0;
      this.windowStart = now;
      return;
    }
    
    // Check if we've hit the limit
    if (this.requestCount >= this.MAX_REQUESTS_PER_SECOND) {
      const waitTime = 1000 - elapsed;
      
      logger.warn({
        event: 'stripe_quota_throttle',
        request_count: this.requestCount,
        queue_length: this.queue.length,
        wait_time_ms: waitTime
      });
      
      // Wait for window to reset
      await this.sleep(waitTime);
      
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
  }
  
  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get current quota stats
   */
  getStats() {
    const now = Date.now();
    const elapsed = now - this.windowStart;
    const remainingQuota = this.MAX_REQUESTS_PER_SECOND - this.requestCount;
    
    return {
      request_count: this.requestCount,
      max_requests: this.MAX_REQUESTS_PER_SECOND,
      remaining_quota: remainingQuota,
      queue_length: this.queue.length,
      window_elapsed_ms: elapsed,
      window_remaining_ms: Math.max(0, 1000 - elapsed)
    };
  }
  
  /**
   * Check if quota is available without waiting
   */
  hasQuotaAvailable(): boolean {
    const now = Date.now();
    const elapsed = now - this.windowStart;
    
    // If window has reset, we have full quota
    if (elapsed >= 1000) {
      return true;
    }
    
    // Check if we're below the limit
    return this.requestCount < this.MAX_REQUESTS_PER_SECOND;
  }
}

/**
 * Global Stripe quota manager instance
 */
export const stripeQuota = new StripeQuotaManager();

/**
 * Execute a Stripe API call with automatic quota management
 * 
 * Usage:
 * ```typescript
 * const customer = await executeWithQuota(() => 
 *   stripe.customers.create({ email: 'user@example.com' })
 * );
 * ```
 * 
 * @param fn - The Stripe API function to execute
 * @returns The result of the API call
 */
export async function executeWithQuota<T>(fn: () => Promise<T>): Promise<T> {
  return stripeQuota.executeWithQuota(fn);
}

/**
 * Get current Stripe API quota status
 */
export function getQuotaStats() {
  return stripeQuota.getStats();
}

/**
 * Check if Stripe API quota is available
 */
export function hasQuotaAvailable(): boolean {
  return stripeQuota.hasQuotaAvailable();
}
