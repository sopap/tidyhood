const { createClient } = require('@supabase/supabase-js')
const Stripe = require('stripe')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
})

async function fixMissingCustomerIds() {
  console.log('🔧 Fixing missing stripe_customer_id fields...\n')
  
  // Find all orders with saved payment method but no customer ID
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, saved_payment_method_id, stripe_customer_id')
    .not('saved_payment_method_id', 'is', null)
    .is('stripe_customer_id', null)
  
  if (error) {
    console.error('❌ Error fetching orders:', error.message)
    return
  }
  
  if (!orders || orders.length === 0) {
    console.log('✅ No orders need fixing')
    return
  }
  
  console.log(`📋 Found ${orders.length} orders to fix\n`)
  
  for (const order of orders) {
    try {
      console.log(`Processing order ${order.id.slice(-8)}...`)
      
      // Retrieve payment method from Stripe to get customer ID
      const paymentMethod = await stripe.paymentMethods.retrieve(
        order.saved_payment_method_id
      )
      
      if (!paymentMethod.customer) {
        console.log(`  ⚠️  Payment method ${order.saved_payment_method_id} has no customer attached`)
        continue
      }
      
      const customerId = typeof paymentMethod.customer === 'string' 
        ? paymentMethod.customer 
        : paymentMethod.customer.id
      
      // Update order with customer ID
      const { error: updateError } = await supabase
        .from('orders')
        .update({ stripe_customer_id: customerId })
        .eq('id', order.id)
      
      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}`)
      } else {
        console.log(`  ✅ Updated with customer ID: ${customerId}`)
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`)
    }
  }
  
  console.log('\n✨ Done!')
}

fixMissingCustomerIds().catch(console.error)
