# Payment Authorization System - Complete Implementation Guide

**Date**: October 7, 2025  
**Status**: Ready for Implementation  
**Estimated Time**: 56 hours + 1 week legal review  
**Risk Level**: Medium (with proper safeguards)

---

## Executive Summary

This document provides a complete implementation guide for adding payment authorization to TidyHood's laundry booking flow. The system will reduce no-shows from 10% to <5% while maintaining customer trust by not charging until after service.

### Business Problem
- Customers book laundry pickup but aren't home (10% no-show rate)
- No payment method on file = no recourse for wasted driver trips
- Lost revenue and poor operational efficiency

### Solution
**Authorization Hold + Smart Auto-Charge**
1. Authorize payment at booking (estimate + 30% buffer)
2. Auto-charge if final quote within ±20% of estimate
3. Request approval if variance exceeds threshold
4. Charge $25 no-show fee if customer unavailable

---

## Current System Review

### Existing Booking Flow
```
Customer → Book Laundry → Schedule Pickup → Partner Arrives → Weigh Items → 
Send Quote → Customer Approves → Payment → Service Completes
```

**Database**: Supabase (PostgreSQL)  
**Framework**: Next.js 14+ with TypeScript  
**Payment**: Stripe  
**Current Status Field**: `pending_pickup`, `at_facility`, `awaiting_payment`, `paid_processing`, `completed`

---

## Critical Technical Requirements

### 1. Saga Pattern (MANDATORY - Prevents Financial Loss)

**Problem**: Authorization succeeds on Stripe, but order creation fails in database
**Result**: Customer charged, no order exists → Customer dispute + refund + bad PR

**Solution**: Implement Saga Pattern

```typescript
// lib/payment-saga.ts
import { getServiceClient } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export class PaymentAuthorizationSaga {
  private sagaId: string;
  private steps: SagaStep[] = [];
  
  async execute(params: BookingParams): Promise<Order> {
    const db = getServiceClient();
    
    // Create saga record
    const { data: saga } = await db.from('payment_sagas').insert({
      type: 'payment_authorization',
      status: 'pending',
      params: params,
    }).select().single();
    
    this.sagaId = saga.id;
    
    try {
      // Step 1: Create order in DRAFT status
      const order = await this.createDraftOrder(params);
      this.recordStep('create_order', order.id);
      
      // Step 2: Authorize payment on Stripe
      const authResult = await this.authorizePayment(params, order);
      this.recordStep('authorize_payment', authResult.payment_intent_id);
      
      // Step 3: Finalize order
      const finalOrder = await this.finalizeOrder(order.id, authResult);
      this.recordStep('finalize_order', finalOrder.id);
      
      // Mark saga as complete
      await db.from('payment_sagas')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', this.sagaId);
      
      return finalOrder;
      
    } catch (error) {
      // Compensation logic - undo all steps
      await this.compensate(error);
      throw error;
    }
  }
  
  private async compensate(error: Error) {
    const db = getServiceClient();
    
    // Reverse steps in reverse order
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const step = this.steps[i];
      
      switch (step.type) {
        case 'authorize_payment':
          // Cancel Stripe authorization
          await stripe.paymentIntents.cancel(step.data);
          break;
          
        case 'create_order':
        case 'finalize_order':
          // Delete order from database
          await db.from('orders').delete().eq('id', step.data);
          break;
      }
    }
    
    // Mark saga as failed
    await db.from('payment_sagas').update({
      status: 'failed',
      error_message: error.message,
      completed_at: new Date().toISOString()
    }).eq('id', this.sagaId);
  }
  
  private recordStep(type: string, data: any) {
    this.steps.push({ type, data, timestamp: Date.now() });
  }
}
```

### 2. Stripe Quota Management (Prevents System Outage)

**Problem**: Stripe has 100 requests/second limit. Exceed it = all bookings fail

