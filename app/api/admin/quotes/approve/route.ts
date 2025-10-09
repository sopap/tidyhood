import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { sendSMS } from '@/lib/sms'

const approveQuoteSchema = z.object({
  order_id: z.string().uuid()
})

// POST /api/admin/quotes/approve - Approve partner quote and auto-charge customer
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Verify user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { order_id } = approveQuoteSchema.parse(body)
    
    const db = getServiceClient()
    
    // Get order with customer details
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*, profiles!orders_user_id_fkey(phone, email, full_name)')
      .eq('id', order_id)
      .single()
    
    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // Verify order is pending admin approval
    if (!order.pending_admin_approval) {
      return NextResponse.json(
        { error: 'Order is not awaiting approval' },
        { status: 400 }
      )
    }
    
    // Verify order has a quote
    if (!order.quote_cents) {
      return NextResponse.json(
        { error: 'Order does not have a quote' },
        { status: 400 }
      )
    }
    
    // Verify customer has saved payment method
    if (!order.saved_payment_method_id || !order.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Customer does not have a saved payment method' },
        { status: 400 }
      )
    }
    
    // Auto-charge customer's saved card
    try {
      const Stripe = (await import('stripe')).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2023-10-16'
      })
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: order.quote_cents,
        currency: 'usd',
        customer: order.stripe_customer_id,
        payment_method: order.saved_payment_method_id,
        confirm: true,
        off_session: true, // Allow charging without customer being present
        metadata: { 
          order_id: order_id,
          admin_email: user.email || 'unknown',
          reason: 'partner_quote_approved'
        }
      })
      
      // Update order as paid and approved
      await db.from('orders').update({
        status: 'paid_processing',
        paid_at: new Date().toISOString(),
        pending_admin_approval: false,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      }).eq('id', order_id)
      
      // Log approval and auto-charge events
      await db.from('order_events').insert([
        {
          order_id: order_id,
          actor: user.id,
          actor_role: 'admin',
          event_type: 'quote_approved',
          payload_json: {
            approved_by: user.email,
            quote_cents: order.quote_cents
          }
        },
        {
          order_id: order_id,
          actor: user.id,
          actor_role: 'admin',
          event_type: 'payment_auto_charged',
          payload_json: {
            payment_intent_id: paymentIntent.id,
            amount_cents: order.quote_cents,
            admin_email: user.email
          }
        }
      ])
      
      // Send receipt SMS to customer
      if (order.profiles?.phone) {
        const amount = `$${(order.quote_cents / 100).toFixed(2)}`
        const serviceType = order.service_type.toLowerCase()
        
        await sendSMS({
          to: order.profiles.phone,
          message: `Tidyhood: Charged ${amount} for your ${serviceType} order. View receipt: ${process.env.NEXT_PUBLIC_BASE_URL}/orders/${order_id}`
        }).catch(err => {
          console.error('[QUOTE_APPROVAL] Failed to send receipt SMS:', err)
          // Don't throw - SMS failure shouldn't block approval
        })
      }
      
      return NextResponse.json({
        success: true,
        payment_intent_id: paymentIntent.id,
        amount_charged: order.quote_cents,
        receipt_sent: !!order.profiles?.phone
      })
      
    } catch (error: any) {
      console.error('[QUOTE_APPROVAL] Auto-charge failed:', error)
      
      // Log payment failure
      await db.from('payment_retry_log').insert({
        order_id: order_id,
        error_message: error.message,
        stripe_error_code: error.code ? String(error.code) : null,
        retry_at: new Date(Date.now() + 2 * 60 * 60 * 1000) // Retry in 2 hours
      })
      
      return NextResponse.json(
        { 
          error: 'Payment charge failed',
          details: error.message,
          logged_for_retry: true
        },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Quote approval error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
