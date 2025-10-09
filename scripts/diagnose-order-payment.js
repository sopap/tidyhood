#!/usr/bin/env node
/**
 * Diagnostic script to check order payment status
 * Usage: node scripts/diagnose-order-payment.js <order_id>
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const orderId = process.argv[2]

if (!orderId) {
  console.error('Usage: node scripts/diagnose-order-payment.js <order_id>')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseOrder() {
  console.log(`\n=== Diagnosing Order: ${orderId} ===\n`)

  // Get order details
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single()

  if (orderError || !order) {
    console.error('❌ Order not found:', orderError)
    process.exit(1)
  }

  console.log('📦 Order Details:')
  console.log('  ID:', order.id)
  console.log('  Status:', order.status)
  console.log('  Service Type:', order.service_type)
  console.log('  Quote (cents):', order.quote_cents)
  console.log('  User ID:', order.user_id)
  console.log('  Stripe Customer ID:', order.stripe_customer_id || '❌ Missing')
  console.log('  Saved Payment Method ID:', order.saved_payment_method_id || '❌ Missing')
  console.log('  Payment Intent ID:', order.payment_intent_id || 'None')
  console.log('  Paid At:', order.paid_at || 'Not paid')
  console.log('  Auto-charged At:', order.auto_charged_at || 'Not auto-charged')
  console.log('  Created At:', order.created_at)
  console.log('  Quoted At:', order.quoted_at || 'Not quoted')

  // Check user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', order.user_id)
    .single()

  if (profile) {
    console.log('\n👤 User Profile:')
    console.log('  Email:', profile.email)
    console.log('  Phone:', profile.phone)
    console.log('  Name:', profile.full_name)
    console.log('  Stripe Customer ID:', profile.stripe_customer_id || '❌ Missing')
  }

  // Check order events
  const { data: events, error: eventsError } = await supabase
    .from('order_events')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (events && events.length > 0) {
    console.log('\n📋 Recent Order Events:')
    events.forEach(event => {
      console.log(`  [${event.created_at}] ${event.event_type}`)
      if (event.payload_json) {
        console.log('    Payload:', JSON.stringify(event.payload_json, null, 2).split('\n').join('\n    '))
      }
    })
  }

  // Check payment retry log
  const { data: retries, error: retriesError } = await supabase
    .from('payment_retry_log')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })

  if (retries && retries.length > 0) {
    console.log('\n🔄 Payment Retry Log:')
    retries.forEach(retry => {
      console.log(`  [${retry.created_at}] Attempts: ${retry.attempts}`)
      console.log('    Error:', retry.error_message)
      console.log('    Stripe Code:', retry.stripe_error_code || 'N/A')
      console.log('    Next Retry:', retry.retry_at || 'N/A')
      console.log('    Completed:', retry.completed ? 'Yes' : 'No')
    })
  }

  // Diagnosis
  console.log('\n🔍 Diagnosis:')
  
  if (!order.saved_payment_method_id) {
    console.log('  ❌ ISSUE: No saved payment method on order')
    console.log('     → Customer needs to authorize payment first')
  }
  
  if (!order.stripe_customer_id) {
    console.log('  ❌ ISSUE: No Stripe customer ID on order')
    console.log('     → Order missing Stripe customer linkage')
  }
  
  if (order.saved_payment_method_id && order.stripe_customer_id && !order.payment_intent_id) {
    console.log('  ⚠️  WARNING: Payment method exists but no payment intent created')
    console.log('     → Auto-charge may have failed silently')
    console.log('     → Check payment_retry_log for errors')
  }
  
  if (order.payment_intent_id && !order.paid_at) {
    console.log('  ⚠️  WARNING: Payment intent exists but order not marked as paid')
    console.log('     → Payment may be pending or failed')
  }

  if (order.status === 'awaiting_payment' && order.saved_payment_method_id && order.stripe_customer_id) {
    console.log('  ⚠️  STATUS: Order should have been auto-charged but is still awaiting payment')
    console.log('     → Recommend triggering manual payment or checking Stripe dashboard')
  }

  console.log('\n✅ Diagnostic complete\n')
}

diagnoseOrder().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