```typescript
// lib/stripe-quota-manager.ts
class StripeQuotaManager {
  private requestCount = 0;
  private windowStart = Date.now();
  private readonly MAX_REQUESTS_PER_SECOND = 95; // Leave 5 for buffer
  
  async executeWithQuota<T>(fn: () => Promise<T>): Promise<T> {
    await this.waitForQuota();
    this.requestCount++;
    
    try {
      return await fn();
    } finally {
      this.resetIfNeeded();
    }
  }
  
  private async waitForQuota() {
    const now = Date.now();
    const elapsed = now - this.windowStart;
    
    if (elapsed >= 1000) {
      // New window
      this.requestCount = 0;
      this.windowStart = now;
      return;
    }
    
    if (this.requestCount >= this.MAX_REQUESTS_PER_SECOND) {
      // Wait for window to reset
      const waitTime = 1000 - elapsed;
      await sleep(waitTime);
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
  }
  
  private resetIfNeeded() {
    if (Date.now() - this.windowStart >= 1000) {
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
  }
}

export const stripeQuota = new StripeQuotaManager();
```

### 3. Distributed Tracing (Essential for Debugging)

```typescript
// lib/payment-tracing.ts
import { trace, context } from '@opentelemetry/api';

export function tracePaymentOperation<T>(
  operationName: string,
  attributes: Record<string, string | number>,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('payment-service');
  
  return tracer.startActiveSpan(operationName, async (span) => {
    // Add attributes
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
    
    try {
      const result = await fn();
      span.setStatus({ code: 1 }); // OK
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: (error as Error).message }); // ERROR
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## Phase-by-Phase Implementation

### Phase -2: Legal & Compliance Review (1 week)

**CRITICAL**: Must complete before any code is deployed

**Checklist**:
- [ ] Update Terms of Service with authorization hold language
- [ ] Add clear disclosure of when charges occur
- [ ] Update Privacy Policy for payment data handling
- [ ] Review no-show fee legality in NY (and other states)
- [ ] Ensure PCI compliance documentation
- [ ] Get legal sign-off on all customer-facing language

**Key Legal Points**:
1. Authorization != Charge - must be clear
2. No-show fee must be disclosed prominently
3. Variance threshold must be in TOS
4. Right to dispute must be preserved

---

### Phase -1: Environment & Infrastructure (3h)

**File: `.env.local`** (Add these)
```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET_PAYMENT=whsec_...

# Feature Flags
ENABLE_PAYMENT_AUTH=false
PAYMENT_AUTH_PERCENTAGE=0
PAYMENT_AUTH_TEST_USERS=user_123,user_456

# Monitoring
SENTRY_DSN=https://...
OTEL_ENDPOINT=https://...
```

**Stripe Dashboard Configuration**:
1. Create webhook endpoint: `https://yourdomain.com/api/webhooks/stripe-payment`
2. Subscribe to events:
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `payment_intent.requires_action`
   - `charge.dispute.created`
3. Copy webhook secret to `.env.local`

**Staging Environment**:
```bash
# Use Stripe test mode
STRIPE_SECRET_KEY=sk_test_...

# Enable feature for all users in staging
ENABLE_PAYMENT_AUTH=true
PAYMENT_AUTH_PERCENTAGE=100
```

---

### Phase 0: Prerequisites (5h)

#### File 1: `lib/payment-config.ts`
```typescript
export const PAYMENT_CONFIG = {
  // Authorization buffer
  AUTHORIZATION_BUFFER_PCT: 30,
  
  // Auto-charge threshold
  VARIANCE_THRESHOLD_PCT: 20,
  
  // Service-specific maximums (to handle dry clean uncertainty)
  DRY_CLEAN_MAX_AUTH_CENTS: 30000, // $300
  WASH_FOLD_MAX_AUTH_CENTS: 15000, // $150
  MIXED_MAX_AUTH_CENTS: 40000,     // $400
  
  // No-show policy
  NO_SHOW_FEE_CENTS: 2500,         // $25
  NO_SHOW_GRACE_PERIOD_MIN: 30,    // 30 minutes after pickup window
  
  // Cancellation policy
  CANCELLATION_REFUND_HOURS: 2,    // Free cancel 2+ hours before
  
  // Stripe limits
  AUTH_EXPIRY_DAYS: 7,             // Stripe authorization expires
  AUTH_EXPIRY_WARNING_DAYS: 6,     // Send warning 1 day before
  
  // Retry configuration
  MAX_CAPTURE_RETRIES: 3,
  RETRY_DELAY_MS: [1000, 5000, 15000], // Exponential backoff
} as const;

export type ServiceCategory = 'wash_fold' | 'dry_clean' | 'mixed';

export function getMaxAuthorizationAmount(category: ServiceCategory): number {
  switch (category) {
    case 'dry_clean':
      return PAYMENT_CONFIG.DRY_CLEAN_MAX_AUTH_CENTS;
    case 'mixed':
      return PAYMENT_CONFIG.MIXED_MAX_AUTH_CENTS;
    case 'wash_fold':
    default:
      return PAYMENT_CONFIG.WASH_FOLD_MAX_AUTH_CENTS;
  }
}
```

