#!/usr/bin/env node

/**
 * Migration 035: Guest Booking and Cancellation Policy Versioning
 * 
 * Adds:
 * - Guest booking fields (guest_name, guest_email, guest_phone)
 * - Cancellation policy tracking (policy_id, policy_version)
 * - UTM marketing parameters
 * - Constraint: EITHER user_id OR (guest_email AND guest_phone)
 * - Indexes for guest order queries
 * - Policy versioning on cancellation_policies table
 * - Helper functions and audit triggers
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testGuestOrderConstraint() {
  console.log('\n🧪 Testing guest order constraints...')
  
  // Test 1: Try to create order with neither user_id nor guest info (should fail)
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        service_type: 'LAUNDRY',
        slot_start: new Date().toISOString(),
        slot_end: new Date(Date.now() + 3600000).toISOString(),
        status: 'PENDING',
        total_cents: 5000
      })
      .select()
    
    if (error) {
      console.log('✅ Constraint working: Cannot create order without user_id or guest info')
    } else {
      console.log('⚠️  WARNING: Order created without user_id or guest info (constraint may not be working)')
    }
  } catch (err) {
    console.log('✅ Constraint working: Exception thrown for invalid order')
  }
  
  // Test 2: Try guest order with only email (should fail)
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        service_type: 'LAUNDRY',
        guest_email: 'test@example.com',
        slot_start: new Date().toISOString(),
        slot_end: new Date(Date.now() + 3600000).toISOString(),
        status: 'PENDING',
        total_cents: 5000
      })
      .select()
    
    if (error) {
      console.log('✅ Constraint working: Cannot create guest order with only email')
    } else {
      console.log('⚠️  WARNING: Guest order created with only email (constraint may not be working)')
    }
  } catch (err) {
    console.log('✅ Constraint working: Exception thrown for incomplete guest info')
  }
  
  console.log('✅ Constraint tests completed')
}

async function verifySchema() {
  console.log('\n🔍 Verifying schema changes...')
  
  // Check if new columns exist by querying with them
  const { data: sampleOrders, error: ordersError } = await supabase
    .from('orders')
    .select('guest_name, guest_email, guest_phone, policy_id, policy_version, utm_params')
    .limit(1)
  
  if (ordersError) {
    console.error('❌ Error querying orders with new columns:', ordersError.message)
    return false
  }
  
  console.log('✅ Orders table: New columns verified')
  
  // Check cancellation_policies version column
  const { data: policies, error: policiesError } = await supabase
    .from('cancellation_policies')
    .select('id, service_type, version, active')
    .eq('active', true)
  
  if (policiesError) {
    console.error('❌ Error querying cancellation_policies:', policiesError.message)
    return false
  }
  
  console.log('✅ Cancellation_policies table: Version column verified')
  console.log(`   Found ${policies?.length || 0} active policies`)
  
  if (policies && policies.length > 0) {
    policies.forEach(policy => {
      console.log(`   - ${policy.service_type}: version ${policy.version}`)
    })
  }
  
  return true
}

async function runMigration() {
  console.log('🚀 Running Migration 035: Guest Booking and Policy Versioning\n')

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '035_guest_booking_and_policy_versioning.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath)
      process.exit(1)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    console.log('📝 Loaded migration SQL file')

    // Note: Supabase client doesn't support direct SQL execution
    // This script is for documentation. Run migration via Supabase CLI or Dashboard:
    // supabase db push
    
    console.log('\n⚠️  IMPORTANT: This script is for verification only.')
    console.log('   To run the migration, use one of these methods:\n')
    console.log('   1. Supabase CLI:')
    console.log('      supabase db push\n')
    console.log('   2. Supabase Dashboard:')
    console.log('      - Go to SQL Editor')
    console.log('      - Paste the migration SQL')
    console.log('      - Execute\n')
    console.log('   3. Direct psql connection:')
    console.log('      psql <connection-string> < supabase/migrations/035_guest_booking_and_policy_versioning.sql\n')

    console.log('📋 Attempting to verify if migration has been run...\n')
    
    // Verify schema changes
    const schemaValid = await verifySchema()
    
    if (!schemaValid) {
      console.log('\n❌ Schema verification failed. Migration may not have been applied yet.')
      console.log('\n💡 Next steps:')
      console.log('   1. Run the migration using one of the methods above')
      console.log('   2. Run this script again to verify\n')
      process.exit(1)
    }
    
    // Test constraints
    await testGuestOrderConstraint()
    
    // Show example queries
    console.log('\n📝 Example Usage:\n')
    console.log('-- Valid authenticated order:')
    console.log("INSERT INTO orders (user_id, service_type, slot_start, slot_end, status, total_cents)")
    console.log("VALUES ('user-uuid', 'CLEANING', NOW(), NOW() + INTERVAL '2 hours', 'PENDING', 15000);\n")
    
    console.log('-- Valid guest order:')
    console.log("INSERT INTO orders (guest_email, guest_phone, guest_name, service_type, slot_start, slot_end, status, total_cents)")
    console.log("VALUES ('jane@example.com', '+19171234567', 'Jane Doe', 'CLEANING', NOW(), NOW() + INTERVAL '2 hours', 'PENDING', 15000);\n")
    
    console.log('-- Query guest orders:')
    console.log("SELECT * FROM orders WHERE guest_email = 'jane@example.com';\n")
    
    console.log('-- Get active policy with version:')
    console.log("SELECT * FROM get_active_policy_with_version('CLEANING');\n")
    
    console.log('✅ Migration 035 verification completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Update API endpoints to capture policy_id and policy_version when creating orders')
    console.log('   2. Modify booking flow to support guest checkout')
    console.log('   3. Update lib/cancellationFees.ts to read from database')
    console.log('   4. Add guest order lookup functionality')
    console.log('   5. Implement UTM parameter tracking\n')

  } catch (error) {
    console.error('\n❌ Migration verification failed:', error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('   1. Ensure migration has been applied to database')
    console.error('   2. Check that Supabase connection is working')
    console.error('   3. Verify service role key has admin permissions')
    console.error('   4. Review Supabase dashboard for error details\n')
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  runMigration()
}

module.exports = { runMigration }
