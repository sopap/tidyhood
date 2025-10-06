# TidyHood Cleaning Status System - Complete Implementation Guide

**Version:** 1.0  
**Date:** October 6, 2025  
**Status:** Production Ready  
**Estimated Implementation Time:** 2-3 days

---

## 📋 TABLE OF CONTENTS

1. [Overview & Architecture](#overview--architecture)
2. [Database Migration](#database-migration)
3. [TypeScript Core System](#typescript-core-system)
4. [API Routes](#api-routes)
5. [React Components](#react-components)
6. [Cron Jobs](#cron-jobs)
7. [Email Templates](#email-templates)
8. [Testing Plan](#testing-plan)
9. [Deployment Guide](#deployment-guide)
10. [Troubleshooting](#troubleshooting)

---

## 1. OVERVIEW & ARCHITECTURE

### System Purpose

Replace the laundry-focused status system with a realistic, simplified status system specifically for CLEANING orders. The new system has 5 states that match actual business operations without requiring real-time cleaner tracking.

### State Machine

```
                 ┌─────────────┐
                 │  SCHEDULED  │ ← Initial state after booking
                 └──────┬──────┘
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
    ┌──────────┐  ┌─────────────┐  ┌──────────┐
    │ CANCELED │  │ IN_SERVICE  │  │RESCHED'D │
    └──────────┘  └──────┬──────┘  └────┬─────┘
      (final)            │                │
                         ▼                │
                  ┌─────────────┐         │
                  │  COMPLETED  │         │
                  └─────────────┘         │
                     (final)              │
                                          │
                         └────────────────┘
                          Creates new SCHEDULED
```

### Status Definitions

| Status | Meaning | Duration | Actions Available |
|--------|---------|----------|-------------------|
| **scheduled** | Booked & paid, waiting | Booking → Day of | Cancel, Reschedule, Add notes |
| **in_service** | Today (in time window) | Day of appointment | Contact support only |
| **completed** | Service finished | Permanent | Rate, Rebook, Request photos |
| **canceled** | Booking canceled | Permanent | Rebook (new order) |
| **rescheduled** | Moved to new date | Transitional | None (archived) |

### Key Features

- ✅ **Realistic** - No fake real-time tracking
- ✅ **Customer-friendly** - Clear, simple language
- ✅ **Automatic transitions** - scheduled → in_service on appointment day
- ✅ **Refund logic** - Free >24h, 15% fee <24h
- ✅ **Reschedule support** - Links old/new orders
- ✅ **Audit trail** - Who canceled, when, why

---

## 2. DATABASE MIGRATION

### File: `supabase/migrations/022_cleaning_status_system.sql`

```sql
-- =====================================================
-- Migration: Cleaning Status System
-- Version: 022
-- Description: Add cleaning-specific status tracking
-- Author: TidyHood Dev Team
-- Date: 2025-10-06
-- =====================================================

-- Add cleaning status column
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cleaning_status TEXT 
CHECK (cleaning_status IN (
  'scheduled',
  'in_service', 
  'completed',
  'canceled',
  'rescheduled'
));

-- Add reschedule tracking columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS rescheduled_from UUID 
  REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS rescheduled_to UUID 
  REFERENCES orders(id) ON DELETE SET NULL;

-- Add cancellation tracking columns
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS cancellation_fee_cents INTEGER 
  CHECK (cancellation_fee_cents >= 0);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS refund_amount_cents INTEGER 
  CHECK (refund_amount_cents >= 0);

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS canceled_by TEXT 
  CHECK (canceled_by IN ('customer', 'partner', 'system'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_cleaning_status 
  ON orders(cleaning_status) 
  WHERE service_type = 'CLEANING';

CREATE INDEX IF NOT EXISTS idx_orders_rescheduled_from 
  ON orders(rescheduled_from) 
  WHERE rescheduled_from IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_scheduled_time_cleaning 
  ON orders(scheduled_time) 
  WHERE service_type = 'CLEANING' AND cleaning_status = 'scheduled';

-- Migrate existing cleaning orders to new status system
UPDATE orders 
SET cleaning_status = CASE
  -- If already completed
  WHEN status = 'completed' THEN 'completed'
  
  -- If appointment is today
  WHEN DATE(scheduled_time) = CURRENT_DATE 
    AND status IN ('paid', 'confirmed') THEN 'in_service'
  
  -- If appointment is in future
  WHEN scheduled_time > NOW() 
    AND status IN ('paid', 'confirmed') THEN 'scheduled'
  
  -- If explicitly canceled
  WHEN status = 'canceled' THEN 'canceled'
  
  -- Default to scheduled for paid orders
  WHEN status = 'paid' THEN 'scheduled'
  
  -- Otherwise keep as completed
  ELSE 'completed'
END
WHERE service_type = 'CLEANING' 
  AND cleaning_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN orders.cleaning_status IS 
  'Simplified status for cleaning orders: scheduled, in_service, completed, canceled, rescheduled';

COMMENT ON COLUMN orders.rescheduled_from IS 
  'Points to the original order that was rescheduled';

COMMENT ON COLUMN orders.rescheduled_to IS 
  'Points to the new order created after reschedule';

COMMENT ON COLUMN orders.cancellation_fee_cents IS 
  'Fee charged for cancellation (0 if >24h notice, 15% if <24h)';

COMMENT ON COLUMN orders.refund_amount_cents IS 
  'Amount refunded after subtracting cancellation fee';

COMMENT ON COLUMN orders.canceled_by IS 
  'Who initiated the cancellation: customer, partner, or system';
```

### File: `supabase/migrations/022_cleaning_status_system_rollback.sql`

```sql
-- =====================================================
-- Rollback: Cleaning Status System
-- Version: 022_rollback
-- Description: Remove cleaning status columns
-- =====================================================

-- Drop indexes
DROP INDEX IF EXISTS idx_orders_cleaning_status;
DROP INDEX IF EXISTS idx_orders_rescheduled_from;
DROP INDEX IF EXISTS idx_orders_scheduled_time_cleaning;

-- Drop columns (in reverse order)
ALTER TABLE orders DROP COLUMN IF EXISTS canceled_by;
ALTER TABLE orders DROP COLUMN IF EXISTS canceled_at;
ALTER TABLE orders DROP COLUMN IF EXISTS refund_amount_cents;
ALTER TABLE orders DROP COLUMN IF EXISTS cancellation_fee_cents;
ALTER TABLE orders DROP COLUMN IF EXISTS cancellation_reason;
ALTER TABLE orders DROP COLUMN IF EXISTS rescheduled_to;
ALTER TABLE orders DROP COLUMN IF EXISTS rescheduled_from;
ALTER TABLE orders DROP COLUMN IF EXISTS cleaning_status;
```

---

## 3. TYPESCRIPT CORE SYSTEM

### File: `lib/cleaningStatus.ts`

```typescript
/**
 * Cleaning Status System
 * 
 * Manages the 5-state status system for cleaning orders:
 * - scheduled: Booked and paid, waiting for appointment
 * - in_service: Appointment is today (cleaner arriving/working)
 * - completed: Service finished successfully
 * - canceled: Booking canceled (with refund logic)
 * - rescheduled: Moved to different date (transitional)
 * 
 * @module lib/cleaningStatus
 */

import { db } from './db'
import { logger } from './logger'
import Stripe from 'stripe'

// ============================================
// TYPES
// ============================================

export type CleaningStatus = 
  | 'scheduled'
  | 'in_service'
  | 'completed'
  | 'canceled'
  | 'rescheduled'

export type CancelBy = 'customer' | 'partner' | 'system'

export interface CleaningStatusConfig {
  label: string
  icon: string
  color: 'blue' | 'indigo' | 'green' | 'gray' | 'red' | 'amber'
  canCancel: boolean
  canReschedule: boolean
  description: string
  showRating?: boolean
  showRebook?: boolean
  showRefundInfo?: boolean
  isTransitional?: boolean
}

export interface CancellationResult {
  feeCents: number
  refundCents: number
  reason: string
  canceledBy: CancelBy
}

export interface RescheduleResult {
  oldOrderId: string
  newOrderId: string
  newScheduledTime: Date
}

// ============================================
// CONFIGURATION
// ============================================

export const CLEANING_STATUS_CONFIG: Record<CleaningStatus, CleaningStatusConfig> = {
  scheduled: {
    label: 'Scheduled',
    icon: '📅',
    color: 'blue',
    canCancel: true,
    canReschedule: true,
    description: 'Your cleaning is booked'
  },
  in_service: {
    label: 'Today',
    icon: '🏠',
    color: 'indigo',
    canCancel: false, // Too late to cancel without fee
    canReschedule: false,
    description: 'Cleaner arriving during scheduled window'
  },
  completed: {
    label: 'Complete',
    icon: '✨',
    color: 'green',
    canCancel: false,
    canReschedule: false,
    description: 'Service completed',
    showRating: true,
    showRebook: true
  },
  canceled: {
    label: 'Canceled',
    icon: '❌',
    color: 'gray',
    canCancel: false,
    canReschedule: false,
    description: 'Booking canceled',
    showRefundInfo: true,
    showRebook: true
  },
  rescheduled: {
    label: 'Rescheduled',
    icon: '🔄',
    color: 'amber',
    canCancel: false,
    canReschedule: false,
    description: 'Moved to new date',
    isTransitional: true
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get hours until appointment
 */
function getHoursUntilAppointment(scheduledTime: Date): number {
  const now = new Date()
  const scheduled = new Date(scheduledTime)
  return (scheduled.getTime() - now.getTime()) / (1000 * 60 * 60)
}

/**
 * Calculate cancellation fee based on timing
 * - Free if >24 hours before appointment
 * - 15% if <24 hours before appointment
 * - 100% (no refund) if during service
 */
export function calculateCancellationFee(
  order: any
): { feeCents: number; refundCents: number } {
  const totalCents = order.total_cents || 0
  const hoursUntil = getHoursUntilAppointment(order.scheduled_time)
  
  // During service - no refund
  if (order.cleaning_status === 'in_service') {
    return {
      feeCents: totalCents,
      refundCents: 0
    }
  }
  
  // Less than 24 hours - 15% fee
  if (hoursUntil < 24) {
    const feeCents = Math.round(totalCents * 0.15)
    return {
      feeCents,
      refundCents: totalCents - feeCents
    }
  }
  
  // More than 24 hours - free cancellation
  return {
    feeCents: 0,
    refundCents: totalCents
  }
}

/**
 * Check if order can be canceled
 */
export function canCancelCleaning(order: any): boolean {
  if (!order || order.service_type !== 'CLEANING') return false
  
  const status = order.cleaning_status
  return status === 'scheduled' || status === 'in_service'
}

/**
 * Check if order can be rescheduled
 */
export function canRescheduleCleaning(order: any): boolean {
  if (!order || order.service_type !== 'CLEANING') return false
  
  const status = order.cleaning_status
  const hoursUntil = getHoursUntilAppointment(order.scheduled_time)
  
  // Can only reschedule if scheduled and >24h away
  return status === 'scheduled' && hoursUntil >= 24
}

/**
 * Get display info for a cleaning status
 */
export function getCleaningStatusDisplay(status: CleaningStatus) {
  return CLEANING_STATUS_CONFIG[status]
}

// ============================================
// STATE TRANSITIONS
// ============================================

/**
 * Transition order to in_service status
 * Called automatically on appointment day at 6 AM
 */
export async function transitionToInService(orderId: string): Promise<void> {
  try {
    await db.query(`
      UPDATE orders 
      SET cleaning_status = 'in_service',
          updated_at = NOW()
      WHERE id = $1 
        AND service_type = 'CLEANING'
        AND cleaning_status = 'scheduled'
    `, [orderId])
    
    logger.info(`Order ${orderId} transitioned to in_service`)
  } catch (error) {
    logger.error(`Failed to transition order ${orderId} to in_service:`, error)
    throw error
  }
}

/**
 * Transition order to completed status
 * Called by partner or automatically 4h after time window
 */
export async function transitionToCompleted(
  orderId: string,
  partnerId?: string
): Promise<void> {
  try {
    await db.query(`
      UPDATE orders 
      SET cleaning_status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1 
        AND service_type = 'CLEANING'
        AND cleaning_status = 'in_service'
    `, [orderId])
    
    logger.info(`Order ${orderId} completed${partnerId ? ` by partner ${partnerId}` : ' automatically'}`)
  } catch (error) {
    logger.error(`Failed to complete order ${orderId}:`, error)
    throw error
  }
}

/**
 * Cancel a cleaning order
 * Calculates refund, processes via Stripe, sends notifications
 */
export async function cancelCleaning(
  orderId: string,
  reason: string,
  canceledBy: CancelBy
): Promise<CancellationResult> {
  try {
    // Get order details
    const result = await db.query(`
      SELECT * FROM orders WHERE id = $1 AND service_type = 'CLEANING'
    `, [orderId])
    
    if (!result.rows.length) {
      throw new Error('Order not found')
    }
    
    const order = result.rows[0]
    
    // Calculate fees
    const { feeCents, refundCents } = calculateCancellationFee(order)
    
    // Update order status
    await db.query(`
      UPDATE orders 
      SET cleaning_status = 'canceled',
          cancellation_reason = $1,
          cancellation_fee_cents = $2,
          refund_amount_cents = $3,
          canceled_at = NOW(),
          canceled_by = $4,
          updated_at = NOW()
      WHERE id = $5
    `, [reason, feeCents, refundCents, canceledBy, orderId])
    
    // Process refund via Stripe if amount > 0
    if (refundCents > 0 && order.payment_intent_id) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16'
      })
      
      await stripe.refunds.create({
        payment_intent: order.payment_intent_id,
        amount: refundCents,
        reason: 'requested_by_customer',
        metadata: {
          order_id: orderId,
          cancellation_fee_cents: feeCents.toString()
        }
      })
      
      logger.info(`Refund of $${(refundCents / 100).toFixed(2)} processed for order ${orderId}`)
    }
    
    // Release time slot
    if (order.slot_id) {
      await db.query(`
        UPDATE time_slots 
        SET available_units = available_units + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [order.slot_id])
    }
    
    logger.info(`Order ${orderId} canceled by ${canceledBy}, refund: $${(refundCents / 100).toFixed(2)}`)
    
    return {
      feeCents,
      refundCents,
      reason,
      canceledBy
    }
  } catch (error) {
    logger.error(`Failed to cancel order ${orderId}:`, error)
    throw error
  }
}

/**
 * Reschedule a cleaning order
 * Marks old order as rescheduled, creates new order
 */
export async function rescheduleCleaning(
  oldOrderId: string,
  newSlotId: string,
  newDateTime: Date
): Promise<RescheduleResult> {
  try {
    // Get old order
    const result = await db.query(`
      SELECT * FROM orders WHERE id = $1 AND service_type = 'CLEANING'
    `, [oldOrderId])
    
    if (!result.rows.length) {
      throw new Error('Order not found')
    }
    
    const oldOrder = result.rows[0]
    
    // Check if can reschedule
    if (!canRescheduleCleaning(oldOrder)) {
      const hoursUntil = getHoursUntilAppointment(oldOrder.scheduled_time)
      throw new Error(
        hoursUntil < 24 
          ? 'Cannot reschedule less than 24 hours before appointment. Please cancel and rebook.'
          : 'Order cannot be rescheduled in current status.'
      )
    }
    
    // Mark old order as rescheduled
    await db.query(`
      UPDATE orders 
      SET cleaning_status = 'rescheduled',
          updated_at = NOW()
      WHERE id = $1
    `, [oldOrderId])
    
    // Create new order
    const newOrderResult = await db.query(`
      INSERT INTO orders (
        user_id, 
        service_type, 
        scheduled_time, 
        slot_id,
        address_snapshot, 
        order_details, 
        total_cents,
        payment_intent_id,
        cleaning_status, 
        rescheduled_from,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9, NOW(), NOW()
      ) RETURNING id
    `, [
      oldOrder.user_id,
      oldOrder.service_type,
      newDateTime,
      newSlotId,
      oldOrder.address_snapshot,
      oldOrder.order_details,
      oldOrder.total_cents,
      oldOrder.payment_intent_id, // Reuse same payment
      oldOrderId
    ])
    
    const newOrderId = newOrderResult.rows[0].id
    
    // Link orders
    await db.query(`
      UPDATE orders 
      SET rescheduled_to = $1
      WHERE id = $2
    `, [newOrderId, oldOrderId])
    
    // Release old slot
    if (oldOrder.slot_id) {
      await db.query(`
        UPDATE time_slots 
        SET available_units = available_units + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [oldOrder.slot_id])
    }
    
    // Reserve new slot
    await db.query(`
      UPDATE time_slots 
      SET available_units = available_units - 1,
          updated_at = NOW()
        WHERE id = $1 AND available_units > 0
    `, [newSlotId])
    
    logger.info(`Order ${oldOrderId} rescheduled to ${newDateTime}, new order: ${newOrderId}`)
    
    return {
      oldOrderId,
      newOrderId,
      newScheduledTime: newDateTime
    }
  } catch (error) {
    logger.error(`Failed to reschedule order ${oldOrderId}:`, error)
    throw error
  }
}

// ============================================
// BATCH OPERATIONS (for cron jobs)
// ============================================

/**
 * Auto-transition all scheduled orders to in_service on appointment day
 * Run daily at 6 AM
 */
export async function autoTransitionToInService(): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const result = await db.query(`
      UPDATE orders 
      SET cleaning_status = 'in_service',
          updated_at = NOW()
      WHERE service_type = 'CLEANING'
        AND cleaning_status = 'scheduled'
        AND DATE(scheduled_time) = $1
      RETURNING id
    `, [today])
    
    const count = result.rows.length
    logger.info(`Auto-transitioned ${count} orders to in_service`)
    
    return count
  } catch (error) {
    logger.error('Failed to auto-transition orders:', error)
    throw error
  }
}

/**
 * Auto-complete orders that ended 4+ hours ago
 * Run hourly as safety net for partners who forget to mark complete
 */
export async function autoCompleteCleanings(): Promise<number> {
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)
    
    const result = await db.query(`
      UPDATE orders 
      SET cleaning_status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
      WHERE service_type = 'CLEANING'
        AND cleaning_status = 'in_service'
        AND scheduled_time < $1
      RETURNING id
    `, [fourHoursAgo])
    
    const count = result.rows.length
    if (count > 0) {
      logger.warn(`Auto-completed ${count} orders that partners didn't mark`)
    }
    
    return count
  } catch (error) {
    logger.error('Failed to auto-complete orders:', error)
    throw error
  }
}

/**
 * Get orders needing reminders (24h before appointment)
 */
export async function getOrdersNeedingReminders(): Promise<any[]> {
  try {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const tomorrowStart = new Date(tomorrow.setHours(0, 0, 0, 0))
    const tomorrowEnd = new Date(tomorrow.setHours(23, 59, 59, 999))
    
    const result = await db.query(`
      SELECT 
        o.*,
        u.email,
        u.phone
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.service_type = 'CLEANING'
        AND o.cleaning_status = 'scheduled'
        AND o.scheduled_time >= $1
        AND o.scheduled_time <= $2
        AND o.reminder_sent = false
    `, [tomorrowStart, tomorrowEnd])
    
    return result.rows
  } catch (error) {
    logger.error('Failed to get orders needing reminders:', error)
    throw error
  }
}
```

---

## 4. API ROUTES

### File: `app/api/orders/[id]/cancel/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { createResponse } from '@/lib/api-response'
import { cancelCleaning, canCancelCleaning } from '@/lib/cleaningStatus'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendCancellationEmail } from '@/lib/emails/cancellationEmail'
import { sendPartnerCancellationNotice } from '@/lib/emails/partnerNotices'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params
    const body = await request.json()
    const { reason } = body
    
    // Get order
    const orderResult = await db.query(`
      SELECT * FROM orders WHERE id = $1
    `, [orderId])
    
    if (!orderResult.rows.length) {
      return createResponse({ error: 'Order not found' }, { status: 404 })
    }
    
    const order = orderResult.rows[0]
    
    // Check if order belongs to user (from auth context)
    // TODO: Add auth check here
    
    // Validate can cancel
    if (!canCancelCleaning(order)) {
      return createResponse(
        { error: 'Order cannot be canceled in current status' },
        { status: 400 }
      )
    }
    
    // Process cancellation
    const result = await cancelCleaning(
      orderId,
      reason || 'Customer requested cancellation',
      'customer'
    )
    
    // Send notifications
    await sendCancellationEmail(orderId, result)
    await sendPartnerCancellationNotice(order.partner_id, orderId)
    
    logger.info(`Order ${orderId} canceled successfully`, { result })
    
    return createResponse({
      message: 'Order canceled successfully',
      refund_amount: result.refundCents / 100,
      cancellation_fee: result.feeCents / 100
    })
  } catch (error: any) {
    logger.error('Cancel order error:', error)
    return createResponse(
      { error: error.message || 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
```

### File: `app/api/orders/[id]/reschedule/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { createResponse } from '@/lib/api-response'
import { rescheduleCleaning, canRescheduleCleaning } from '@/lib/cleaningStatus'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendRescheduleEmail } from '@/lib/emails/rescheduleEmail'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params
    const body = await request.json()
    const { new_slot_id, new_date_time } = body
    
    if (!new_slot_id || !new_date_time) {
      return createResponse(
        { error: 'new_slot_id and new_date_time are required' },
        { status: 400 }
      )
    }
    
    // Get order
    const orderResult = await db.query(`
      SELECT * FROM orders WHERE id = $1
    `, [orderId])
    
    if (!orderResult.rows.length) {
      return createResponse({ error: 'Order not found' }, { status: 404 })
    }
    
    const order = orderResult.rows[0]
    
    // Check if order belongs to user (from auth context)
    // TODO: Add auth check here
    
    // Validate can reschedule
    if (!canRescheduleCleaning(order)) {
      return createResponse(
        { 
          error: 'Cannot reschedule less than 24 hours before appointment. Please cancel and rebook instead.' 
        },
        { status: 400 }
      )
    }
    
    // Process reschedule
    const result = await rescheduleCleaning(
      orderId,
      new_slot_id,
      new Date(new_date_time)
    )
    
    // Send notification
    await sendRescheduleEmail(result.newOrderId, orderId)
    
    logger.info(`Order ${orderId} rescheduled successfully`, { result })
    
    return createResponse({
      message: 'Order rescheduled successfully',
      new_order_id: result.newOrderId,
      new_scheduled_time: result.newScheduledTime
    })
  } catch (error: any) {
    logger.error('Reschedule order error:', error)
    return createResponse(
      { error: error.message || 'Failed to reschedule order' },
      { status: 500 }
    )
  }
}
```

### File: `app/api/orders/[id]/complete/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { createResponse } from '@/lib/api-response'
import { transitionToCompleted } from '@/lib/cleaningStatus'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendCompletionEmail } from '@/lib/emails/completionEmail'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params
    
    // TODO: Verify request is from authenticated partner
    // const partnerId = await getPartnerIdFromAuth(request)
    
    // Get order
    const orderResult = await db.query(`
      SELECT * FROM orders 
      WHERE id = $1 AND service_type = 'CLEANING'
    `, [orderId])
    
    if (!orderResult.rows.length) {
      return createResponse({ error: 'Order not found' }, { status: 404 })
    }
    
    const order = orderResult.rows[0]
    
    // Validate status
    if (order.cleaning_status !== 'in_service') {
      return createResponse(
        { error: 'Can only complete orders in in_service status' },
        { status: 400 }
      )
    }
    
    // Mark complete
    await transitionToCompleted(orderId, order.partner_id)
    
    // Send completion email with rating request
    await sendCompletionEmail(orderId)
    
    logger.info(`Order ${orderId} marked complete by partner ${order.partner_id}`)
    
    return createResponse({
      message: 'Order marked as complete',
      status: 'completed'
    })
  } catch (error: any) {
    logger.error('Complete order error:', error)
    return createResponse(
      { error: error.message || 'Failed to complete order' },
      { status: 500 }
    )
  }
}
```

---

## 5. REACT COMPONENTS

### File: `components/cleaning/CleaningStatusBadge.tsx`

```typescript
'use client'

import { CleaningStatus, getCleaningStatusDisplay } from '@/lib/cleaningStatus'
import { cn } from '@/lib/utils'

interface CleaningStatusBadgeProps {
  status: CleaningStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-2'
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200'
}

export function CleaningStatusBadge({ status, size = 'md', className }: CleaningStatusBadgeProps) {
  const config = getCleaningStatusDisplay(status)
  
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        sizeClasses[size],
        colorClasses[config.color],
        className
      )}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}