#### File 2: `lib/feature-flags.ts`
```typescript
import crypto from 'crypto';

export interface FeatureConfig {
  enabled: boolean;
  percentage: number;
  testUsers: string[];
}

export const FEATURES = {
  PAYMENT_AUTHORIZATION: {
    enabled: process.env.ENABLE_PAYMENT_AUTH === 'true',
    percentage: parseInt(process.env.PAYMENT_AUTH_PERCENTAGE || '0'),
    testUsers: process.env.PAYMENT_AUTH_TEST_USERS?.split(',') || [],
  }
} as const;

function hashUserId(userId: string): number {
  const hash = crypto.createHash('md5').update(userId).digest('hex');
  return parseInt(hash.substring(0, 8), 16);
}

export function isFeatureEnabled(
  feature: keyof typeof FEATURES,
  userId: string
): boolean {
  const config = FEATURES[feature];
  
  if (!config.enabled) return false;
  
  // Test users always get the feature
  if (config.testUsers.includes(userId)) return true;
  
  // Percentage rollout (deterministic based on user ID)
  const hash = hashUserId(userId);
  return (hash % 100) < config.percentage;
}

export function canUsePaymentAuthorization(userId: string): boolean {
  return isFeatureEnabled('PAYMENT_AUTHORIZATION', userId);
}
```

#### File 3: `lib/payment-errors.ts`
```typescript
import { logger } from './logger';

export type PaymentErrorType = 
  | 'card_declined'
  | 'insufficient_funds'
  | 'expired_card'
  | 'network_error'
  | 'stripe_error'
  | 'quota_exceeded'
  | 'unknown';

export interface ClassifiedPaymentError {
  type: PaymentErrorType;
  message: string;
  code?: string;
  isRetryable: boolean;
  userMessage: string;
}

export function classifyPaymentError(error: any): ClassifiedPaymentError {
  // Stripe card errors
  if (error.type === 'StripeCardError') {
    const code = error.code;
    
    if (code === 'insufficient_funds') {
      return {
        type: 'insufficient_funds',
        message: error.message,
        code,
        isRetryable: false,
        userMessage: 'Your card was declined due to insufficient funds. Please use a different payment method.'
      };
    }
    
    if (code === 'expired_card') {
      return {
        type: 'expired_card',
        message: error.message,
        code,
        isRetryable: false,
        userMessage: 'Your card has expired. Please use a different payment method.'
      };
    }
    
    return {
      type: 'card_declined',
      message: error.message,
      code,
      isRetryable: false,
      userMessage: 'Your card was declined. Please try a different payment method.'
    };
  }
  
  // Stripe rate limit
  if (error.type === 'StripeRateLimitError' || error.statusCode === 429) {
    return {
      type: 'quota_exceeded',
      message: 'Rate limit exceeded',
      isRetryable: true,
      userMessage: 'Our system is experiencing high volume. Please try again in a moment.'
    };
  }
  
  // Stripe network errors (retryable)
  if (error.type === 'StripeConnectionError' || error.code === 'ECONNREFUSED') {
    return {
      type: 'network_error',
      message: 'Connection error',
      isRetryable: true,
      userMessage: 'We\'re having trouble connecting to our payment processor. Please try again.'
    };
  }
  
  // Unknown errors
  return {
    type: 'unknown',
    message: error.message || 'Unknown payment error',
    isRetryable: false,
    userMessage: 'An unexpected error occurred. Please try again or contact support.'
  };
}

export async function logPaymentError(
  error: any,
  orderId: string,
  operation: string,
  additionalContext?: Record<string, any>
) {
  const classified = classifyPaymentError(error);
  
  logger.error({
    event: 'payment_error',
    operation,
    order_id: orderId,
    error_type: classified.type,
    error_code: classified.code,
    error_message: classified.message,
    is_retryable: classified.isRetryable,
    ...additionalContext,
    stack: error.stack
  });
  
  return classified;
}
```

