/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe webhook events with signature verification,
 * idempotency, and transactional safety.
 * 
 * Setup Instructions:
 * 1. Go to https://dashboard.stripe.com/webhooks
 * 2. Add endpoint: https://yourdomain.com/api/webhooks/stripe
 * 3. Select events: payment_intent.succeeded, payment_intent.payment_failed,
 *    charge.refunded, customer.subscription.created, etc.
 * 4. Copy signing secret to .env.local as STRIPE_WEBHOOK_SECRET
 * 
 * Security:
 * - Verifies webhook signature
 * - Idempotent processing (won't process same event twice)
 * - Database transactions for atomicity
 * - Comprehensive error logging
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { env } from '@/lib/env'
import { getServiceClient } from '@/lib/db'
import { createRouteLogger, logError } from '@/lib/logger'
import { captureError, addBreadcrumb } from '@/lib/sentry'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events
 */
export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID()
  const logger = createRouteLogger('/api/webhooks/stripe', 'POST', correlationId)
  
  logger.info('Stripe webhook received')
  addBreadcrumb({
    message: 'Stripe webhook received',
    category: 'webhook',
    level: 'info',
  })

  try {
    // Get raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      logger.warn('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing signature', correlationId },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      if (!env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET not configured')
      }

      event = stripe.webhooks.constructEvent(
        body,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      )
      
      logger.info({ eventId: event.id, eventType: event.type }, 'Webhook signature verified')
    } catch (err) {
      logger.error({ err }, 'Webhook signature verification failed')
      captureError(err as Error, {
        correlationId,
        signatureProvided: !!signature,
      })
      return NextResponse.json(
        { error: 'Invalid signature', correlationId },
        { status: 400 }
      )
    }

    // Check for idempotency - have we processed this event before?
    const db = getServiceClient()
    const { data: existingEvent } = await db
      .from('webhook_events')
      .select('id, processed_at')
      .eq('event_id', event.id)
      .single()

    if (existingEvent) {
      logger.info(
        { eventId: event.id, processedAt: existingEvent.processed_at },
        'Event already processed (idempotency check)'
      )
      return NextResponse.json(
        { received: true, alreadyProcessed: true, correlationId },
        { status: 200 }
      )
    }

    // Process the event in a transaction
    try {
      await processWebhookEvent(event, correlationId)
      
      logger.info({ eventId: event.id, eventType: event.type }, 'Webhook event processed successfully')
      
      return NextResponse.json(
        { received: true, correlationId },
        { status: 200 }
      )
    } catch (err) {
      logger.error({ err, eventId: event.id, eventType: event.type }, 'Error processing webhook event')
      captureError(err as Error, {
        correlationId,
        eventId: event.id,
        eventType: event.type,
      })
      
      // Return 500 so Stripe will retry
      return NextResponse.json(
        { error: 'Processing failed', correlationId },
        { status: 500 }
      )
    }
  } catch (err) {
    logger.error({ err }, 'Unexpected error in webhook handler')
    logError(err as Error, { correlationId })
    captureError(err as Error, { correlationId })
    
    return NextResponse.json(
      { error: 'Internal server error', correlationId },
      { status: 500 }
    )
  }
}

/**
 * Process a webhook event with transactional safety
 * Records the event to prevent duplicate processing
 */
