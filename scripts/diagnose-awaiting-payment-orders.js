#!/usr/bin/env node

/**
 * Diagnostic Script: Awaiting Payment Orders Audit
 * 
 * Purpose: Analyze orders in 'awaiting_payment' status to determine:
 * - How many are legitimate legacy orders vs. problematic stuck orders
 * - Timeline of when these orders were created
 * - Whether they have payment methods saved (indicates new vs old flow)
 * - Which API endpoints created them
 * 
 * Usage: node scripts/diagnose-awaiting-payment-orders.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Deprecation date - when new flow was implemented
const DEPRECATION_DATE = '2025-10-09';

async function runDiagnostics() {
  console.log('🔍 Starting Awaiting Payment Orders Diagnostic\n');
  console.log('='.repeat(80));
  
  try {
    // Query 1: Get all awaiting_payment orders
    console.log('\n📊 QUERY 1: Overview Statistics\n');
    
    const { data: allAwaitingPayment, error: error1 } = await supabase
      .from('orders')
      .select('*')
      .eq('service_type', 'LAUNDRY')
      .eq('status', 'awaiting_payment')
      .order('created_at', { ascending: false });
    
    if (error1) throw error1;
    
    const total = allAwaitingPayment?.length || 0;
    console.log(`Total orders in 'awaiting_payment' status: ${total}`);
    
    if (total === 0) {
      console.log('✅ No orders found in awaiting_payment status. System is clean!');
      return;
    }
    
    // Query 2: Breakdown by payment method presence
    console.log('\n📊 QUERY 2: Payment Method Analysis\n');
    
    const withPaymentMethod = allAwaitingPayment.filter(o => o.saved_payment_method_id);
    const withoutPaymentMethod = allAwaitingPayment.filter(o => !o.saved_payment_method_id);
    
    console.log(`Orders WITH saved payment method: ${withPaymentMethod.length} ⚠️`);
    console.log(`Orders WITHOUT saved payment method: ${withoutPaymentMethod.length} ✓ (expected legacy)`);
    
    // Query 3: Timeline analysis
    console.log('\n📊 QUERY 3: Timeline Analysis\n');
    
    const beforeDeprecation = allAwaitingPayment.filter(
      o => new Date(o.created_at) < new Date(DEPRECATION_DATE)
    );
    const afterDeprecation = allAwaitingPayment.filter(
      o => new Date(o.created_at) >= new Date(DEPRECATION_DATE)
    );
    
    console.log(`Created BEFORE deprecation (${DEPRECATION_DATE}): ${beforeDeprecation.length} ✓`);
    console.log(`Created AFTER deprecation (${DEPRECATION_DATE}): ${afterDeprecation.length} ⚠️`);
    
    // Query 4: Deprecated endpoint usage
    console.log('\n📊 QUERY 4: Deprecated Endpoint Usage\n');
    
    const deprecatedFlow = allAwaitingPayment.filter(
      o => o.order_details?._deprecated_payment_flow === true
    );
    
    console.log(`Orders marked as deprecated flow: ${deprecatedFlow.length}`);
    
    // Query 5: Age analysis
    console.log('\n📊 QUERY 5: Order Age Analysis\n');
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const recentOrders = allAwaitingPayment.filter(
      o => new Date(o.created_at) > sevenDaysAgo
    );
    const oldOrders = allAwaitingPayment.filter(
      o => new Date(o.created_at) < thirtyDaysAgo
    );
    
    console.log(`Orders < 7 days old: ${recentOrders.length}`);
    console.log(`Orders > 30 days old: ${oldOrders.length} (may need cleanup)`);
    
    // Critical findings
    console.log('\n' + '='.repeat(80));
    console.log('🚨 CRITICAL FINDINGS\n');
    
    if (withPaymentMethod.length > 0) {
      console.log(`⚠️  ISSUE 1: ${withPaymentMethod.length} orders have payment methods but are stuck in awaiting_payment`);
      console.log('   These should likely be in paid_processing status instead.');
      console.log('   Order IDs:', withPaymentMethod.slice(0, 5).map(o => o.id).join(', '));
      if (withPaymentMethod.length > 5) {
        console.log(`   ... and ${withPaymentMethod.length - 5} more`);
      }
    }
    
    if (afterDeprecation.length > 0) {
      console.log(`\n⚠️  ISSUE 2: ${afterDeprecation.length} orders created AFTER deprecation are in awaiting_payment`);
      console.log('   New bookings should not enter this status anymore.');
      console.log('   Order IDs:', afterDeprecation.slice(0, 5).map(o => o.id).join(', '));
      if (afterDeprecation.length > 5) {
        console.log(`   ... and ${afterDeprecation.length - 5} more`);
      }
    }
    
    if (recentOrders.length > 3) {
      console.log(`\n⚠️  ISSUE 3: ${recentOrders.length} orders created in last 7 days are in awaiting_payment`);
      console.log('   This suggests the new booking flow may not be working correctly.');
    }
    
    // Detailed order list
    console.log('\n' + '='.repeat(80));
    console.log('📋 DETAILED ORDER LIST\n');
    
    console.log('Format: [Order ID] | Created | Payment Method | Quote | User ID\n');
    
    allAwaitingPayment.forEach(order => {
      const createdDate = new Date(order.created_at).toISOString().split('T')[0];
      const hasPayment = order.saved_payment_method_id ? '✓ HAS PM' : '✗ NO PM';
      const hasQuote = order.quote_cents ? `$${(order.quote_cents / 100).toFixed(2)}` : 'No quote';
      const age = Math.floor((now - new Date(order.created_at)) / (1000 * 60 * 60 * 24));
      
      console.log(`[${order.id}] | ${createdDate} (${age}d ago) | ${hasPayment} | ${hasQuote} | User: ${order.user_id.substring(0, 8)}...`);
    });
    
    // Recommendations
    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMMENDATIONS\n');
    
    if (withoutPaymentMethod.length > 0 && withPaymentMethod.length === 0) {
      console.log('✅ All awaiting_payment orders are legacy orders (no payment method).');
      console.log('   This is expected behavior. No action needed.');
      console.log('   These orders will complete when customers pay manually.');
    }
    
    if (withPaymentMethod.length > 0) {
      console.log('🔧 Action Required: Fix orders with payment methods');
      console.log('   1. Review the order IDs listed above');
      console.log('   2. Verify if they should be charged automatically');
      console.log('   3. Consider running status update script to move them to paid_processing');
      console.log('\n   SQL Query to fix (REVIEW BEFORE RUNNING):');
      console.log('   ```sql');
      console.log('   UPDATE orders');
      console.log('   SET status = \'paid_processing\', updated_at = NOW()');
      console.log('   WHERE id IN (');
      withPaymentMethod.slice(0, 5).forEach((o, i) => {
        console.log(`     '${o.id}'${i < Math.min(4, withPaymentMethod.length - 1) ? ',' : ''}`);
      });
      console.log('   )');
      console.log('   AND saved_payment_method_id IS NOT NULL');
      console.log('   AND status = \'awaiting_payment\';');
      console.log('   ```');
    }
    
    if (afterDeprecation.length > 0) {
      console.log('\n🔧 Action Required: Investigate booking flow');
      console.log('   1. Check if /api/orders POST endpoint is still being called');
      console.log('   2. Verify /api/payment/setup is being used for new bookings');
      console.log('   3. Review app/book/laundry/page.tsx for feature flag issues');
    }
    
    console.log('\n🔧 Action Required: Fix admin quote route');
    console.log('   The file app/api/admin/orders/[id]/update-quote/route.ts');
    console.log('   always sets status to awaiting_payment. This should be fixed to');
    console.log('   respect the payment method presence.');
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📈 SUMMARY\n');
    console.log(`Total Orders in awaiting_payment: ${total}`);
    console.log(`  - Legacy orders (expected): ${withoutPaymentMethod.length}`);
    console.log(`  - Problematic orders (need review): ${withPaymentMethod.length}`);
    console.log(`  - Created after deprecation: ${afterDeprecation.length}`);
    console.log(`  - Orders > 30 days old: ${oldOrders.length}`);
    
    if (withPaymentMethod.length === 0 && afterDeprecation.length === 0) {
      console.log('\n✅ System Status: HEALTHY');
      console.log('All awaiting_payment orders are legitimate legacy orders.');
    } else if (withPaymentMethod.length > 0 || afterDeprecation.length > 0) {
      console.log('\n⚠️  System Status: REQUIRES ATTENTION');
      console.log('Code fixes and/or data migration needed.');
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Diagnostic complete!\n');
    
  } catch (error) {
    console.error('\n❌ Error running diagnostics:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run diagnostics
runDiagnostics().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
