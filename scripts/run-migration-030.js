#!/usr/bin/env node
/**
 * Run migration 030 to add stripe_customer_id to orders table
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('\n=== Running Migration 030 ===\n')
  
  const sql = fs.readFileSync('supabase/migrations/030_add_stripe_customer_id_to_orders.sql', 'utf8')
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT'))
  
  console.log(`Found ${statements.length} SQL statements to execute\n`)
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    console.log(`Executing statement ${i + 1}/${statements.length}:`)
    console.log(statement.substring(0, 100) + '...\n')
    
    try {
      // Execute each statement as a raw SQL query using PostgreSQL REST API
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
      
      if (error) {
        console.error('❌ Error:', error)
        // Continue anyway for IF NOT EXISTS statements
        if (!statement.includes('IF NOT EXISTS')) {
          throw error
        }
      } else {
        console.log('✅ Success\n')
      }
    } catch (err) {
      console.error('❌ Failed:', err.message)
      // For IF NOT EXISTS, this might be okay
      if (statement.includes('IF NOT EXISTS')) {
        console.log('⚠️  Continuing (IF NOT EXISTS clause)\n')
      } else {
        throw err
      }
    }
  }
  
  console.log('✅ Migration 030 completed!\n')
}

runMigration().catch(err => {
  console.error('Fatal error:', err)
  console.log('\n⚠️  You may need to run this migration manually in the Supabase SQL editor:\n')
  console.log('1. Go to Supabase dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Paste the contents of supabase/migrations/030_add_stripe_customer_id_to_orders.sql')
  console.log('4. Run the migration\n')
  process.exit(1)
})