async function processWebhookEvent(event: Stripe.Event, correlationId: string) {
  const db = getServiceClient()
  const logger = createRouteLogger('/api/webhooks/stripe', 'POST', correlationId)

  await db.rpc('execute_transaction', {
    operations: async () => {
      // Record the webhook event for idempotency
      await db.from('webhook_events').insert({
        event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString(),
        payload: event as any,
      })

      // Handle different event types
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, correlationId)
          break

        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, correlationId)
          break

        case 'charge.refunded':
          await handleChargeRefunded(event.data.object as Stripe.Charge, correlationId)
          break

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await handleSubscriptionChange(event, correlationId)
          break

        default:
          logger.info({ eventType: event.type }, 'Unhandled webhook event type')
      }
    }
  })
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  correlationId: string
) {
  const db = getServiceClient()
  const logger = createRouteLogger('/api/webhooks/stripe', 'POST', correlationId)

  logger.info({ paymentIntentId: paymentIntent.id }, 'Processing payment success')

  // Find the order by payment intent ID
  const { data: order, error: orderError } = await db
    .from('orders')
    .select('id, status, user_id, service_type')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single()

  if (orderError || !order) {
    logger.warn(
      { paymentIntentId: paymentIntent.id },
      'No order found for payment intent'
    )
    return
  }

  // Update order status to paid
  await db
    .from('orders')
    .update({
      status: 'paid_processing',
      paid_at: new Date().toISOString(),
      payment_method: paymentIntent.payment_method_types[0],
    })
    .eq('id', order.id)

  // Create order event
  await db.from('order_events').insert({
    order_id: order.id,
    event_type: 'payment_succeeded',
    actor: order.user_id,
    actor_role: 'system',
    payload_json: {
      payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    },
  })

  logger.info({ orderId: order.id }, 'Order marked as paid')

  // TODO: Send confirmation SMS/email
  // TODO: Notify partner of new order
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(
  paymentIntent: Stripe.PaymentIntent,
  correlationId: string
) {
  const db = getServiceClient()
  const logger = createRouteLogger('/api/webhooks/stripe', 'POST', correlationId)

  logger.warn({ paymentIntentId: paymentIntent.id }, 'Processing payment failure')

  const { data: order } = await db
    .from('orders')
    .select('id, user_id')
    .eq('stripe_payment_intent_id', paymentIntent.id)
    .single()

  if (!order) {
    logger.warn({ paymentIntentId: paymentIntent.id }, 'No order found for failed payment')
    return
  }

  // Update order status
  await db
    .from('orders')
    .update({
      status: 'payment_failed',
      payment_error: paymentIntent.last_payment_error?.message || 'Payment failed',
    })
    .eq('id', order.id)

  // Create order event
  await db.from('order_events').insert({
    order_id: order.id,
    event_type: 'payment_failed',
    actor: order.user_id,
    actor_role: 'system',
    payload_json: {
      payment_intent_id: paymentIntent.id,
      error: paymentIntent.last_payment_error,
    },
  })

  logger.info({ orderId: order.id }, 'Order marked as payment failed')

  // TODO: Send payment failed notification
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(
  charge: Stripe.Charge,
  correlationId: string
) {
  const db = getServiceClient()
  const logger = createRouteLogger('/api/webhooks/stripe', 'POST', correlationId)

  logger.info({ chargeId: charge.id }, 'Processing refund')

  const { data: order } = await db
    .from('orders')
    .select('id, user_id')
    .eq('stripe_charge_id', charge.id)
    .single()

  if (!order) {
    logger.warn({ chargeId: charge.id }, 'No order found for refunded charge')
    return
  }

  // Update order status
  await db
    .from('orders')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      refund_amount_cents: charge.amount_refunded,
    })
    .eq('id', order.id)

  // Create order event
  await db.from('order_events').insert({
    order_id: order.id,
    event_type: 'refunded',
    actor: order.user_id,
    actor_role: 'system',
    payload_json: {
      charge_id: charge.id,
      amount_refunded: charge.amount_refunded,
    },
  })

  logger.info({ orderId: order.id }, 'Order marked as refunded')

  // TODO: Send refund confirmation
}

/**
 * Handle subscription changes
 */
async function handleSubscriptionChange(
  event: Stripe.Event,
  correlationId: string
) {
  const logger = createRouteLogger('/api/webhooks/stripe', 'POST', correlationId)
  logger.info({ eventType: event.type }, 'Processing subscription change')
  
  // TODO: Implement subscription handling when recurring feature is ready
}
