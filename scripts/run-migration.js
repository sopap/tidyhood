/**
 * Migration Runner for Hosted Supabase
 * Run this script to apply the waitlist table migration
 * 
 * Usage: node scripts/run-migration.js
 */

const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

// Import Supabase client
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🔄 Reading migration file...')
    
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '012_waitlist_table.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📤 Executing migration...')
    console.log('SQL Preview:', sql.substring(0, 200) + '...')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️  exec_sql RPC not found, trying direct execution...')
      
      // Split SQL into individual statements and execute
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
      
      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('exec', { sql: statement })
        if (stmtError) {
          throw stmtError
        }
      }
    }
    
    console.log('✅ Migration completed successfully!')
    console.log('📋 The waitlist table has been created.')
    console.log('')
    console.log('Next steps:')
    console.log('1. Test the waitlist form at /waitlist')
    console.log('2. Check your Supabase dashboard to verify the table exists')
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('')
    console.error('📝 Manual Migration Instructions:')
    console.error('1. Open your Supabase Dashboard → SQL Editor')
    console.error('2. Copy the contents of: supabase/migrations/012_waitlist_table.sql')
    console.error('3. Paste and run in the SQL Editor')
    console.error('')
    process.exit(1)
  }
}

runMigration()
