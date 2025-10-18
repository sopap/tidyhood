#!/usr/bin/env node

/**
 * Migration 033: Admin Settings Infrastructure
 * 
 * Adds:
 * - Cancellation policies table
 * - Settings audit log table
 * - Enhanced pricing_rules with audit fields
 * - Helper functions and triggers
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

async function runMigration() {
  console.log('🚀 Running Migration 033: Admin Settings Infrastructure\n')

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '033_admin_settings_infrastructure.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('📝 Executing migration SQL...')
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('📝 Using direct SQL execution...')
      
      // Split by statement and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement) {
          const { error: stmtError } = await supabase.rpc('exec', {
            query: statement + ';'
          })
          
          if (stmtError) {
            console.error('❌ Error executing statement:', stmtError)
            throw stmtError
          }
        }
      }
    }

    console.log('✅ Migration SQL executed successfully\n')

    // Verify tables were created
    console.log('🔍 Verifying migration...')

    const { data: policiesCount, error: policiesError } = await supabase
      .from('cancellation_policies')
      .select('*', { count: 'exact', head: true })

    if (policiesError) {
      console.error('❌ Error verifying cancellation_policies:', policiesError)
    } else {
      console.log(`✅ cancellation_policies table exists (${policiesCount} rows)`)
    }

    const { data: auditCount, error: auditError } = await supabase
      .from('settings_audit_log')
      .select('*', { count: 'exact', head: true })

    if (auditError) {
      console.error('❌ Error verifying settings_audit_log:', auditError)
    } else {
      console.log(`✅ settings_audit_log table exists (${auditCount} rows)`)
    }

    // Verify default policies were seeded
    const { data: policies, error: fetchError } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('active', true)

    if (fetchError) {
      console.error('❌ Error fetching policies:', fetchError)
    } else {
      console.log(`\n📋 Active Cancellation Policies:`)
      policies?.forEach(policy => {
        console.log(`   - ${policy.service_type}: ${policy.notice_hours}hr notice, ${policy.cancellation_fee_percent * 100}% fee`)
      })
    }

    console.log('\n✅ Migration 033 completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Create API endpoints for settings management')
    console.log('   2. Build admin UI components')
    console.log('   3. Update lib/cancellationFees.ts to read from database')
    console.log('   4. Test pricing and policy changes\n')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.error('\n💡 Troubleshooting:')
    console.error('   1. Check that Supabase connection is working')
    console.error('   2. Verify service role key has admin permissions')
    console.error('   3. Review migration SQL for syntax errors')
    console.error('   4. Check Supabase dashboard for error details\n')
    process.exit(1)
  }
}

runMigration()
