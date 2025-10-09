#!/usr/bin/env node
/**
 * Fix script to add missing stripe_customer_id and retry payment
 * Usage: node scripts/fix-order-payment.js <order_id>
 */

const { createClient } = require('@supabase/supabase-js')
const Stripe = require('stripe')
require('dotenv').config({ path: '.env.local' })

const orderId = process.argv[2]

if (!orderId) {
  console.error('Usage: node scripts/fix-order-payment.js <order_id>')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const stripeKey = process.env.STRIPE_SECRET_KEY

if (!supabaseUrl || !supabaseKey || !stripeKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' })

async function fixOrderPayment() {
  console.log(`\n=== Fixing Order Payment: ${orderId} ===\n`)

  // Get order with user profile
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, profiles!orders_user_id_fkey(stripe_customer_id, phone, email)')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    console.error('❌ Order not found:', orderError)
    process.exit(1)
  }

  console.log('📦 Order Status:', order.status)
  console.log('💰 Quote:', `$${(order.quote_cents / 100).toFixed(2)}`)
  console.log('💳 Saved Payment Method:', order.saved_payment_method_id || '❌ Missing')
  console.log('👤 Order Stripe Customer ID:', order.stripe_customer_id || '❌ Missing')
  console.log('👤 Profile Stripe Customer ID:', order.profiles?.stripe_customer_id || '❌ Missing')

  // Validation
  if (!order.saved_payment_method_id) {
    console.error('\n❌ Cannot fix: Order has no saved payment method')
    process.exit(1)
  }

  if (!order.profiles?.stripe_customer_id) {
    console.error('\n❌ Cannot fix: User profile has no Stripe customer ID')
    process.exit(1)
  }

  if (order.payment_intent_id) {
    console.log('\n⚠️  Order already has payment_intent_id:', order.payment_intent_id)
    console.log('Checking payment status...')
    
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.payment_intent_id)
      console.log('Payment Intent Status:', paymentIntent.status)
      
      if (paymentIntent.status === 'succeeded') {
        console.log('✅ Payment already succeeded, updating order status...')
        await supabase.from('orders').update({
          status: 'paid_processing',
          paid_at: new Date().toISOString()
        }).eq('id', orderId)
        console.log('✅ Order updated to paid_processing')
        return
      }
    } catch (err) {
      console.log('Error checking payment intent:', err.message)
    }
  }

  // Step 1: Create payment intent and charge
  console.log('\n� Step 1: Creating payment intent and charging customer...')
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.quote_cents,
      currency: 'usd',
      customer: order.profiles.stripe_customer_id,
      payment_method: order.saved_payment_method_id,
      confirm: true,
      off_session: true, // Allow charging without customer being present
      metadata: {
        order_id: orderId,
        reason: 'manual_fix_missing_customer_id'
      }
    })

    console.log('✅ Payment Intent created:', paymentIntent.id)
    console.log('   Status:', paymentIntent.status)
    console.log('   Amount:', `$${(paymentIntent.amount / 100).toFixed(2)}`)

    // Step 3: Update order with payment details
    console.log('\n📝 Step 3: Updating order with payment details...')
    const { error: paymentUpdateError } = await supabase
      .from('orders')
      .update({
        status: 'paid_processing',
        payment_intent_id: paymentIntent.id,
        paid_at: new Date().toISOString(),
        auto_charged_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (paymentUpdateError) {
      console.error('❌ Failed to update order with payment details:', paymentUpdateError)
      process.exit(1)
    }
    console.log('✅ Order updated to paid_processing')

    // Step 4: Log event
    console.log('\n📋 Step 4: Logging payment event...')
    await supabase.from('order_events').insert({
      order_id: orderId,
      actor: order.user_id,
      actor_role: 'system',
      event_type: 'payment_auto_charged',
      payload_json: {
        payment_intent_id: paymentIntent.id,
        amount_cents: order.quote_cents,
        fix_reason: 'missing_customer_id_on_order',
        manual_fix: true
      }
    })
    console.log('✅ Event logged')

    // Step 5: Send SMS notification
    if (order.profiles?.phone) {
      console.log('\n📱 Step 5: Sending payment confirmation SMS...')
      const amount = `$${(order.quote_cents / 100).toFixed(2)}`
      const message = `Tidyhood: Payment of ${amount} processed successfully for your ${order.service_type.toLowerCase()} order. View receipt: ${process.env.NEXT_PUBLIC_BASE_URL}/orders/${orderId}`
      
      // SMS would be sent via Twilio here - skipping for now as it requires Twilio setup
      console.log('📱 SMS message prepared (not sent in this script):', message)
    }

    console.log('\n✅ Order payment fixed successfully!')
    console.log(`\nOrder ${orderId} has been charged $${(order.quote_cents / 100).toFixed(2)} and marked as paid_processing.`)

  } catch (error) {
    console.error('\n❌ Payment failed:', error.message)
    
    if (error.code) {
      console.error('   Stripe Error Code:', error.code)
    }
    
    // Log failure for retry
    await supabase.from('payment_retry_log').insert({
      order_id: orderId,
      error_message: error.message,
      stripe_error_code: error.code ? String(error.code) : null,
      retry_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    })
    
    console.error('\n   Payment retry scheduled for 2 hours from now')
    process.exit(1)
  }
}

fixOrderPayment().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
