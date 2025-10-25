/**
 * Guest Booking Validation Helpers
 * 
 * Validates guest contact information for orders placed without authentication.
 * Enforces E.164 phone format and proper email structure.
 */

/**
 * Validate email address format
 * Ensures basic email structure: local@domain.tld
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate phone number in E.164 international format
 * Format: +[country code][number]
 * Examples: +19171234567 (US), +442071234567 (UK), +33123456789 (FR)
 * 
 * Length: 11-15 digits total (including country code)
 */
export function isValidPhone(phone: string): boolean {
  // E.164 format: +[1-9][10-14 digits]
  const e164Regex = /^\+[1-9]\d{10,14}$/
  return e164Regex.test(phone)
}

/**
 * Comprehensive validation for guest booking information
 * 
 * @param guest_email - Guest email address
 * @param guest_phone - Guest phone in E.164 format
 * @param guest_name - Guest full name
 * @returns Validation result with error message if invalid
 */
export function validateGuestInfo(
  guest_email?: string | null,
  guest_phone?: string | null,
  guest_name?: string | null
): { valid: boolean; error?: string } {
  // All three fields are required for guest orders
  if (!guest_email || !guest_phone || !guest_name) {
    return {
      valid: false,
      error: 'Guest bookings require email, phone, and name'
    }
  }
  
  // Validate email format
  if (!isValidEmail(guest_email)) {
    return {
      valid: false,
      error: 'Invalid email address format'
    }
  }
  
  // Validate phone format (E.164)
  if (!isValidPhone(guest_phone)) {
    return {
      valid: false,
      error: 'Phone must be in E.164 format (e.g., +19171234567)'
    }
  }
  
  // Validate name length
  if (guest_name.trim().length < 2) {
    return {
      valid: false,
      error: 'Guest name must be at least 2 characters'
    }
  }
  
  // Additional validation: name shouldn't be just numbers
  if (/^\d+$/.test(guest_name.trim())) {
    return {
      valid: false,
      error: 'Guest name cannot be only numbers'
    }
  }
  
  return { valid: true }
}

/**
 * Validate UTM parameters structure
 * Ensures UTM params contain only expected keys with string values
 */
export function validateUTMParams(
  utm_params?: Record<string, string>
): { valid: boolean; error?: string } {
  if (!utm_params) {
    return { valid: true } // Optional field
  }
  
  const validKeys = ['source', 'medium', 'campaign', 'term', 'content']
  const providedKeys = Object.keys(utm_params)
  
  // Check for invalid keys
  const invalidKeys = providedKeys.filter(key => !validKeys.includes(key))
  if (invalidKeys.length > 0) {
    return {
      valid: false,
      error: `Invalid UTM parameters: ${invalidKeys.join(', ')}`
    }
  }
  
  // Check all values are strings
  for (const [key, value] of Object.entries(utm_params)) {
    if (typeof value !== 'string') {
      return {
        valid: false,
        error: `UTM parameter '${key}' must be a string`
      }
    }
    
    // Check reasonable length (prevent abuse)
    if (value.length > 200) {
      return {
        valid: false,
        error: `UTM parameter '${key}' exceeds maximum length`
      }
    }
  }
  
  return { valid: true }
}
