import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { NotFoundError, ConflictError, handleApiError } from '@/lib/errors'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

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
    
    // Check if already paid
    if (order.status !== 'PENDING') {
      throw new ConflictError('Order already processed')
    }
    
    // Check idempotency
    const idempotencyKey = request.headers.get('idempotency-key')
    if (!idempotencyKey) {
      throw new ConflictError('Missing Idempotency-Key header')
    }
    
    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: order.total_cents,
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
    
    // Update order with payment ID
    const { error: updateError } = await db
      .from('orders')
      .update({
        payment_id: paymentIntent.id,
        status: 'PAID',
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
      status: 'PAID',
    })
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}
