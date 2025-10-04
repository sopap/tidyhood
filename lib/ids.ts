import { randomBytes } from 'crypto'

/**
 * Generate a unique label code for laundry bags
 * Format: TH-XXXXXX (6 alphanumeric characters)
 */
export function generateLabelCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars like I, O, 0, 1
  let code = 'TH-'
  
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return code
}

/**
 * Generate a unique idempotency key
 */
export function generateIdempotencyKey(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Generate a short order ID for display (last 8 chars of UUID)
 */
export function shortOrderId(uuid: string): string {
  return uuid.slice(-8).toUpperCase()
}

/**
 * Format order ID for display
 */
export function formatOrderId(uuid: string): string {
  return `#${shortOrderId(uuid)}`
}