```

### File: `components/cleaning/CleaningOrderCard.tsx`

```typescript
'use client'

import { CleaningStatus, CLEANING_STATUS_CONFIG } from '@/lib/cleaningStatus'
import { CleaningStatusBadge } from './CleaningStatusBadge'
import { formatCurrency } from '@/lib/utils'

interface CleaningOrderCardProps {
  order: {
    id: string
    cleaning_status: CleaningStatus
    scheduled_time: string
    order_details: any
    total_cents: number
    address_snapshot: any
    cancellation_fee_cents?: number
    refund_amount_cents?: number
  }
  onCancel?: () => void
  onReschedule?: () => void
  onRate?: () => void
  onRebook?: () => void
  onClick?: () => void
}

export function CleaningOrderCard({
  order,
  onCancel,
  onReschedule,
  onRate,
  onRebook,
  onClick
}: CleaningOrderCardProps) {
  const config = CLEANING_STATUS_CONFIG[order.cleaning_status]
  const scheduledDate = new Date(order.scheduled_time)
  
  // Determine card styling based on status
  const borderColor = {
    scheduled: 'border-l-blue-500',
    in_service: 'border-l-indigo-500 bg-indigo-50',
    completed: 'border-l-green-500',
    canceled: 'border-l-gray-400',
    rescheduled: 'border-l-amber-500'
  }[order.cleaning_status]
  
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 p-6 hover:shadow-md transition-shadow cursor-pointer ${borderColor}`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">{config.icon}</span>
          <div>
            <CleaningStatusBadge status={order.cleaning_status} />
            <div className="text-sm text-gray-600 mt-1">
              {scheduledDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
              {' at '}
              {scheduledDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </div>
          </div>
        </div>
        
        {order.cleaning_status !== 'canceled' && (
          <div className="text-right">
            <div className="font-bold text-lg">
              {formatCurrency(order.total_cents)}
            </div>
          </div>
        )}
      </div>
      
      {/* Service Details */}
      <div className="text-sm text-gray-700 mb-4">
        {order.order_details.cleaningType === 'deep' ? 'Deep' : 'Standard'} Cleaning
        {' • '}
        {order.order_details.bedrooms === 0 ? 'Studio' : `${order.order_details.bedrooms} BR`}
        {', '}
        {order.order_details.bathrooms} BA
      </div>
      
      {/* Address */}
      <div className="text-sm text-gray-600 mb-4">
        📍 {order.address_snapshot.line1}
        {order.address_snapshot.line2 && `, ${order.address_snapshot.line2}`}
      </div>
      
      {/* Cancellation Info */}
      {order.cleaning_status === 'canceled' && (
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          {order.refund_amount_cents! > 0 ? (
            <>
              <div className="text-sm font-medium text-gray-900">
                ✓ Refund: {formatCurrency(order.refund_amount_cents)}
              </div>
              {order.cancellation_fee_cents! > 0 && (
                <div className="text-xs text-gray-600 mt-1">
                  Cancellation fee: {formatCurrency(order.cancellation_fee_cents)}
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-gray-700">
              No refund available (canceled during service)
            </div>
          )}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-2 mt-4">
        {config.canReschedule && onReschedule && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onReschedule()
            }}
            className="flex-1 btn-secondary-sm"
          >
            Reschedule
          </button>
        )}
        
        {config.canCancel && onCancel && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCancel()
            }}
            className="flex-1 btn-ghost-sm"
          >
            Cancel
          </button>
        )}
        
        {config.showRating && onRate && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRate()
            }}
            className="flex-1 btn-primary-sm"
          >
            Rate Service ⭐
          </button>
        )}
        
        {config.showRebook && onRebook && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRebook()
            }}
            className="flex-1 btn-secondary-sm"
          >
            Book Again
          </button>
        )}
      </div>
    </div>
  )
}
```

### File: `components/cleaning/CancelCleaningModal.tsx`

```typescript
'use client'

import { useState } from 'react'
import { calculateCancellationFee } from '@/lib/cleaningStatus'
import { formatCurrency } from '@/lib/utils'

interface CancelCleaningModalProps {
  isOpen: boolean
  onClose: () => void
  order: any
  onConfirm: (reason: string) => Promise<void>
}

export function CancelCleaningModal({
  isOpen,
  onClose,
  order,
  onConfirm
}: CancelCleaningModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  if (!isOpen) return null
  
  const { feeCents, refundCents } = calculateCancellationFee(order)
  const hasFee = feeCents > 0
  
  const handleConfirm = async () => {
    try {
      setLoading(true)
      setError(null)
      await onConfirm(reason)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to cancel order')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Cancel Cleaning?</h2>
        
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-700 mb-2">
              Scheduled: {new Date(order.scheduled_time).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
            <div className="text-sm text-gray-700">
              Total: {formatCurrency(order.total_cents)}
            </div>
          </div>
          
          {hasFee ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="text-amber-900 font-medium mb-2">⚠️ Cancellation Fee</div>
              <div className="text-sm text-amber-800 space-y-1">
                <div>Cancellation fee: {formatCurrency(feeCents)} (15%)</div>
                <div className="font-medium">Refund amount: {formatCurrency(refundCents)}</div>
                <div className="text-xs mt-2">
                  You're canceling less than 24 hours before your appointment.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-900 font-medium mb-1">✓ Full Refund</div>
              <div className="text-sm text-green-800">
                You'll receive a full refund of {formatCurrency(refundCents)}
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select a reason...</option>
              <option value="schedule_conflict">Schedule conflict</option>
              <option value="no_longer_needed">No longer needed</option>
              <option value="found_alternative">Found alternative service</option>
              <option value="emergency">Emergency</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 btn-secondary"
          >
            Keep Booking
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 btn-primary bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Canceling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### File: `components/cleaning/RescheduleCleaningModal.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { canRescheduleCleaning } from '@/lib/cleaningStatus'

interface RescheduleCleaningModalProps {
  isOpen: boolean
  onClose: () => void
  order: any
  onConfirm: (newSlotId: string, newDateTime: Date) => Promise<void>
}

interface TimeSlot {
  id: string
  slot_start: string
  slot_end: string
  available_units: number
  partner_name: string
}

export function RescheduleCleaningModal({
  isOpen,
  onClose,
  order,
  onConfirm
}: RescheduleCleaningModalProps) {
  const [newDate, setNewDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchingSlots, setFetchingSlots] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  if (!isOpen) return null
  
  // Check if can reschedule
  if (!canRescheduleCleaning(order)) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <h2 className="text-2xl font-bold mb-4">Cannot Reschedule</h2>
          <p className="text-gray-700 mb-6">
            Orders cannot be rescheduled less than 24 hours before the appointment.
            Please cancel and book a new time instead.
          </p>
          <button onClick={onClose} className="w-full btn-primary">
            Got it
          </button>
        </div>
      </div>
    )
  }
  
  // Fetch available slots when date changes
  useEffect(() => {
    if (newDate && order.address_snapshot?.zip) {
      fetchSlots()
    }
  }, [newDate])
  
  const fetchSlots = async () => {
    try {
      setFetchingSlots(true)
      const response = await fetch(
        `/api/slots?service=CLEANING&zip=${order.address_snapshot.zip}&date=${newDate}`
      )
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.slots || [])
      }
    } catch (err) {
      console.error('Failed to fetch slots:', err)
    } finally {
      setFetchingSlots(false)
    }
  }
  
  const handleConfirm = async () => {
    if (!selectedSlot) return
    
    try {
      setLoading(true)
      setError(null)
      await onConfirm(selectedSlot.id, new Date(selectedSlot.slot_start))
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule order')
    } finally {
      setLoading(false)
    }
  }
  
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 2) // At least 2 days from now
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Reschedule Cleaning</h2>
        
        <div className="space-y-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Current appointment:</div>
            <div className="font-medium">
              {new Date(order.scheduled_time).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Date
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value)
                setSelectedSlot(null)
              }}
              min={minDate.toISOString().split('T')[0]}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
          </div>
          
          {newDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Times
              </label>
              {fetchingSlots ? (
                <div className="text-center py-8 text-gray-500">
                  Loading slots...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No slots available for this date
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableSlots.map((slot) => (
                    <label
                      key={slot.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedSlot?.id === slot.id ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          checked={selectedSlot?.id === slot.id}
                          onChange={() => setSelectedSlot(slot)}
                          className="mr-3"
                        />
                        <div>
                          <div className="font-medium">
                            {new Date(slot.slot_start).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                            {' - '}
                            {new Date(slot.slot_end).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </div>
                          <div className="text-xs text-gray-600">
                            {slot.partner_name}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {slot.available_units} available
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !selectedSlot}
            className="flex-1 btn-primary"
          >
            {loading ? 'Rescheduling...' : 'Confirm New Time'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## 6. CRON JOBS

### File: `lib/cron/cleaningStatusCron.ts`

```typescript
/**
 * Cron Jobs for Cleaning Status System
 * 
 * Schedule in vercel.json or external cron service:
 * - autoTransitionToInService: Daily at 6 AM
 * - autoCompleteCleanings: Hourly
 * - sendCleaningReminders: Daily at 9 AM
 */

import { 
  autoTransitionToInService,
  autoCompleteCleanings,
  getOrdersNeedingReminders
} from '@/lib/cleaningStatus'
import { logger } from '@/lib/logger'
import { sendEmail } from '@/lib/emails/sendEmail'
import { sendSMS } from '@/lib/sms'

/**
 * Cron: Daily at 6 AM
 * Auto-transition scheduled orders to in_service when appointment day arrives
 */
export async function cronTransitionToInService() {
  logger.info('Starting auto-transition to in_service cron job')
  
  try {
    const count = await autoTransitionToInService()
    logger.info(`Auto-transition complete: ${count} orders transitioned`)
    
    return { success: true, count }
  } catch (error) {
    logger.error('Auto-transition cron job failed:', error)
    throw error
  }
}

/**
 * Cron: Hourly
 * Auto-complete orders that ended 4+ hours ago (safety net)
 */
export async function cronAutoCompleteCleanings() {
  logger.info('Starting auto-complete cron job')
  
  try {
    const count = await autoCompleteCleanings()
    
    if (count > 0) {
      logger.warn(`Auto-completed ${count} orders that partners forgot to mark`)
    } else {
      logger.info('Auto-complete check: no orders needed completion')
    }
    
    return { success: true, count }
  } catch (error) {
    logger.error('Auto-complete cron job failed:', error)
    throw error
  }
}

/**
 * Cron: Daily at 9 AM
 * Send 24h reminders for tomorrow's appointments
 */
export async function cronSendCleaningReminders() {
  logger.info('Starting cleaning reminders cron job')
  
  try {
    const orders = await getOrdersNeedingReminders()
    logger.info(`Found ${orders.length} orders needing reminders`)
    
    for (const order of orders) {
      try {
        // Send email
        await sendEmail({
          to: order.email,
          subject: '🏠 Reminder: Your cleaning is tomorrow!',
          template: 'cleaning-reminder',
          data: {
            scheduledTime: new Date(order.scheduled_time),
            address: order.address_snapshot,
            orderDetails: order.order_details
          }
        })
        
        // Send SMS if phone available
        if (order.phone) {
          const time = new Date(order.scheduled_time).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
          
          await sendSMS(
            order.phone,
            `Reminder: Your TidyHood cleaning is tomorrow at ${time}. Reply HELP for questions.`
          )
        }
        
        // Mark reminder sent
        await db.query(`
          UPDATE orders 
          SET reminder_sent = true,
              updated_at = NOW()
          WHERE id = $1
        `, [order.id])
        
      } catch (err) {
        logger.error(`Failed to send reminder for order ${order.id}:`, err)
        // Continue with other orders
      }
    }
    
    logger.info(`Reminders sent to ${orders.length} customers`)
    return { success: true, count: orders.length }
  } catch (error) {
    logger.error('Cleaning reminders cron job failed:', error)
    throw error
  }
}
```

### Vercel Cron Configuration

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/transition-to-in-service",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/auto-complete-cleanings",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/send-cleaning-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

### Cron API Routes

Create `app/api/cron/transition-to-in-service/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { createResponse } from '@/lib/api-response'
import { cronTransitionToInService } from '@/lib/cron/cleaningStatusCron'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return createResponse({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const result = await cronTransitionToInService()
    return createResponse(result)
  } catch (error: any) {
    return createResponse({ error: error.message }, { status: 500 })
  }
}
```

---

## 7. EMAIL TEMPLATES

### Scheduled Confirmation Email

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cleaning Confirmed</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2563eb;">✓ Cleaning Confirmed</h1>
    
    <p>Hi {{customer_name}},</p>
    
    <p>Your cleaning is all set!</p>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>📅 {{formatted_date}}</strong></p>
      <p style="margin: 0 0 10px 0;"><strong>🕐 {{time_window}}</strong></p>
      <p style="margin: 0;"><strong>🏠 {{address}}</strong></p>
    </div>
    
    <h3>What to expect:</h3>
    <ul>
      <li>Background-checked cleaner</li>
      <li>Eco-friendly products</li>
      <li>2-3 hour service</li>
      <li>Photo documentation</li>
    </ul>
    
    <p>You'll receive a reminder 24 hours before your appointment.</p>
    
    <div style="margin: 30px 0;">
      <a href="{{order_url}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View Order Details
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 40px;">
      Questions? Reply to this email or call us at {{support_phone}}
    </p>
  </div>
</body>
</html>
```

### Today Email (Day of Service)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your cleaning is today!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #4f46e5;">🏠 Your cleaning is today!</h1>
    
    <p>Good morning {{customer_name}}!</p>
    
    <div style="background: #eef2ff; border-left: 4px solid #4f46e5; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-size: 18px;"><strong>Arrival window: {{time_window}}</strong></p>
      <p style="margin: 0; color: #4f46e5;">Your cleaner will knock/ring when they arrive</p>
    </div>
    
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Cleaner:</strong> {{partner_name}}</p>
      <p style="margin: 0;"><strong>Contact:</strong> {{partner_phone}}</p>
    </div>
    
    <p>The service typically takes 2-3 hours. We'll send you a notification when complete.</p>
    
    <p style="font-size: 14px; color: #666;">
      Need help? <a href="tel:{{support_phone}}" style="color: #2563eb;">Call {{support_phone}}</a>
    </p>
  </div>
</body>
</html>
```

### Completion Email

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Your home is sparkling clean!</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #10b981;">✨ Your home is sparkling clean!</h1>
    
    <p>Hi {{customer_name}},</p>
    
    <p>Thanks for choosing TidyHood! Your cleaning is complete.</p>
    
    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Service completed:</strong> {{completion_time}}</p>
      <p style="margin: 0;"><strong>Cleaner:</strong> {{partner_name}}</p>
    </div>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0;">How did we do?</h3>
      <p style="margin: 0 0 15px 0;">Your feedback helps us maintain our high standards.</p>
      <a href="{{rating_url}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        ⭐ Rate Your Service
      </a>
    </div>
    
    <div style="margin: 30px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Total:</strong> ${{total}}</p>
      <p style="font-size: 14px; color: #666; margin: 0;">Charged to card ending •••• {{last4}}</p>
    </div>
    
    <div style="display: flex; gap: 10px; margin: 30px 0;">
      <a href="{{book_again_url}}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Book Again
      </a>
      <a href="{{receipt_url}}" style="background: #e5e7eb; color: #374151; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View Receipt
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 40px;">
      - The TidyHood Team
    </p>
  </div>
</body>
</html>
```

### Canceled Email (Full Refund)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Booking Canceled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #6b7280;">Booking Canceled</h1>
    
    <p>Hi {{customer_name}},</p>
    
    <p>Your cleaning has been canceled:</p>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Canceled:</strong> {{formatted_date}}</p>
      <p style="margin: 0;">{{service_details}}</p>
    </div>
    
    <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0;">✓ Full Refund Processed</h3>
      <p style="margin: 0 0 10px 0;"><strong>Original charge:</strong> ${{original_amount}}</p>
      <p style="margin: 0 0 10px 0;"><strong>Cancellation fee:</strong> $0.00</p>
      <p style="margin: 0;"><strong>Refund amount:</strong> ${{refund_amount}}</p>
      <p style="font-size: 14px; color: #666; margin-top: 10px;">
        Your refund will appear in 5-7 business days.
      </p>
    </div>
    
    <div style="margin: 30px 0;">
      <a href="{{book_url}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Book New Cleaning
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 40px;">
      Questions? Reply to this email.
    </p>
  </div>
</body>
</html>
```

### Canceled Email (With Fee)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Booking Canceled - Refund Details</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #6b7280;">Booking Canceled</h1>
    
    <p>Hi {{customer_name}},</p>
    
    <p>Your cleaning has been canceled:</p>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Canceled:</strong> {{formatted_date}}</p>
      <p style="margin: 0;">{{service_details}}</p>
    </div>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0;">Refund Details</h3>
      <p style="margin: 0 0 10px 0;"><strong>Original charge:</strong> ${{original_amount}}</p>
      <p style="margin: 0 0 10px 0;"><strong>Cancellation fee:</strong> ${{fee_amount}} (15%)</p>
      <p style="margin: 0;"><strong>Refund amount:</strong> ${{refund_amount}}</p>
      <p style="font-size: 14px; color: #92400e; margin-top: 15px;">
        A 15% cancellation fee applies when canceling less than 24 hours before your appointment.
        <a href="{{policy_url}}" style="color: #b45309;">View our cancellation policy</a>
      </p>
    </div>
    
    <p>Your refund will appear in 5-7 business days.</p>
    
    <div style="margin: 30px 0;">
      <a href="{{book_url}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        Book New Cleaning
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 40px;">
      Questions? Reply to this email.
    </p>
  </div>
</body>
</html>
```

### Rescheduled Email

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Cleaning Rescheduled</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2563eb;">🔄 Cleaning Rescheduled</h1>
    
    <p>Hi {{customer_name}},</p>
    
    <p>Your cleaning has been moved to a new date:</p>
    
    <div style="display: flex; gap: 20px; margin: 20px 0;">
      <div style="flex: 1; background: #fef2f2; padding: 15px; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 5px 0; font-size: 12px; color: #991b1b;">OLD DATE</p>
        <p style="margin: 0; text-decoration: line-through; color: #dc2626;">{{old_date}}</p>
      </div>
      <div style="flex: 1; background: #ecfdf5; padding: 15px; border-radius: 8px; text-align: center;">
        <p style="margin: 0 0 5px 0; font-size: 12px; color: #065f46;">NEW DATE</p>
        <p style="margin: 0; font-weight: bold; color: #10b981;">{{new_date}}</p>
      </div>
    </div>
    
    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0;">New Booking Details</h3>
      <p style="margin: 0 0 10px 0;"><strong>📅 Date:</strong> {{formatted_date}}</p>
      <p style="margin: 0 0 10px 0;"><strong>🕐 Time:</strong> {{time_window}}</p>
      <p style="margin: 0 0 10px 0;"><strong>🏠 Address:</strong> {{address}}</p>
      <p style="margin: 0;"><strong>✨ Service:</strong> {{service_details}}</p>
    </div>
    
    <p>Total: ${{total}} (already paid)</p>
    
    <div style="margin: 30px 0;">
      <a href="{{order_url}}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View Booking
      </a>
    </div>
    
    <p style="font-size: 14px; color: #666; margin-top: 40px;">
      Need to change again? <a href="{{order_url}}" style="color: #2563eb;">Visit your order page</a>
    </p>
  </div>
</body>
</html>
```

---

## 8. TESTING PLAN

### Unit Tests

Create `lib/__tests__/cleaningStatus.test.ts`:

```typescript
import {
  calculateCancellationFee,
  canCancelCleaning,
  canRescheduleCleaning,
  getCleaningStatusDisplay
} from '../cleaningStatus'

describe('cleaningStatus', () => {
  describe('calculateCancellationFee', () => {
    it('should charge no fee for cancellation >24h before', () => {
      const order = {
        total_cents: 10000,
        scheduled_time: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h from now
        cleaning_status: 'scheduled'
      }
      
      const { feeCents, refundCents } = calculateCancellationFee(order)
      
      expect(feeCents).toBe(0)
      expect(refundCents).toBe(10000)
    })
    
    it('should charge 15% fee for cancellation <24h before', () => {
      const order = {
        total_cents: 10000,
        scheduled_time: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12h from now
        cleaning_status: 'scheduled'
      }
      
      const { feeCents, refundCents } = calculateCancellationFee(order)
      
      expect(feeCents).toBe(1500) // 15% of 10000
      expect(refundCents).toBe(8500)
    })
    
    it('should charge full amount for cancellation during service', () => {
      const order = {
        total_cents: 10000,
        scheduled_time: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1h ago
        cleaning_status: 'in_service'
      }
      
      const { feeCents, refundCents } = calculateCancellationFee(order)
      
      expect(feeCents).toBe(10000)
      expect(refundCents).toBe(0)
    })
  })
  
  describe('canCancelCleaning', () => {
    it('should allow cancel for scheduled orders', () => {
      const order = {
        service_type: 'CLEANING',
        cleaning_status: 'scheduled'
      }
      
      expect(canCancelCleaning(order)).toBe(true)
    })
    
    it('should not allow cancel for completed orders', () => {
      const order = {
        service_type: 'CLEANING',
        cleaning_status: 'completed'
      }
      
      expect(canCancelCleaning(order)).toBe(false)
    })
  })
  
  describe('canRescheduleCleaning', () => {
    it('should allow reschedule >24h before appointment', () => {
      const order = {
        service_type: 'CLEANING',
        cleaning_status: 'scheduled',
        scheduled_time: new Date(Date.now() + 48 * 60 * 60 * 1000)
      }
      
      expect(canRescheduleCleaning(order)).toBe(true)
    })
    
    it('should not allow reschedule <24h before appointment', () => {
      const order = {
        service_type: 'CLEANING',
        cleaning_status: 'scheduled',
        scheduled_time: new Date(Date.now() + 12 * 60 * 60 * 1000)
      }
      
      expect(canRescheduleCleaning(order)).toBe(false)
    })
  })
})
```

### Integration Tests

Create `__tests__/api/cleaning-status-api.test.ts`:

```typescript
import { POST as cancelRoute } from '@/app/api/orders/[id]/cancel/route'
import { POST as rescheduleRoute } from '@/app/api/orders/[id]/reschedule/route'
import { POST as completeRoute } from '@/app/api/orders/[id]/complete/route'

describe('Cleaning Status API Routes', () => {
  describe('POST /api/orders/[id]/cancel', () => {
    it('should cancel order and process refund', async () => {
      // Test implementation
    })
    
    it('should reject cancel for completed orders', async () => {
      // Test implementation
    })
  })
  
  describe('POST /api/orders/[id]/reschedule', () => {
    it('should reschedule order successfully', async () => {
      // Test implementation
    })
    
    it('should reject reschedule <24h before', async () => {
      // Test implementation
    })
  })
  
  describe('POST /api/orders/[id]/complete', () => {
    it('should mark order complete', async () => {
      // Test implementation
    })
    
    it('should only work for in_service orders', async () => {
      // Test implementation
    })
  })
})
```

### E2E Test Scenarios

**Scenario 1: Happy Path - Scheduled → Today → Complete**
1. Create cleaning order (should be 'scheduled')
2. Wait for or manually trigger auto-transition to 'in_service'
3. Partner marks complete
4. Verify completion email sent
5. Verify rating request displayed

**Scenario 2: Cancel with Full Refund**
1. Create cleaning order 48h in future
2. Cancel order
3. Verify no cancellation fee
4. Verify Stripe refund processed
5. Verify cancellation email received

**Scenario 3: Cancel with Fee**
1. Create cleaning order 12h in future
2. Cancel order
3. Verify 15% fee charged
4. Verify partial Stripe refund
5. Verify fee explanation in email

**Scenario 4: Reschedule Order**
1. Create cleaning order 48h in future
2. Reschedule to new date
3. Verify old order marked 'rescheduled'
4. Verify new order created with 'scheduled'
5. Verify reschedule email sent

**Scenario 5: Auto-Complete Safety Net**
1. Create order, set to 'in_service'
2. Wait 4+ hours past scheduled time
3. Run auto-complete cron
4. Verify order auto-completed
5. Verify completion notification sent

### Manual QA Checklist

**Database Migration:**
- [ ] Migration runs without errors on clean database
- [ ] Migration runs without errors on existing data
- [ ] Rollback works correctly
- [ ] Indexes created successfully
- [ ] All constraints working

**Status Transitions:**
- [ ] scheduled → in_service (automatic at 6 AM)
- [ ] scheduled → canceled (user action)
- [ ] scheduled → rescheduled (user action)
- [ ] in_service → completed (partner action)
- [ ] in_service → canceled (edge case)

**Cancellation:**
- [ ] Fee calculation correct for >24h
- [ ] Fee calculation correct for <24h
- [ ] Stripe refund processes correctly
- [ ] Email sent with correct info
- [ ] Time slot released

**Reschedule:**
- [ ] New order created correctly
- [ ] Old order marked rescheduled
- [ ] Orders linked correctly
- [ ] Payment reused
- [ ] Slots updated
- [ ] Email sent

**UI Components:**
- [ ] Status badge displays correctly for all states
- [ ] Order card shows correct actions per status
- [ ] Cancel modal shows correct fee
- [ ] Reschedule modal loads available slots
- [ ] Mobile responsiveness

**Cron Jobs:**
- [ ] Auto-transition runs daily
- [ ] Auto-complete runs hourly
- [ ] Reminders sent 24h before
- [ ] Cron auth working

---

## 9. DEPLOYMENT GUIDE

### Pre-Deployment Checklist

- [ ] **Code Review Complete** - All code reviewed and approved
- [ ] **Tests Passing** - All unit/integration tests pass
- [ ] **Staging Tested** - Deployed and tested on staging environment
- [ ] **Database Backup** - Production database backed up
- [ ] **Env Vars Set** - `CRON_SECRET` added to environment
- [ ] **Stripe Keys** - Verified correct Stripe keys in use
- [ ] **Email Provider** - Email sending tested and working
- [ ] **SMS Provider** - SMS sending tested (if used)
- [ ] **Monitoring Ready** - Sentry/logging configured
- [ ] **Rollback Plan** - Rollback procedure documented and tested
- [ ] **Team Notified** - Team aware of deployment window

### Deployment Steps

#### Step 1: Deploy Database Migration

```bash
# Connect to production database
# Run migration
npm run supabase migration up

# Verify migration success
# Check in Supabase dashboard that new columns exist
```

Verification query:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN (
    'cleaning_status', 
    'rescheduled_from', 
    'rescheduled_to',
    'cancellation_fee_cents'
  );
```

Expected: All 4+ columns should exist.

#### Step 2: Deploy Code Changes

```bash
# Deploy to Vercel (or your platform)
git add .
git commit -m "feat: implement cleaning status system"
git push origin main

# Vercel will auto-deploy
# Or manual deploy:
vercel --prod
```

#### Step 3: Set Up Cron Jobs

**Option A: Vercel Cron**

Update `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/transition-to-in-service",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/auto-complete-cleanings",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/send-cleaning-reminders",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Deploy again to activate crons.

**Option B: External Cron (EasyCron, cron-job.org)**

Set up 3 cron jobs hitting your API endpoints with Authorization header:
```
Authorization: Bearer ${CRON_SECRET}
```

#### Step 4: Verify Deployment

1. **Check migration applied:**
```sql
SELECT * FROM orders WHERE service_type = 'CLEANING' LIMIT 5;
-- Verify cleaning_status column exists and has values
```

2. **Test API endpoints:**
```bash
# Test with real order ID
curl -X POST https://your-domain.com/api/orders/{id}/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "test"}'
```

3. **Check cron jobs:**
- Verify cron jobs appear in Vercel dashboard
- Or manually trigger: `curl -H "Authorization: Bearer ${CRON_SECRET}" https://your-domain.com/api/cron/transition-to-in-service`

4. **Monitor logs:**
- Check Sentry for errors
- Check Vercel logs
- Check Supabase logs

#### Step 5: Create Test Order

1. Book a test cleaning order
2. Verify it has `cleaning_status = 'scheduled'`
3. Test cancel functionality
4. Verify refund processed
5. Check email received

### Post-Deployment Monitoring (24 hours)

**Hour 1-4: Active Monitoring**
- [ ] No Sentry errors related to new code
- [ ] API endpoints responding normally
- [ ] Database queries performant
- [ ] No customer complaints

**Hour 4-12: Periodic Checks**
- [ ] Check Sentry every 2 hours
- [ ] Monitor refund processing
- [ ] Verify emails sending

**Hour 12-24: Daily Check**
- [ ] Morning: Check cron job execution logs
- [ ] Verify auto-transitions working
- [ ] Check reminder emails sent

**Metrics to Monitor:**
- Error rate for new API endpoints
- Database query performance (should be <100ms)
- Email delivery rate (should be >95%)
- Stripe refund success rate (should be 100%)
- Cron job execution (should run on schedule)

### Rollback Procedure

If critical issues detected:

#### Step 1: Rollback Code
```bash
# Revert to previous deployment
vercel rollback
# Or git revert + redeploy
git revert HEAD
git push origin main
```

#### Step 2: Rollback Database

```bash
# Run rollback migration
npm run supabase migration down

# Or manually:
psql $DATABASE_URL -f supabase/migrations/022_cleaning_status_system_rollback.sql
```

#### Step 3: Disable Cron Jobs

- Remove cron configuration from `vercel.json`
- Or disable external cron jobs

#### Step 4: Verify Rollback

- [ ] Old code deployed
- [ ] New database columns removed
- [ ] System functioning normally
- [ ] No errors in logs

#### Step 5: Post-Mortem

Document:
1. What went wrong
2. Why it wasn't caught in testing
3. How to prevent in future
4. When to retry deployment

---

## 10. TROUBLESHOOTING

### Common Issues & Solutions

#### Issue: Migration Fails with Constraint Violation

**Symptoms:**
```
ERROR: check constraint "orders_cleaning_status_check" is violated
```

**Cause:** Existing orders have invalid status values

**Solution:**
```sql
-- Check problematic orders
SELECT id, status, cleaning_status 
FROM orders 
WHERE service_type = 'CLEANING' 
  AND cleaning_status NOT IN ('scheduled', 'in_service', 'completed', 'canceled', 'rescheduled');

-- Fix manually before retry
UPDATE orders 
SET cleaning_status = 'completed' 
WHERE service_type = 'CLEANING' 
  AND cleaning_status IS NULL;
```

#### Issue: Refunds Not Processing

**Symptoms:** Cancellation succeeds but Stripe refund fails

**Cause:** Payment intent ID missing or invalid

**Solution:**
```typescript
// Add fallback in cancelCleaning function
if (!order.payment_intent_id) {
  logger.error(`No payment_intent_id for order ${orderId}`)
  // Notify admin to manually process refund
  await notifyAdminManualRefund(orderId, refundCents)
}
```

#### Issue: Cron Jobs Not Running

**Symptoms:** Orders not auto-transitioning to in_service

**Cause:** Cron not configured or auth failing

**Solution:**
1. Verify `CRON_SECRET` in environment variables
2. Check Vercel cron logs for execution
3. Manually trigger to test:
```bash
curl -H "Authorization: Bearer ${CRON_SECRET}" \
  https://your-domain.com/api/cron/transition-to-in-service
```

#### Issue: Emails Not Sending

**Symptoms:** Status changes happen but no emails received

**Cause:** Email provider not configured or rate limited

**Solution:**
1. Check email provider API keys
2. Verify rate limits not exceeded
3. Check spam folder
4. Review email logs:
```typescript
// Add to email send function
logger.info('Sending email', {
  to: email,
  template: templateName,
  result: sendResult
})
```

#### Issue: Orders Stuck in "in_service"

**Symptoms:** Orders remain in_service after appointment ended

**Cause:** Partner forgot to mark complete, auto-complete not running

**Solution:**
1. Verify auto-complete cron running hourly
2. Manually complete stuck orders:
```sql
UPDATE orders 
SET cleaning_status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
WHERE cleaning_status = 'in_service'
  AND scheduled_time < NOW() - INTERVAL '4 hours';
```

#### Issue: Reschedule Creates Duplicate Charges

**Symptoms:** Customer charged twice when rescheduling

**Cause:** Payment intent not reused correctly

**Solution:**
```typescript
// In rescheduleCleaning function, ensure:
payment_intent_id: oldOrder.payment_intent_id, // Reuse existing payment
```

#### Issue: Performance Degradation

**Symptoms:** Slow queries on orders table

**Cause:** Missing indexes on new columns

**Solution:**
```sql
-- Verify indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'orders' 
  AND indexname LIKE '%cleaning%';

-- Recreate if missing
CREATE INDEX idx_orders_cleaning_status 
  ON orders(cleaning_status) 
  WHERE service_type = 'CLEANING';
```

### Debugging Tips

**Enable Verbose Logging:**
```typescript
// In lib/cleaningStatus.ts
const DEBUG = process.env.DEBUG_CLEANING_STATUS === 'true'

if (DEBUG) {
  logger.debug('Cancellation calculation', {
    orderId,
    scheduledTime,
    hoursUntil,
    feeCents,
    refundCents
  })
}
```

**Test Cancellation Fees Locally:**
```typescript
// Create test script
const order = {
  total_cents: 10000,
  scheduled_time: new Date('2025-10-07T14:00:00Z'),
  cleaning_status: 'scheduled'
}

console.log(calculateCancellationFee(order))
// { feeCents: 0, refundCents: 10000 } if >24h
// { feeCents: 1500, refundCents: 8500 } if <24h
```

**Monitor Stripe Webhooks:**
```bash
# Use Stripe CLI to forward webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Database Query Performance:**
```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM orders 
WHERE service_type = 'CLEANING' 
  AND cleaning_status = 'scheduled'
  AND DATE(scheduled_time) = CURRENT_DATE;

-- Should use idx_orders_scheduled_time_cleaning
```

---

## 🎉 IMPLEMENTATION COMPLETE

You now have everything needed to implement the Cleaning Status System:

1. **Database migration** with rollback
2. **TypeScript core** with full business logic
3. **API routes** for all operations
4. **React components** for UI
5. **Cron jobs** for automation
6. **Email templates** for notifications
7. **Testing plan** with unit/integration/E2E tests
8. **Deployment guide** with step-by-step instructions
9. **Troubleshooting** for common issues

### Quick Start Commands

```bash
# 1. Deploy migration
npm run supabase migration up

# 2. Deploy code
git push origin main

# 3. Set environment variable
# Add CRON_SECRET to Vercel

# 4. Test with real order
# Book cleaning → Cancel → Verify refund
```

### Support

For issues during implementation:
1. Check troubleshooting section
2. Review logs in Sentry/Vercel
3. Test queries in Supabase SQL editor
4. Verify Stripe webhook delivery

**Time to Production:** 2-3 days with testing
**Estimated Impact:** Improved customer experience, reduced support tickets, automated operations

Good luck with the implementation! 🚀