#### File 4: Update `lib/orderStateMachine.ts`

Add these new transitions:

```typescript
// Add to existing transitions array
{
  from: 'pending_pickup',
  to: 'CANCELED',
  allowedActors: ['system', 'partner', 'admin'],
  conditions: ['no_show_timeout_reached'],
  sideEffects: ['charge_no_show_fee', 'release_capacity', 'notify_customer']
},
{
  from: 'at_facility',
  to: 'paid_processing',
  allowedActors: ['system'],
  conditions: ['auto_charge_within_threshold', 'payment_authorized'],
  sideEffects: ['capture_payment', 'notify_customer']
},
{
  from: 'at_facility',
  to: 'awaiting_payment',
  allowedActors: ['partner'],
  conditions: ['quote_exceeds_threshold'],
  sideEffects: ['notify_customer_approval_needed']
},
{
  from: 'pending_pickup',
  to: 'payment_failed',
  allowedActors: ['system'],
  conditions: ['authorization_failed'],
  sideEffects: ['notify_customer_payment_issue', 'release_capacity']
},
{
  from: 'payment_failed',
  to: 'pending_pickup',
  allowedActors: ['customer'],
  conditions: ['new_payment_method_provided'],
  sideEffects: ['retry_authorization']
}
```

---

### Phase 1: Database Migration (3h)

**File: `supabase/migrations/023_payment_authorization_system.sql`**

