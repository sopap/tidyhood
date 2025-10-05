import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { canTransition, validateTransition } from '@/lib/orderStateMachine'
import { NotFoundError, ConflictError, ValidationError, handleApiError } from '@/lib/errors'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

/**
 * POST /api/orders/:id/pay - Process payment for an order
 * 
 * For LAUNDRY orders: Payment after quote acceptance (awaiting_payment → processing)
 * For CLEANING orders: Upfront payment (scheduled → processing)
 * 
 * Uses unified state machine to validate transitions
 * Requires idempotency key for safe retries
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const db = getServiceClient()
    
    // Fetch order
    const { data: order, error } = await db
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()
    
    if (error || !order) {
      throw new NotFoundError('Order not found')
    }
    
    // Validate payment eligibility using state machine
    const targetStatus = 'processing'
    const serviceType = order.service_type as 'LAUNDRY' | 'CLEANING'
    
    // Check if transition is valid
    if (!canTransition(order.status, targetStatus, serviceType, order)) {
      throw new ValidationError(
        `Payment not allowed for order in ${order.status} status`,
        'PAYMENT_NOT_ALLOWED'
      )
    }
    
    // For laundry orders, ensure quote exists and payment field is set
    if (serviceType === 'LAUNDRY' && order.status === 'awaiting_payment') {
      if (!order.quote && !order.quote_cents) {
        throw new ValidationError(
          'No quote available for this order',
          'MISSING_QUOTE'
        )
      }
    }
    
    // Check idempotency
    const idempotencyKey = request.headers.get('idempotency-key')
    if (!idempotencyKey) {
      throw new ValidationError('Missing Idempotency-Key header')
    }
    
    // Determine amount to charge based on service type and status
    let amountToCharge: number
    
    if (serviceType === 'LAUNDRY' && order.quote_cents) {
      // Use quote amount for laundry after inspection
      amountToCharge = order.quote_cents
    } else if (order.quote && order.quote.totalCents) {
      // Use structured quote if available
      amountToCharge = order.quote.totalCents
    } else {
      // Fall back to original estimate
      amountToCharge = order.total_cents
    }
    
    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountToCharge,
        currency: 'usd',
        metadata: {
          order_id: order.id,
          user_id: user.id,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      },
      {
        idempotencyKey,
      }
    )
    
    // Validate the full transition before updating
    const validation = validateTransition(order.status, targetStatus, serviceType, {
      ...order,
      paid_at: new Date().toISOString()
    })
    
    if (!validation.valid) {
      throw new ValidationError(
        validation.error || 'Cannot process payment at this time',
        'INVALID_TRANSITION'
      )
    }
    
    // Update order with payment ID and transition to processing
    const { error: updateError } = await db
      .from('orders')
      .update({
        payment_id: paymentIntent.id,
        status: targetStatus,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)
    
    if (updateError) throw updateError
    
    // Create order event
    await db.from('order_events').insert({
      order_id: order.id,
      actor: user.id,
      actor_role: 'user',
      event_type: 'payment_completed',
      payload_json: {
        payment_intent_id: paymentIntent.id,
        amount: order.total_cents,
      },
    })
    
    // Create invoice record
    await db.from('invoices').insert({
      order_id: order.id,
      tax_breakdown_json: {
        taxable_subtotal_cents: order.tax_cents > 0 ? Math.round(order.subtotal_cents * 0.9) : 0,
        tax_exempt_subtotal_cents: order.tax_cents === 0 ? order.subtotal_cents : Math.round(order.subtotal_cents * 0.1),
        tax_rate: 0.08875,
      },
    })
    
    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      order_id: order.id,
      status: targetStatus,
      amount_charged: amountToCharge,
      previous_status: order.status,
    })
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}
