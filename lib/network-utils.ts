/**
 * Network Utility Functions
 * Provides retry logic, timeout handling, and error categorization for API calls
 */

interface FetchOptions extends RequestInit {
  maxRetries?: number
  timeoutMs?: number
  retryOnStatus?: number[]
}

interface RetryOptions {
  maxRetries: number
  timeoutMs: number
  retryOnStatus: number[]
}

/**
 * Categorize error types for better handling
 */
export enum ErrorType {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown'
}

export interface CategorizedError {
  type: ErrorType
  message: string
  statusCode?: number
  retryable: boolean
  originalError: any
}

/**
 * Categorize an error for proper handling
 */
export function categorizeError(error: any, response?: Response): CategorizedError {
  // Network errors (no response)
  if (!response && (error.message?.includes('fetch') || error.message?.includes('network'))) {
    return {
      type: ErrorType.NETWORK,
      message: 'Network error. Please check your connection.',
      retryable: true,
      originalError: error
    }
  }

  // Timeout errors
  if (error.message === 'Timeout' || error.name === 'AbortError') {
    return {
      type: ErrorType.TIMEOUT,
      message: 'Request timed out. Please try again.',
      retryable: true,
      originalError: error
    }
  }

  // HTTP errors
  if (response) {
    const statusCode = response.status

    // Server errors (5xx) - retryable
    if (statusCode >= 500) {
      return {
        type: ErrorType.SERVER,
        message: 'Server error. Please try again.',
        statusCode,
        retryable: true,
        originalError: error
      }
    }

    // Client errors (4xx) - not retryable
    if (statusCode >= 400) {
      return {
        type: ErrorType.CLIENT,
        message: error.message || 'Request failed',
        statusCode,
        retryable: false,
        originalError: error
      }
    }
  }

  // Unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: error.message || 'An unknown error occurred',
    retryable: false,
    originalError: error
  }
}

/**
 * Fetch with automatic retry logic, timeout handling, and error categorization
 */
export async function fetchWithRetry(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    timeoutMs = 30000,
    retryOnStatus = [408, 429, 500, 502, 503, 504],
    ...fetchOptions
  } = options

  let lastError: CategorizedError | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      // Make the request
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Check if we should retry based on status code
      if (!response.ok && retryOnStatus.includes(response.status) && attempt < maxRetries - 1) {
        const retryAfter = response.headers.get('Retry-After')
        const delayMs = retryAfter 
          ? parseInt(retryAfter) * 1000 
          : Math.min(1000 * Math.pow(2, attempt), 10000) // Exponential backoff, max 10s

        await new Promise(resolve => setTimeout(resolve, delayMs))
        continue
      }

      return response
    } catch (error: any) {
      lastError = categorizeError(error)

      // Don't retry if error is not retryable
      if (!lastError.retryable || attempt >= maxRetries - 1) {
        throw lastError
      }

      // Exponential backoff before retry
      const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000)
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }

  throw lastError || new Error('Max retries exceeded')
}

/**
 * Helper for POST requests with automatic retry
 */
export async function postWithRetry<T = any>(
  url: string,
  data: any,
  options: Omit<FetchOptions, 'method' | 'body'> = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
    ...options,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw {
      type: ErrorType.SERVER,
      message: errorData.error || errorData.message || 'Request failed',
      statusCode: response.status,
      retryable: false,
      originalError: errorData
    }
  }

  return response.json()
}

/**
 * Helper for GET requests with automatic retry
 */
export async function getWithRetry<T = any>(
  url: string,
  options: Omit<FetchOptions, 'method'> = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    method: 'GET',
    ...options,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw {
      type: ErrorType.SERVER,
      message: errorData.error || errorData.message || 'Request failed',
      statusCode: response.status,
      retryable: false,
      originalError: errorData
    }
  }

  return response.json()
}

/**
 * Check if user is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Wait for online connection
 */
export function waitForOnline(timeoutMs: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      resolve()
      return
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener('online', onlineHandler)
      reject(new Error('Timeout waiting for connection'))
    }, timeoutMs)

    const onlineHandler = () => {
      clearTimeout(timeoutId)
      window.removeEventListener('online', onlineHandler)
      resolve()
    }

    window.addEventListener('online', onlineHandler)
  })
}

/**
 * Execute a function with offline detection and retry
 */
export async function executeWithOfflineHandling<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    waitForOnline?: boolean
  } = {}
): Promise<T> {
  const { maxRetries = 3, waitForOnline: shouldWait = true } = options

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Check if offline
      if (!isOnline()) {
        if (shouldWait) {
          await waitForOnline()
        } else {
          throw new Error('You are offline. Please check your connection.')
        }
      }

      return await fn()
    } catch (error: any) {
      const categorized = categorizeError(error)
      
      if (categorized.type === ErrorType.NETWORK && attempt < maxRetries - 1) {
        // Wait for online and retry
        if (shouldWait) {
          await waitForOnline().catch(() => {})
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }

      throw categorized
    }
  }

  throw new Error('Max retries exceeded')
}
