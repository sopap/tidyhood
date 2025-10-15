import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { quoteLaundry } from '@/lib/pricing'
import { handleApiError } from '@/lib/errors'
import { sendSMS } from '@/lib/sms'

const updateQuoteSchema = z.object({
  quote_cents: z.number().int().positive(),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  notify_customer: z.boolean().default(false),
  // Service-specific fields
  actual_weight_lbs: z.number().positive().optional(),
  estimated_minutes: z.number().int().positive().optional(),
  line_items: z.array(z.object({
    item: z.string(),
    price_cents: z.number().int()
  })).optional()
})

// POST /api/admin/orders/[id]/update-quote - Admin override for order quotes
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
    const validated = updateQuoteSchema.parse(body)
    const { 
      quote_cents, 
      reason, 
      notify_customer,
      actual_weight_lbs,
      estimated_minutes,
      line_items 
    } = validated
    
    const db = getServiceClient()
    
    // Get order with customer details
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*, profiles!orders_user_id_fkey(phone, email, full_name)')
      .eq('id', orderId)
      .single()
    
    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // CRITICAL: Block updates to completed orders
    if (order.status === 'completed' || order.status === 'delivered') {
      return NextResponse.json(
        { 
          error: 'Cannot update quote for completed orders. Please use the refund endpoint to make adjustments.',
          status: order.status
        },
        { status: 400 }
      )
    }
    
    // Store previous values for audit
    const previousQuoteCents = order.quote_cents
    const previousWeightLbs = order.actual_weight_lbs
    
    // Calculate variance
    const variancePercent = previousQuoteCents 
      ? ((quote_cents - previousQuoteCents) / previousQuoteCents) * 100 
      : 0
    
    // Warn about payment intent conflicts
    let paymentWarning = null
    if (order.status === 'awaiting_payment' && order.payment_intent_id) {
      paymentWarning = {
        message: 'Order has an active payment intent. Quote change may require payment intent update.',
        payment_intent_id: order.payment_intent_id,
        action_required: 'Manual payment intent update may be needed'
      }
      
      console.warn('[ADMIN_QUOTE_UPDATE] Payment intent exists:', {
        orderId,
        payment_intent_id: order.payment_intent_id,
        old_quote: previousQuoteCents,
        new_quote: quote_cents
      })
    }
    
    // Prepare update payload
    const updates: any = {
      quote_cents,
      quoted_at: new Date().toISOString()
    }
    
    // Add service-specific fields
    if (actual_weight_lbs !== undefined) {
      updates.actual_weight_lbs = actual_weight_lbs
    }
    
    // Update partner_notes with admin override record
    const adminNote = `[${new Date().toISOString()}] Admin quote update by ${user.email}: ${reason}`
    updates.partner_notes = order.partner_notes 
      ? `${order.partner_notes}\n\n${adminNote}`
      : adminNote
    
    // Status logic:
    // - For orders WITH payment method: Don't change status yet, let auto-charge handle it
    // - For orders WITHOUT payment method (legacy): Set to awaiting_payment for manual payment
    // - For already paid orders: Don't change status
    const hasPaymentMethod = !!(order.saved_payment_method_id && order.stripe_customer_id)
    
    if (order.status !== 'completed' && order.status !== 'delivered' && order.status !== 'paid_processing') {
      if (!hasPaymentMethod) {
        // Legacy order without payment method - requires manual payment
        updates.status = 'awaiting_payment'
        console.log('[ADMIN_QUOTE_UPDATE] Setting status to awaiting_payment (legacy order, no payment method)')
      } else {
        // Order has payment method - will attempt auto-charge, don't change status yet
        console.log('[ADMIN_QUOTE_UPDATE] Order has payment method, will attempt auto-charge')
      }
    }
    
    // Update order
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating order quote:', updateError)
      throw updateError
    }
    
    // Log event to order_events
    await db.from('order_events').insert({
      order_id: orderId,
      actor: user.id,
      actor_role: 'admin',
      event_type: 'admin_quote_override',
      payload_json: {
        previous_quote_cents: previousQuoteCents,
        new_quote_cents: quote_cents,
        variance_percent: Math.round(variancePercent * 10) / 10,
        reason,
        changed_by: user.email,
        actual_weight_lbs: actual_weight_lbs || previousWeightLbs,
        estimated_minutes,
        line_items,
        payment_warning: paymentWarning
      }
    })
    
    // AUTO-CHARGE: Admin quotes automatically charge customer's saved card
    let autoChargeSuccess = false
    let paymentIntentId = null
    
    console.log('[ADMIN_QUOTE_UPDATE] Checking auto-charge eligibility:', {
      orderId,
      has_payment_method: !!order.saved_payment_method_id,
      has_customer_id: !!order.stripe_customer_id,
      payment_method_id: order.saved_payment_method_id,
      customer_id: order.stripe_customer_id
    })
    
    if (order.saved_payment_method_id && order.stripe_customer_id) {
      try {
        console.log('[ADMIN_QUOTE_UPDATE] Attempting auto-charge:', {
          orderId,
          amount: quote_cents,
          payment_method_id: order.saved_payment_method_id,
          customer_id: order.stripe_customer_id
        })
        
        const Stripe = (await import('stripe')).default
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2023-10-16'
        })
        
        const paymentIntent = await stripe.paymentIntents.create({
          amount: quote_cents,
          currency: 'usd',
          customer: order.stripe_customer_id,
          payment_method: order.saved_payment_method_id,
          confirm: true,
          off_session: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          },
          metadata: { 
            order_id: orderId,
            admin_email: user.email || 'unknown',
            reason: 'admin_quote_update'
          }
        })
        
        // Capture receipt data from payment intent
        let receiptData: any = {}
        if (paymentIntent.latest_charge) {
          try {
            // latest_charge could be either a string ID or an expanded Charge object
            const chargeId = typeof paymentIntent.latest_charge === 'string' 
              ? paymentIntent.latest_charge 
              : paymentIntent.latest_charge.id
            
            const charge = await stripe.charges.retrieve(chargeId, {
              expand: ['receipt_url']
            })
            
            console.log('[ADMIN_QUOTE_UPDATE] Retrieved charge:', {
              id: charge.id,
              has_receipt_url: !!charge.receipt_url,
              receipt_url: charge.receipt_url,
              receipt_number: charge.receipt_number
            })
            
            receiptData = {
              stripe_charge_id: charge.id,
              stripe_receipt_url: charge.receipt_url || null,
              stripe_receipt_number: charge.receipt_number || null
            }
            
            console.log('[ADMIN_QUOTE_UPDATE] Captured receipt data:', receiptData)
          } catch (chargeError) {
            console.error('[ADMIN_QUOTE_UPDATE] Failed to retrieve charge for receipt:', chargeError)
          }
        } else {
          console.warn('[ADMIN_QUOTE_UPDATE] No latest_charge on payment intent')
        }
        
        // Update order as paid with receipt data
        await db.from('orders').update({
          status: 'paid_processing',
          payment_intent_id: paymentIntent.id,
          paid_at: new Date().toISOString(),
          auto_charged_at: new Date().toISOString(),
          ...receiptData
        }).eq('id', orderId)
        
        autoChargeSuccess = true
        paymentIntentId = paymentIntent.id
        
        // Send receipt SMS instead of payment link
        if (order.profiles?.phone) {
          const amount = `$${(quote_cents / 100).toFixed(2)}`
          await sendSMS({
            to: order.profiles.phone,
            message: `Tidyhood: Charged ${amount} for your ${order.service_type.toLowerCase()} order. View receipt: ${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}`
          }).catch(err => {
            console.error('[ADMIN_QUOTE_UPDATE] Failed to send receipt SMS:', err)
          })
        }
        
        // Log successful auto-charge
        await db.from('order_events').insert({
          order_id: orderId,
          actor: user.id,
          actor_role: 'admin',
          event_type: 'payment_auto_charged',
          payload_json: {
            payment_intent_id: paymentIntent.id,
            amount_cents: quote_cents,
            admin_email: user.email
          }
        })
        
        console.log('[ADMIN_QUOTE_UPDATE] Payment intent created successfully:', {
          payment_intent_id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount
        })
        
      } catch (error: any) {
        console.error('[ADMIN_QUOTE_UPDATE] Auto-charge failed:', {
          orderId,
          error_message: error.message,
          error_code: error.code,
          error_type: error.type,
          error_stack: error.stack
        })
        
        // Log payment failure for retry
        await db.from('payment_retry_log').insert({
          order_id: orderId,
          error_message: error.message,
          stripe_error_code: error.code ? String(error.code) : null,
          retry_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Retry in 2 hours
          attempts: 1
        })
        
        // Fallback to manual payment flow
        if (notify_customer && order.profiles?.phone) {
          const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}/pay`
          const amount = `$${(quote_cents / 100).toFixed(2)}`
          await sendSMS({
            to: order.profiles.phone,
            message: `Tidyhood: Your order quote is ready! ${amount}. Pay now: ${paymentUrl}`
          }).catch(err => {
            console.error('[ADMIN_QUOTE_UPDATE] Failed to send SMS:', err)
          })
        }
      }
    } else {
      console.log('[ADMIN_QUOTE_UPDATE] Auto-charge skipped - missing required fields:', {
        orderId,
        has_payment_method: !!order.saved_payment_method_id,
        has_customer_id: !!order.stripe_customer_id,
        reason: !order.saved_payment_method_id ? 'No payment method' : 'No customer ID'
      })
      
      // No saved payment method - send payment link if notify requested
      if (notify_customer && order.profiles?.phone) {
        const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}/pay`
        const amount = `$${(quote_cents / 100).toFixed(2)}`
        await sendSMS({
          to: order.profiles.phone,
          message: `Tidyhood: Your order quote is ready! ${amount}. Pay now: ${paymentUrl}`
        }).catch(err => {
          console.error('[ADMIN_QUOTE_UPDATE] Failed to send SMS:', err)
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      order: updatedOrder,
      previous_quote_cents: previousQuoteCents,
      variance_percent: Math.round(variancePercent * 10) / 10,
      payment_warning: paymentWarning,
      auto_charged: autoChargeSuccess,
      payment_intent_id: paymentIntentId,
      sms_sent: order.profiles?.phone ? true : false
    })
    
  } catch (error) {
    console.error('Admin quote update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.statusCode }
    )
  }
}
