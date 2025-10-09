import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceClient } from '@/lib/db';
import { logger } from '@/lib/logger';
import { classifyPaymentError } from '@/lib/payment-errors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * POST /api/webhooks/stripe-payment
 * 
 * Handles Stripe webhook events for payment authorization system.
 * Implements idempotency to prevent duplicate processing.
 * 
 * Events handled:
 * - payment_intent.payment_failed: Authorization declined
 * - payment_intent.canceled: Authorization expired
 * - payment_intent.requires_action: 3DS challenge needed
 * - charge.dispute.created: Customer disputed charge
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');
    
    if (!sig) {
      logger.error({ event: 'webhook_missing_signature' });
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }
    
    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      logger.error({ 
        event: 'webhook_signature_invalid', 
        error: err instanceof Error ? err.message : 'Unknown error'
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    const db = getServiceClient();
    
    // Check for duplicate webhook (idempotency)
    const { data: existing } = await db
      .from('webhook_events')
      .select('id')
      .eq('stripe_event_id', event.id)
      .single();
    
    if (existing) {
      logger.info({
        event: 'webhook_already_processed',
        stripe_event_id: event.id,
        event_type: event.type
      });
      return NextResponse.json({ received: true, already_processed: true });
    }
    
    // Log webhook received
    logger.info({
      event: 'webhook_received',
      stripe_event_id: event.id,
      event_type: event.type
    });
    
    // Handle event based on type
    switch (event.type) {
      // Setup Intent events (card saving)
      case 'setup_intent.setup_failed':
        await handleSetupFailed(event.data.object as Stripe.SetupIntent, db);
        break;
        
      case 'setup_intent.succeeded':
        await handleSetupSucceeded(event.data.object as Stripe.SetupIntent, db);
        break;
      
      // Payment Intent events (final charging)
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, db);
        break;
        
      case 'payment_intent.requires_action':
        await handleRequiresAction(event.data.object as Stripe.PaymentIntent, db);
        break;
        
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object as Stripe.Dispute, db);
        break;
        
      default:
        logger.info({
          event: 'webhook_unhandled_type',
          stripe_event_id: event.id,
          event_type: event.type
        });
    }
    
    // Mark webhook as processed
    await db.from('webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload_json: event.data.object,
      processed_at: new Date().toISOString()
    });
    
    return NextResponse.json({ received: true });
    
  } catch (error) {
    logger.error({ 
      event: 'webhook_error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * Handle setup_intent.setup_failed event
 * Card could not be saved/validated
 */
async function handleSetupFailed(setupIntent: Stripe.SetupIntent, db: any) {
  const orderId = setupIntent.metadata?.order_id;
  
  if (!orderId) {
    logger.warn({ event: 'webhook_missing_order_id', setup_intent_id: setupIntent.id });
    return;
  }
  
  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('setup_intent_id', setupIntent.id)
    .single();
  
  if (!order) {
    logger.warn({ event: 'webhook_order_not_found', order_id: orderId });
    return;
  }
  
  // Classify the error
  const error = setupIntent.last_setup_error;
  const classified = classifyPaymentError(error);
  
  // Update order status
  await db.from('orders').update({
    status: 'payment_failed',
    payment_error: classified.message,
    payment_error_code: error?.code,
    updated_at: new Date().toISOString()
  }).eq('id', order.id);
  
  logger.error({
    event: 'setup_intent_failed',
    order_id: order.id,
    error_type: classified.type,
    error_code: error?.code
  });
  
  // TODO: Send SMS to customer about card validation failure
}

/**
 * Handle setup_intent.succeeded event
 * Payment method successfully saved
 */
async function handleSetupSucceeded(setupIntent: Stripe.SetupIntent, db: any) {
  logger.info({
    event: 'setup_intent_succeeded',
    setup_intent_id: setupIntent.id,
    payment_method: setupIntent.payment_method,
    customer: setupIntent.customer
  });
  
  // No action needed - saga already handled this
  // Just log for monitoring
}

/**
 * Handle payment_intent.payment_failed event
 * FINAL charge failed (not setup - this is when charging quote amount)
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, db: any) {
  const orderId = paymentIntent.metadata.order_id;
  
  if (!orderId) {
    logger.warn({ event: 'webhook_missing_order_id', payment_intent_id: paymentIntent.id });
    return;
  }
  
  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();
  
  if (!order) {
    logger.warn({ event: 'webhook_order_not_found', order_id: orderId });
    return;
  }
  
  // Classify the error
  const error = paymentIntent.last_payment_error;
  const classified = classifyPaymentError(error);
  
  // Update order status
  await db.from('orders').update({
    status: 'payment_failed',
    payment_error: classified.message,
    payment_error_code: error?.code,
    capture_attempt_count: (order.capture_attempt_count || 0) + 1,
    updated_at: new Date().toISOString()
  }).eq('id', order.id);
  
  // Log event
  await db.from('order_events').insert({
    order_id: order.id,
    actor_role: 'system',
    event_type: 'final_charge_failed',
    payload_json: {
      error_type: classified.type,
      error_message: classified.message,
      error_code: error?.code,
      attempt_number: (order.capture_attempt_count || 0) + 1
    }
  });
  
  logger.error({
    event: 'final_charge_failed',
    order_id: order.id,
    error_type: classified.type,
    error_code: error?.code,
    attempt_number: (order.capture_attempt_count || 0) + 1
  });
  
  // TODO: Send SMS with payment update link
  // TODO: Start 24h grace period timer
}

/**
 * Handle payment_intent.requires_action event
 * 3D Secure authentication required
 */
async function handleRequiresAction(paymentIntent: Stripe.PaymentIntent, db: any) {
  logger.info({
    event: 'payment_requires_action',
    payment_intent_id: paymentIntent.id,
    next_action_type: paymentIntent.next_action?.type
  });
  
  // Customer will be redirected to complete 3DS
  // No action needed here, just log for monitoring
}

/**
 * Handle charge.dispute.created event
 * Customer initiated a chargeback
 */
async function handleDisputeCreated(dispute: Stripe.Dispute, db: any) {
  // Find order by payment_id
  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('payment_id', dispute.payment_intent)
    .single();
  
  if (!order) {
    // Try finding by auth_payment_intent_id
    const { data: authOrder } = await db
      .from('orders')
      .select('*')
      .eq('auth_payment_intent_id', dispute.payment_intent)
      .single();
    
    if (!authOrder) {
      logger.warn({ event: 'webhook_dispute_order_not_found', dispute_id: dispute.id });
      return;
    }
  }
  
  const targetOrder = order;
  
  // Log dispute
  await db.from('order_events').insert({
    order_id: targetOrder.id,
    event_type: 'dispute_created',
    actor_role: 'system',
    payload_json: {
      dispute_id: dispute.id,
      charge_id: dispute.charge,
      amount: dispute.amount,
      reason: dispute.reason,
      status: dispute.status
    }
  });
  
  logger.error({
    event: 'dispute_created',
    order_id: targetOrder.id,
    dispute_id: dispute.id,
    charge_id: dispute.charge,
    amount: dispute.amount,
    reason: dispute.reason
  });
  
  // TODO: Alert admin team about dispute
  // TODO: Send email to support team
}
