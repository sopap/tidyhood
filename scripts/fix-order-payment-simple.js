#!/usr/bin/env node
/**
 * Simple fix to mark order as paid after successful Stripe charge
 * Usage: node scripts/fix-order-payment-simple.js <order_id> <payment_intent_id>
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const orderId = process.argv[2]
const paymentIntentId = process.argv[3]

if (!orderId || !paymentIntentId) {
  console.error('Usage: node scripts/fix-order-payment-simple.js <order_id> <payment_intent_id>')
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixOrderStatus() {
  console.log(`\n=== Marking Order as Paid: ${orderId} ===\n`)
  console.log(`Payment Intent: ${paymentIntentId}`)

  // Update order status
  const { data, error } = await supabase
    .from('orders')
    .update({
      status: 'paid_processing',
      paid_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    console.error('❌ Failed to update order:', error)
    process.exit(1)
  }

  console.log('✅ Order updated to paid_processing')
  
  // Log event
  const { error: eventError } = await supabase.from('order_events').insert({
    order_id: orderId,
    actor: data.user_id,
    actor_role: 'system',
    event_type: 'payment_completed',
    payload_json: {
      payment_intent_id: paymentIntentId,
      amount_cents: data.quote_cents,
      manual_fix: true
    }
  })

  if (eventError) {
    console.error('⚠️  Failed to log event:', eventError)
  } else {
    console.log('✅ Event logged')
  }

  console.log('\n✅ Order marked as paid successfully!')
}

fixOrderStatus().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
