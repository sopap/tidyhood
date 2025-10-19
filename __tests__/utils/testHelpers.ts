/**
 * Test Helpers & Utilities
 * Common functions and utilities used across all test files
 */

import { randomBytes } from 'crypto';

// ============================================================================
// Test Data Generators
// ============================================================================

/**
 * Generate a unique test email
 */
export const generateTestEmail = (): string => {
  const randomId = randomBytes(4).toString('hex');
  return `test-${randomId}@tidyhood.test`;
};

/**
 * Generate a unique test user
 */
export const generateTestUser = () => {
  return {
    email: generateTestEmail(),
    password: 'Test123!@#',
    name: `Test User ${randomBytes(2).toString('hex')}`,
  };
};

/**
 * Generate a unique order ID
 */
export const generateOrderId = (): string => {
  return `order_test_${randomBytes(6).toString('hex')}`;
};

/**
 * Generate a test phone number
 */
export const generateTestPhone = (): string => {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const prefix = Math.floor(Math.random() * 900) + 100;
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `+1${areaCode}${prefix}${suffix}`;
};

// ============================================================================
// Test User Management
// ============================================================================

/**
 * Create a test user in the database
 * @returns Created user object with auth token
 */
export const createTestUser = async (userData?: Partial<{ email: string; password: string; name: string }>) => {
  const user = {
    email: userData?.email || generateTestEmail(),
    password: userData?.password || 'Test123!@#',
    name: userData?.name || 'Test User',
  };

  // TODO: Implement actual user creation
  // This should:
  // 1. Call signup API
  // 2. Return user object with auth token
  // 3. Store user ID for cleanup

  return {
    id: `user_${randomBytes(8).toString('hex')}`,
    ...user,
    authToken: `token_${randomBytes(16).toString('hex')}`,
  };
};

/**
 * Delete a test user from the database
 */
export const deleteTestUser = async (userId: string) => {
  // TODO: Implement actual user deletion
  // This should:
  // 1. Delete from auth.users
  // 2. Delete from profiles
  // 3. Delete related orders, payments, etc.
};

/**
 * Get auth token for a test user
 */
export const getAuthToken = async (user: { email: string; password: string }) => {
  // TODO: Implement actual login
  // This should:
  // 1. Call login API
  // 2. Extract auth token from response
  // 3. Return token for use in authenticated requests

  return `token_${randomBytes(16).toString('hex')}`;
};

// ============================================================================
// Test Order Management
// ============================================================================

/**
 * Create a test laundry order
 */
export const createTestLaundryOrder = async (userId: string, overrides?: any) => {
  const order = {
    service_type: 'LAUNDRY',
    weight_lbs: 15,
    pickup_date: '2025-12-01',
    pickup_time_slot: '09:00-11:00',
    delivery_date: '2025-12-03',
    delivery_time_slot: '14:00-16:00',
    address: {
      street: '123 Test St',
      city: 'New York',
      state: 'NY',
      zip: '10027',
    },
    ...overrides,
  };

  // TODO: Implement actual order creation
  return {
    id: generateOrderId(),
    user_id: userId,
    ...order,
    status: 'pending',
    total_cents: 2500,
    created_at: new Date().toISOString(),
  };
};

/**
 * Create a test cleaning order
 */
export const createTestCleaningOrder = async (userId: string, overrides?: any) => {
  const order = {
    service_type: 'CLEANING',
    cleaning_type: 'DEEP_CLEAN',
    bedrooms: 2,
    bathrooms: 1,
    square_feet: 1000,
    scheduled_date: '2025-12-01',
    scheduled_time_slot: '10:00-14:00',
    address: {
      street: '456 Clean Ave',
      city: 'New York',
      state: 'NY',
      zip: '10027',
    },
    ...overrides,
  };

  // TODO: Implement actual order creation
  return {
    id: generateOrderId(),
    user_id: userId,
    ...order,
    status: 'pending',
    total_cents: 15000,
    created_at: new Date().toISOString(),
  };
};

/**
 * Delete a test order
 */
export const deleteTestOrder = async (orderId: string) => {
  // TODO: Implement actual order deletion
  // This should:
  // 1. Delete order record
  // 2. Delete related payment records
  // 3. Delete related status history
};

