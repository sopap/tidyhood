const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const orderIds = [
  '69efad02-ec68-424d-af83-7d313bbd1fd4',
  'd1a29ccd-7db7-42d7-8809-e9f0a3d36801'
]

async function checkOrders() {
  console.log('🔍 Checking order payment status...\n')
  
  for (const orderId of orderIds) {
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, service_type, status, saved_payment_method_id, stripe_customer_id, quote_cents, paid_at, auto_charged_at')
      .eq('id', orderId)
      .single()
    
    if (error) {
      console.error(`❌ Error fetching order ${orderId}:`, error.message)
      continue
    }
    
    console.log(`📦 Order ${orderId.slice(-8)}`)
    console.log(`   Service: ${order.service_type}`)
    console.log(`   Status: ${order.status}`)
    console.log(`   Quote: $${(order.quote_cents / 100).toFixed(2)}`)
    console.log(`   Stripe Customer ID: ${order.stripe_customer_id || 'MISSING ❌'}`)
    console.log(`   Saved Payment Method: ${order.saved_payment_method_id || 'MISSING ❌'}`)
    console.log(`   Paid At: ${order.paid_at || 'Not paid'}`)
    console.log(`   Auto-charged At: ${order.auto_charged_at || 'Not auto-charged'}`)
    
    // Diagnosis
    if (!order.stripe_customer_id) {
      console.log(`   ⚠️  ISSUE: Missing stripe_customer_id - auto-charge will skip`)
    }
    if (!order.saved_payment_method_id) {
      console.log(`   ⚠️  ISSUE: Missing saved_payment_method_id - auto-charge will skip`)
    }
    if (order.stripe_customer_id && order.saved_payment_method_id && !order.paid_at) {
      console.log(`   ⚠️  ISSUE: Has payment info but not charged - check Vercel logs for Stripe errors`)
    }
    
    console.log('')
  }
}

checkOrders().catch(console.error)
