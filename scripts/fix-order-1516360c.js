#!/usr/bin/env node
/**
 * Fix script for order 1516360c-805f-40fe-831a-fbc9ec79f579
 * Copies stripe_customer_id from profile to order and retries payment
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const orderId = '1516360c-805f-40fe-831a-fbc9ec79f579'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!supabaseUrl || !supabaseKey || !stripeSecretKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixOrder() {
  console.log(`\n=== Fixing Order: ${orderId} ===\n`)

  // Get order with customer details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, profiles!orders_user_id_fkey(stripe_customer_id, phone, email, full_name)')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    console.error('❌ Order not found:', orderError)
    process.exit(1)
  }

  console.log('📦 Order Details:')
  console.log('  Status:', order.status)
  console.log('  Quote:', order.quote_cents, 'cents')
  console.log('  Order stripe_customer_id:', order.stripe_customer_id || '❌ Missing')
  console.log('  Profile stripe_customer_id:', order.profiles?.stripe_customer_id || '❌ Missing')
  console.log('  Payment Method:', order.saved_payment_method_id || '❌ Missing')

  // Check if profile has stripe_customer_id
  if (!order.profiles?.stripe_customer_id) {
    console.error('❌ Profile is missing stripe_customer_id. Cannot proceed.')
    process.exit(1)
  }

  // Check if order needs fixing
  if (order.stripe_customer_id) {
    console.log('✅ Order already has stripe_customer_id. Checking payment status...')
  } else {
    console.log('\n🔧 Step 1: Copying stripe_customer_id from profile to order...')
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        stripe_customer_id: order.profiles.stripe_customer_id
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('❌ Failed to update order:', updateError)
      process.exit(1)
    }

    console.log('✅ Updated order with stripe_customer_id:', order.profiles.stripe_customer_id)
  }

  // Now attempt payment if order is not already paid
  if (order.status === 'paid_processing' || order.payment_intent_id) {
    console.log('\n✅ Order is already paid or has a payment intent. No further action needed.')
    return
  }

  console.log('\n🔧 Step 2: Attempting payment charge...')
  
  const Stripe = require('stripe')
  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16'
  })

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.quote_cents,
      currency: 'usd',
      customer: order.profiles.stripe_customer_id,
      payment_method: order.saved_payment_method_id,
      confirm: true,
      off_session: true,
      metadata: { 
        order_id: orderId,
        reason: 'manual_fix_missing_customer_id'
      }
    })

    console.log('✅ Payment intent created:', paymentIntent.id)
    console.log('   Status:', paymentIntent.status)
    console.log('   Amount:', paymentIntent.amount, 'cents')

    // Update order as paid
    await supabase.from('orders').update({
      status: 'paid_processing',
      payment_intent_id: paymentIntent.id,
      paid_at: new Date().toISOString(),
      auto_charged_at: new Date().toISOString()
    }).eq('id', orderId)

    // Log the fix event
    await supabase.from('order_events').insert({
      order_id: orderId,
      actor_role: 'system',
      event_type: 'payment_manual_fix',
      payload_json: {
        payment_intent_id: paymentIntent.id,
        amount_cents: order.quote_cents,
        reason: 'Fixed missing stripe_customer_id and charged payment'
      }
    })

    console.log('✅ Order updated to paid_processing')
    console.log('\n✅ FIX COMPLETE!\n')

  } catch (error) {
    console.error('❌ Payment failed:', error.message)
    
    // Log the error
    await supabase.from('payment_retry_log').insert({
      order_id: orderId,
      error_message: error.message,
      stripe_error_code: error.code ? String(error.code) : null,
      retry_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    })

    console.log('⚠️  Error logged to payment_retry_log')
    process.exit(1)
  }
}

fixOrder().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