```sql
-- ========================================
-- PAYMENT AUTHORIZATION SYSTEM MIGRATION
-- ========================================
-- Author: TidyHood Dev Team
-- Date: 2025-10-07
-- Estimated time: 3 minutes to run

-- Step 1: Add Stripe customer ID to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
COMMENT ON COLUMN profiles.stripe_customer_id IS 'Stripe Customer ID for payment processing';

-- Step 2: Add authorization fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auth_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS authorized_amount_cents INT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS authorized_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS variance_threshold_pct NUMERIC DEFAULT 20.0 NOT NULL;

-- Step 3: Add no-show policy fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS no_show_fee_cents INT DEFAULT 2500 NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS no_show_charged BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS no_show_charged_at TIMESTAMPTZ;

-- Step 4: Add payment error tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_error TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_error_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS capture_attempt_count INT DEFAULT 0 NOT NULL;

-- Step 5: Add optimistic locking for concurrency control
ALTER TABLE orders ADD COLUMN IF NOT EXISTS version INT DEFAULT 0 NOT NULL;

-- Step 6: Add requires_approval flag
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false NOT NULL;

-- Step 7: Update status enum to include payment_failed
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pending_pickup',
  'at_facility',
  'awaiting_payment',
  'paid_processing',
  'completed',
  'payment_failed',
  'PENDING',
  'PAID',
  'RECEIVED',
  'IN_PROGRESS',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELED',
  'REFUNDED'
));

-- Step 8: Create webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type ON webhook_events(event_type);

-- Step 9: Create payment_sagas table for saga pattern
CREATE TABLE IF NOT EXISTS payment_sagas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  params JSONB NOT NULL,
  steps JSONB DEFAULT '[]'::JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_sagas_status ON payment_sagas(status);
CREATE INDEX IF NOT EXISTS idx_payment_sagas_created ON payment_sagas(created_at);

-- Step 10: Add performance indexes for new query patterns
CREATE INDEX IF NOT EXISTS idx_orders_auth_payment ON orders(auth_payment_intent_id) 
  WHERE auth_payment_intent_id IS NOT NULL;
  
CREATE INDEX IF NOT EXISTS idx_orders_payment_failed ON orders(status) 
  WHERE status = 'payment_failed';
  
CREATE INDEX IF NOT EXISTS idx_orders_requires_approval ON orders(requires_approval) 
  WHERE requires_approval = true;
  
CREATE INDEX IF NOT EXISTS idx_orders_authorized_at ON orders(authorized_at) 
  WHERE authorized_at IS NOT NULL;

-- Step 11: Add idempotency_key to order_events
ALTER TABLE order_events ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE INDEX IF NOT EXISTS idx_order_events_idempotency ON order_events(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Step 12: Backfill existing orders with default values
UPDATE orders 
SET 
  variance_threshold_pct = 20.0,
  no_show_fee_cents = 2500,
  no_show_charged = false,
  version = 0,
  capture_attempt_count = 0,
  requires_approval = false
WHERE variance_threshold_pct IS NULL;

-- Step 13: Add RLS policies for new fields
-- (Assumes RLS is already enabled on orders table)

-- Policy: Users can view their own order payment data
CREATE POLICY "Users can view own order payment data" ON orders
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Partners can update payment fields for their orders
CREATE POLICY "Partners can update order payment fields" ON orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM partners 
      WHERE id = orders.partner_id 
      AND partners.user_id = auth.uid()
    )
  );

-- Policy: Service role can manage all payment data (for API/webhooks)
CREATE POLICY "Service role can manage payment data" ON orders
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Policy: Users can view their webhook events
CREATE POLICY "Users can view webhook events" ON webhook_events
  FOR SELECT
  USING (true); -- Webhooks are system-level, but safe to view

-- Step 14: Create helper function for optimistic locking
CREATE OR REPLACE FUNCTION update_order_with_version(
  p_order_id UUID,
  p_expected_version INT,
  p_updates JSONB
) RETURNS TABLE(success BOOLEAN, new_version INT) AS $$
DECLARE
  v_new_version INT;
BEGIN
  UPDATE orders
  SET 
    status = COALESCE((p_updates->>'status')::TEXT, status),
    quote_cents = COALESCE((p_updates->>'quote_cents')::INT, quote_cents),
    paid_at = COALESCE((p_updates->>'paid_at')::TIMESTAMPTZ, paid_at),
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_order_id
    AND version = p_expected_version
  RETURNING version INTO v_new_version;
  
  IF FOUND THEN
    RETURN QUERY SELECT true, v_new_version;
  ELSE
    RETURN QUERY SELECT false, 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Create function to check for expiring authorizations
CREATE OR REPLACE FUNCTION get_expiring_authorizations(
  p_days_until_expiry INT DEFAULT 1
)
RETURNS TABLE(
  order_id UUID,
  auth_payment_intent_id TEXT,
  authorized_at TIMESTAMPTZ,
  days_remaining NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.auth_payment_intent_id,
    o.authorized_at,
    EXTRACT(DAY FROM (o.authorized_at + INTERVAL '7 days' - NOW()))::NUMERIC
  FROM orders o
  WHERE o.auth_payment_intent_id IS NOT NULL
    AND o.status IN ('pending_pickup', 'at_facility')
    AND o.authorized_at + INTERVAL '7 days' - NOW() <= (p_days_until_expiry || ' days')::INTERVAL
    AND o.authorized_at + INTERVAL '7 days' > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 16: Add comments for documentation
COMMENT ON COLUMN orders.auth_payment_intent_id IS 'Stripe PaymentIntent ID for authorization hold';
COMMENT ON COLUMN orders.authorized_amount_cents IS 'Amount authorized at booking (estimate + buffer)';
COMMENT ON COLUMN orders.variance_threshold_pct IS 'Threshold % for auto-charge vs requiring approval';
COMMENT ON COLUMN orders.requires_approval IS 'True if quote variance exceeds threshold';
COMMENT ON COLUMN orders.version IS 'Optimistic locking version number';
COMMENT ON COLUMN orders.payment_error IS 'Last payment error message';
COMMENT ON COLUMN orders.capture_attempt_count IS 'Number of payment capture attempts';
COMMENT ON TABLE webhook_events IS 'Stores processed Stripe webhook events for idempotency';
COMMENT ON TABLE payment_sagas IS 'Tracks payment authorization sagas for consistency';

-- Migration complete
```

