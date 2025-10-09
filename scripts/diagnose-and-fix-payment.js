#!/usr/bin/env node

/**
 * Diagnostic and Payment Fix Script
 * 
 * Usage: node scripts/diagnose-and-fix-payment.js <order_id>
 * 
 * This script will:
 * 1. Check order details and payment status
 * 2. Verify payment method is saved
 * 3. Check for any payment retry logs
 * 4. Attempt to charge the customer
 * 5. Send payment link if charge fails
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const Stripe = require('stripe')

const ORDER_ID = process.argv[2]

if (!ORDER_ID) {
  console.error('❌ Usage: node scripts/diagnose-and-fix-payment.js <order_id>')
  process.exit(1)
}

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
})

async function main() {
  console.log('🔍 Diagnosing Order:', ORDER_ID)
  console.log('=' .repeat(60))
  
  // 1. Fetch order details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, profiles!orders_user_id_fkey(phone, email, full_name)')
    .eq('id', ORDER_ID)
    .single()
  
  if (orderError || !order) {
    console.error('❌ Order not found:', orderError?.message)
    process.exit(1)
  }
  
  console.log('\n📦 ORDER DETAILS:')
  console.log('  Order ID:', order.id)
  console.log('  Service Type:', order.service_type)
  console.log('  Status:', order.status)
  console.log('  Quote Amount:', order.quote_cents ? `$${(order.quote_cents / 100).toFixed(2)}` : 'NOT SET')
  console.log('  Customer:', order.profiles?.full_name || 'Unknown')
  console.log('  Email:', order.profiles?.email || 'N/A')
  console.log('  Phone:', order.profiles?.phone || 'N/A')
  
  console.log('\n💳 PAYMENT DETAILS:')
  console.log('  Stripe Customer ID:', order.stripe_customer_id || '❌ NOT SET')
  console.log('  Saved Payment Method:', order.saved_payment_method_id || '❌ NOT SET')
  console.log('  Payment Intent ID:', order.payment_intent_id || 'None')
  console.log('  Paid At:', order.paid_at || 'Not paid')
  console.log('  Auto Charged At:', order.auto_charged_at || 'Not auto-charged')
  
  // 2. Check if quote is set
  if (!order.quote_cents) {
    console.log('\n⚠️  Order does not have a quote set')
    process.exit(0)
  }
  
  // 3. Check payment retry log
  console.log('\n📝 CHECKING PAYMENT RETRY LOG:')
  const { data: retryLogs } = await supabase
    .from('payment_retry_log')
    .select('*')
    .eq('order_id', ORDER_ID)
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (retryLogs && retryLogs.length > 0) {
    console.log('  Found', retryLogs.length, 'retry log entries:')
    retryLogs.forEach((log, i) => {
      console.log(`\n  [${i + 1}] ${log.created_at}`)
      console.log(`      Error: ${log.error_message}`)
      console.log(`      Stripe Code: ${log.stripe_error_code || 'N/A'}`)
      console.log(`      Retry At: ${log.retry_at || 'N/A'}`)
    })
  } else {
    console.log('  No retry logs found')
  }
  
  // 4. Check order events
  console.log('\n📋 RECENT ORDER EVENTS:')
  const { data: events } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', ORDER_ID)
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (events && events.length > 0) {
    events.forEach(event => {
      console.log(`  - ${event.event_type} (${event.actor_role}) at ${event.created_at}`)
    })
  }
  
  // 5. Determine next action
  console.log('\n' + '='.repeat(60))
  
  if (!order.stripe_customer_id || !order.saved_payment_method_id) {
    console.log('\n❌ ISSUE: Customer has not set up payment method')
    console.log('\n💡 SOLUTION:')
    console.log('  1. Customer needs to visit:', `${process.env.NEXT_PUBLIC_BASE_URL}/orders/${ORDER_ID}`)
    console.log('  2. Click "Set Up Payment" to authorize their card')
    console.log('  3. After authorization, the charge will be processed automatically')
    console.log('\n📧 Or send customer a payment link:')
    console.log(`  ${process.env.NEXT_PUBLIC_BASE_URL}/orders/${ORDER_ID}/pay`)
    process.exit(0)
  }
  
  // 6. Customer has payment method - try to charge
  console.log('\n✅ Customer has payment method set up')
  console.log('\n🔄 Attempting to charge customer...')
  
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.quote_cents,
      currency: 'usd',
      customer: order.stripe_customer_id,
      payment_method: order.saved_payment_method_id,
      confirm: true,
      metadata: {
        order_id: ORDER_ID,
        manual_charge: 'true',
        reason: 'diagnostic_script'
      }
    })
    
    console.log('✅ PAYMENT SUCCESSFUL!')
    console.log('  Payment Intent ID:', paymentIntent.id)
    console.log('  Amount:', `$${(paymentIntent.amount / 100).toFixed(2)}`)
    console.log('  Status:', paymentIntent.status)
    
    // Update order
    await supabase.from('orders').update({
      status: 'paid_processing',
      payment_intent_id: paymentIntent.id,
      paid_at: new Date().toISOString(),
      auto_charged_at: new Date().toISOString()
    }).eq('id', ORDER_ID)
    
    // Log event
    await supabase.from('order_events').insert({
      order_id: ORDER_ID,
      actor: order.user_id,
      actor_role: 'system',
      event_type: 'payment_manual_charge',
      payload_json: {
        payment_intent_id: paymentIntent.id,
        amount_cents: order.quote_cents,
        source: 'diagnostic_script'
      }
    })
    
    console.log('\n✅ Order updated to paid_processing')
    console.log('\n📧 Consider sending receipt SMS/email to customer')
    
  } catch (error) {
    console.error('\n❌ PAYMENT FAILED:', error.message)
    console.error('  Code:', error.code || 'N/A')
    console.error('  Type:', error.type || 'N/A')
    
    // Log failure
    await supabase.from('payment_retry_log').insert({
      order_id: ORDER_ID,
      error_message: error.message,
      stripe_error_code: error.code || null,
      retry_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
    })
    
    console.log('\n💡 FALLBACK OPTIONS:')
    console.log('  1. Send customer a payment link:')
    console.log(`     ${process.env.NEXT_PUBLIC_BASE_URL}/orders/${ORDER_ID}/pay`)
    console.log('\n  2. Check Stripe dashboard for more details:')
    console.log(`     https://dashboard.stripe.com/customers/${order.stripe_customer_id}`)
    console.log('\n  3. Possible issues:')
    console.log('     - Card requires 3D Secure authentication')
    console.log('     - Card was declined')
    console.log('     - Insufficient funds')
    console.log('     - Card expired or blocked')
  }
  
  console.log('\n' + '='.repeat(60))
}

main().catch(console.error)
