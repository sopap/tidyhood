#!/usr/bin/env node

/**
 * Check Receipt Data for Order
 * 
 * Usage: node scripts/check-receipt-data.js <order-id>
 */

const orderId = process.argv[2];

if (!orderId) {
  console.error('Usage: node scripts/check-receipt-data.js <order-id>');
  process.exit(1);
}

async function checkReceiptData() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log(`\n🔍 Checking receipt data for order: ${orderId}\n`);
  
  // Get order data
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, paid_at, stripe_payment_intent_id, stripe_charge_id, stripe_receipt_url, stripe_receipt_number, total_cents')
    .eq('id', orderId)
    .single();
  
  if (error || !order) {
    console.error('❌ Order not found:', error?.message);
    process.exit(1);
  }
  
  console.log('📦 Order Details:');
  console.log('  Status:', order.status);
  console.log('  Paid At:', order.paid_at || 'Not paid');
  console.log('  Total:', `$${(order.total_cents / 100).toFixed(2)}`);
  console.log('');
  
  console.log('💳 Stripe Data:');
  console.log('  Payment Intent ID:', order.stripe_payment_intent_id || '❌ Missing');
  console.log('  Charge ID:', order.stripe_charge_id || '❌ Missing');
  console.log('  Receipt URL:', order.stripe_receipt_url || '❌ Missing');
  console.log('  Receipt Number:', order.stripe_receipt_number || '❌ Missing');
  console.log('');
  
  if (!order.stripe_receipt_url) {
    console.log('⚠️  No receipt URL found!');
    console.log('');
    console.log('Possible causes:');
    console.log('  1. Webhook hasn\'t fired yet');
    console.log('  2. Webhook fired but charge data not expanded');
    console.log('  3. Payment was made before webhook handler was updated');
    console.log('  4. Webhook failed (check logs)');
    console.log('');
    
    if (order.stripe_payment_intent_id) {
      console.log('💡 You can manually fetch receipt from Stripe:');
      console.log(`   stripe payment_intents retrieve ${order.stripe_payment_intent_id} --expand charges.data.receipt_url`);
    }
  } else {
    console.log('✅ Receipt data found!');
    console.log('   You should see the "View Receipt" button on the order page.');
  }
}

checkReceiptData().catch(console.error);