**File: `supabase/migrations/023_payment_authorization_system_rollback.sql`**

```sql
-- Rollback migration 023
-- WARNING: This will drop all payment authorization data

-- Drop functions
DROP FUNCTION IF EXISTS get_expiring_authorizations(INT);
DROP FUNCTION IF EXISTS update_order_with_version(UUID, INT, JSONB);

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view own order payment data" ON orders;
DROP POLICY IF EXISTS "Partners can update order payment fields" ON orders;
DROP POLICY IF EXISTS "Service role can manage payment data" ON orders;
DROP POLICY IF EXISTS "Users can view webhook events" ON webhook_events;

-- Drop tables
DROP TABLE IF EXISTS payment_sagas;
DROP TABLE IF EXISTS webhook_events;

-- Drop indexes
DROP INDEX IF EXISTS idx_order_events_idempotency;
DROP INDEX IF EXISTS idx_orders_authorized_at;
DROP INDEX IF EXISTS idx_orders_requires_approval;
DROP INDEX IF EXISTS idx_orders_payment_failed;
DROP INDEX IF EXISTS idx_orders_auth_payment;

-- Drop columns from orders
ALTER TABLE orders DROP COLUMN IF EXISTS requires_approval;
ALTER TABLE orders DROP COLUMN IF EXISTS version;
ALTER TABLE orders DROP COLUMN IF EXISTS capture_attempt_count;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_error_code;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_error;
ALTER TABLE orders DROP COLUMN IF EXISTS no_show_charged_at;
ALTER TABLE orders DROP COLUMN IF EXISTS no_show_charged;
ALTER TABLE orders DROP COLUMN IF EXISTS no_show_fee_cents;
ALTER TABLE orders DROP COLUMN IF EXISTS variance_threshold_pct;
ALTER TABLE orders DROP COLUMN IF EXISTS authorized_at;
ALTER TABLE orders DROP COLUMN IF EXISTS authorized_amount_cents;
ALTER TABLE orders DROP COLUMN IF EXISTS auth_payment_intent_id;

-- Drop columns from order_events
ALTER TABLE order_events DROP COLUMN IF EXISTS idempotency_key;

-- Drop columns from profiles
DROP INDEX IF EXISTS idx_profiles_stripe_customer;
ALTER TABLE profiles DROP COLUMN IF EXISTS stripe_customer_id;

-- Restore status constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN (
  'pending_pickup',
  'at_facility',
  'awaiting_payment',
  'paid_processing',
  'completed',
  'PENDING',
  'PAID',
  'RECEIVED',
  'IN_PROGRESS',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELED',
  'REFUNDED'
));
```

---

### Phase 2: Stripe Elements Integration (6h)

**File: `components/booking/StripePaymentCollector.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { 
  useStripe, 
  useElements, 
  CardElement,
  PaymentElement 
} from '@stripe/react-stripe-js';
import { logger } from '@/lib/logger';

interface Props {
  estimatedAmount: number;
  onPaymentMethodCreated: (paymentMethodId: string) => void;
  onError: (error: string) => void;
  userId: string;
}

export function StripePaymentCollector({
  estimatedAmount,
  onPaymentMethodCreated,
  onError,
  userId
}: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedCards, setSavedCards] = useState<any[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);

  // Load saved payment methods
  useEffect(() => {
    loadSavedCards();
  }, [userId]);

  const loadSavedCards = async () => {
    try {
      const response = await fetch('/api/payment/methods');
      if (response.ok) {
        const { payment_methods } = await response.json();
        setSavedCards(payment_methods || []);
      }
    } catch (error) {
      logger.error('Failed to load saved cards', { error });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      onError('Payment system not ready. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);

    try {
      // Use saved card
      if (selectedCard) {
        onPaymentMethodCreated(selectedCard);
        return;
      }

      // Create new payment method
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { paymentMethod, error } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (error) {
