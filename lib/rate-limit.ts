/**
 * Simple in-memory rate limiting for login attempts
 * Prevents brute force attacks
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

const loginAttempts = new Map<string, RateLimitRecord>()

// Clean up expired records every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of loginAttempts.entries()) {
    if (now > record.resetAt) {
      loginAttempts.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Check if the identifier has exceeded the rate limit
 * @param identifier - Usually IP address or email
 * @param maxAttempts - Maximum number of attempts allowed (default: 5)
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now()
  const record = loginAttempts.get(identifier)

  // No record or record expired - allow and create new record
  if (!record || now > record.resetAt) {
    loginAttempts.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    })
    return true
  }

  // Check if max attempts exceeded
  if (record.count >= maxAttempts) {
    return false
  }

  // Increment count
  record.count++
  return true
}

/**
 * Reset rate limit for an identifier (e.g., after successful login)
 * @param identifier - Usually IP address or email
 */
export function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier)
}

/**
 * Get time until rate limit resets for an identifier
 * @param identifier - Usually IP address or email
 * @returns milliseconds until reset, or 0 if no rate limit active
 */
export function getTimeUntilReset(identifier: string): number {
  const record = loginAttempts.get(identifier)
  if (!record) return 0

  const now = Date.now()
  if (now > record.resetAt) return 0

  return record.resetAt - now
}

/**
 * Get remaining attempts for an identifier
 * @param identifier - Usually IP address or email
 * @param maxAttempts - Maximum number of attempts allowed (default: 5)
 * @returns number of remaining attempts
 */
export function getRemainingAttempts(
  identifier: string,
  maxAttempts: number = 5
): number {
  const record = loginAttempts.get(identifier)
  if (!record) return maxAttempts

  const now = Date.now()
  if (now > record.resetAt) return maxAttempts

  return Math.max(0, maxAttempts - record.count)
}
