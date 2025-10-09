import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { quoteLaundry } from '@/lib/pricing'
import Stripe from 'stripe'
import { canAutoCharge, getPostQuoteStatus } from '@/lib/orderStateMachine'
import { sendSMS } from '@/lib/sms'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

const adminQuoteSchema = z.object({
  actual_weight_lbs: z.number().positive(),
  notes: z.string().optional()
})

/**
 * POST /api/admin/orders/[id]/direct-quote
 * 
 * Admin submits quote and immediately auto-charges customer
 * Unlike partner quotes, admin quotes don't need approval
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: orderId } = await params
    
    // Verify user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { actual_weight_lbs, notes } = adminQuoteSchema.parse(body)
    
    const db = getServiceClient()
    
    // Get order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*, profiles!orders_user_id_fkey(phone, email)')
      .eq('id', orderId)
      .single()
    
    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    // Verify laundry order
    if (order.service_type !== 'LAUNDRY') {
      return NextResponse.json(
        { error: 'Direct quotes only for laundry orders' },
        { status: 400 }
      )
    }
    
    // Calculate quote
    const addons = order.order_details?.addons || []
    const pricing = await quoteLaundry({
      zip: order.address_snapshot.zip,
      lbs: actual_weight_lbs,
      addons
    })
    
    // Check if can auto-charge
    if (!canAutoCharge(order, 'admin')) {
      return NextResponse.json(
        { 
          error: 'Cannot auto-charge - missing payment method',
          suggestion: 'Order may be legacy. Customer must pay manually.'
        },
        { status: 400 }
      )
    }
    
    // Auto-charge customer
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: pricing.total_cents,
        currency: 'usd',
        customer: order.stripe_customer_id,
        payment_method: order.saved_payment_method_id,
        confirm: true,
        off_session: true,
        metadata: {
          order_id: orderId,
          admin_email: user.email || 'unknown',
          actual_weight_lbs: actual_weight_lbs.toString(),
          quote_type: 'admin_direct'
        }
      })
      
      // Update order with quote and payment
      const { data: updatedOrder, error: updateError } = await db
        .from('orders')
        .update({
          actual_weight_lbs,
          quote_cents: pricing.total_cents,
          quoted_at: new Date().toISOString(),
          quoted_by: user.id,
          status: 'paid_processing',
          paid_at: new Date().toISOString(),
          payment_intent_id: paymentIntent.id,
          pending_admin_approval: false, // Admin quotes don't need approval
          admin_notes: notes
        })
        .eq('id', orderId)
        .select()
        .single()
      
      if (updateError) throw updateError
      
      // Log events
      await db.from('order_events').insert([
        {
          order_id: orderId,
          actor: user.id,
          actor_role: 'admin',
          event_type: 'quote_created_by_admin',
          payload_json: {
            actual_weight_lbs,
            quote_cents: pricing.total_cents,
            notes
          }
        },
        {
          order_id: orderId,
          actor: user.id,
          actor_role: 'admin',
          event_type: 'payment_auto_charged',
          payload_json: {
            payment_intent_id: paymentIntent.id,
            amount_cents: pricing.total_cents
          }
        }
      ])
      
      // Send receipt SMS
      if (order.profiles?.phone) {
        await sendSMS({
          to: order.profiles.phone,
          message: `Tidyhood: Charged $${(pricing.total_cents / 100).toFixed(2)} for your laundry (${actual_weight_lbs} lbs). View receipt: ${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}`
        }).catch(err => console.error('SMS send failed:', err))
      }
      
      return NextResponse.json({
        success: true,
        order: updatedOrder,
        payment_intent_id: paymentIntent.id,
        quote_cents: pricing.total_cents,
        charged_immediately: true
      })
      
    } catch (stripeError: any) {
      console.error('[ADMIN_QUOTE] Stripe charge failed:', stripeError)
      
      // Log failure for retry (if payment_retry_log table exists)
      try {
        await db.from('payment_retry_log').insert({
          order_id: orderId,
          error_message: stripeError.message,
          stripe_error_code: stripeError.code || null,
          retry_at: new Date(Date.now() + 2 * 60 * 60 * 1000)
        })
      } catch (logError) {
        console.error('[ADMIN_QUOTE] Failed to log retry:', logError)
      }
      
      return NextResponse.json(
        { 
          error: 'Payment charge failed',
          details: stripeError.message,
          quote_saved: false
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('[ADMIN_QUOTE] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
