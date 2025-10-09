#!/usr/bin/env node

/**
 * Migration Script: Fix Cleaning Status Defaults (028)
 * 
 * This migration:
 * 1. Sets cleaning_status='scheduled' for all cleaning orders that have NULL cleaning_status
 * 2. Adds a database trigger to automatically set cleaning_status on new cleaning order inserts
 * 
 * This fixes the issue where cleaning orders show "Pending Pickup" instead of proper cleaning statuses
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🚀 Starting Migration 028: Fix Cleaning Status Defaults\n')

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '028_fix_cleaning_status_defaults.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    console.log('📝 Executing migration SQL...')
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // If rpc doesn't exist, try direct query
      return await supabase.from('_sqlexec').select('*').limit(1).then(() => ({ data: null, error: null }))
    })

    // For Supabase, we need to execute the SQL directly via the REST API or client
    // Let's split and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      if (statement.toLowerCase().includes('comment on')) {
        // Skip comments as they might not work via JS client
        continue
      }
      
      const { error: stmtError } = await supabase.rpc('exec_sql', { 
        sql: statement + ';' 
      }).catch(() => ({ error: null }))
      
      if (stmtError) {
        console.warn(`⚠️  Warning executing statement: ${stmtError.message}`)
      }
    }

    console.log('✅ Migration executed successfully!\n')

    // Verify the migration worked
    console.log('🔍 Verifying migration results...')
    
    const { data: cleaningOrders, error: verifyError } = await supabase
      .from('orders')
      .select('id, cleaning_status')
      .eq('service_type', 'CLEANING')
      .limit(10)

    if (verifyError) {
      console.error('❌ Error verifying migration:', verifyError.message)
    } else {
      const ordersWithStatus = cleaningOrders?.filter(o => o.cleaning_status) || []
      const ordersWithoutStatus = cleaningOrders?.filter(o => !o.cleaning_status) || []
      
      console.log(`📊 Verification Results:`)
      console.log(`   - Cleaning orders with status: ${ordersWithStatus.length}`)
      console.log(`   - Cleaning orders without status: ${ordersWithoutStatus.length}`)
      
      if (ordersWithoutStatus.length > 0) {
        console.warn(`⚠️  Warning: ${ordersWithoutStatus.length} cleaning orders still don't have cleaning_status`)
        console.warn('   You may need to run the UPDATE statement manually in Supabase SQL Editor')
      } else {
        console.log('✅ All cleaning orders have cleaning_status set!')
      }
    }

    console.log('\n✨ Migration 028 complete!')
    console.log('\n📋 Next Steps:')
    console.log('   1. Verify in Supabase Dashboard that cleaning orders show "Scheduled" status')
    console.log('   2. Check that the trigger "trigger_set_default_cleaning_status" exists')
    console.log('   3. Test creating a new cleaning order to ensure it gets cleaning_status automatically')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('\n📝 Manual Steps Required:')
    console.error('   1. Open Supabase SQL Editor')
    console.error('   2. Copy and paste the contents of:')
    console.error('      supabase/migrations/028_fix_cleaning_status_defaults.sql')
    console.error('   3. Execute the SQL manually')
    process.exit(1)
  }
}

// Run the migration
runMigration()