// ============================================================================
// Database Utilities
// ============================================================================

/**
 * Clean up all test data
 * Call this in afterEach to ensure clean state
 */
export const cleanupTestData = async () => {
  // TODO: Implement comprehensive cleanup
  // This should:
  // 1. Delete all test users (email contains @tidyhood.test)
  // 2. Delete all test orders
  // 3. Delete all test webhook events
  // 4. Delete all test payment records
  // 5. Delete all test Stripe customers
};

/**
 * Reset database to known state
 * Call this in beforeAll to ensure consistent starting point
 */
export const resetTestDatabase = async () => {
  // TODO: Implement database reset
  // This should:
  // 1. Run cleanup
  // 2. Seed with any required test data
  // 3. Reset sequences/counters
};

// ============================================================================
// Time Utilities
// ============================================================================

/**
 * Get a future date string
 */
export const getFutureDate = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

/**
 * Get a past date string
 */
export const getPastDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

/**
 * Wait for a specified duration
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that a response matches expected structure
 */
export const assertResponseStructure = (response: any, expectedKeys: string[]) => {
  for (const key of expectedKeys) {
    if (!(key in response)) {
      throw new Error(`Expected response to have key: ${key}`);
    }
  }
};

/**
 * Assert that a date string is valid and in the future
 */
export const assertFutureDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  if (date <= now) {
    throw new Error(`Expected future date, got: ${dateString}`);
  }
};

/**
 * Assert that an amount matches expected value (handling floating point)
 */
export const assertMoneyAmount = (actual: number, expected: number, tolerance = 0.01) => {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(`Expected ${expected}, got ${actual} (diff: ${diff})`);
  }
};

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Generate mock Stripe payment method
 */
export const generateMockPaymentMethod = () => {
  return {
    id: `pm_test_${randomBytes(8).toString('hex')}`,
    type: 'card',
    card: {
      brand: 'visa',
      last4: '4242',
      exp_month: 12,
      exp_year: 2025,
    },
  };
};

/**
 * Generate mock Stripe charge
 */
export const generateMockCharge = (amount: number) => {
  return {
    id: `ch_test_${randomBytes(8).toString('hex')}`,
    amount,
    currency: 'usd',
    status: 'succeeded',
    paid: true,
    receipt_url: `https://receipt.stripe.com/test/${randomBytes(8).toString('hex')}`,
    receipt_number: `RCPT-${randomBytes(4).toString('hex').toUpperCase()}`,
  };
};

/**
 * Generate mock address
 */
export const generateMockAddress = () => {
  return {
    street: `${Math.floor(Math.random() * 9999)} Test St`,
    city: 'New York',
    state: 'NY',
    zip: '10027',
  };
};

// ============================================================================
// Environment Helpers
// ============================================================================

/**
 * Check if running in CI environment
 */
export const isCI = (): boolean => {
  return process.env.CI === 'true';
};

/**
 * Check if Stripe is configured for testing
 */
export const isStripeConfigured = (): boolean => {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith('sk_test_'));
};

/**
 * Check if Supabase is configured for testing
 */
export const isSupabaseConfigured = (): boolean => {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
};

/**
 * Skip test if environment is not configured
 */
export const skipIfNotConfigured = (configCheck: () => boolean, message: string) => {
  if (!configCheck()) {
    console.warn(`⚠️ Skipping test: ${message}`);
    return true;
  }
  return false;
};

// ============================================================================
// Export All
// ============================================================================

export default {
  // Data generators
  generateTestEmail,
  generateTestUser,
  generateOrderId,
  generateTestPhone,

  // User management
  createTestUser,
  deleteTestUser,
  getAuthToken,

  // Order management
  createTestLaundryOrder,
  createTestCleaningOrder,
  deleteTestOrder,

  // Database utilities
  cleanupTestData,
  resetTestDatabase,

  // Time utilities
  getFutureDate,
  getPastDate,
  wait,

  // Assertion helpers
  assertResponseStructure,
  assertFutureDate,
  assertMoneyAmount,

  // Mock data generators
  generateMockPaymentMethod,
  generateMockCharge,
  generateMockAddress,

  // Environment helpers
  isCI,
  isStripeConfigured,
  isSupabaseConfigured,
  skipIfNotConfigured,
};
