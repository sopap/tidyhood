#!/usr/bin/env node

/**
 * Migration Runner for 036_security_and_performance_fixes
 * 
 * This script runs the security and performance fixes migration for Supabase.
 * 
 * Usage:
 *   node scripts/run-migration-036.js
 * 
 * Environment variables required:
 *   SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_KEY - Your Supabase service role key (NOT anon key)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Validation
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Read migration file
const migrationPath = path.join(__dirname, '../supabase/migrations/036_security_and_performance_fixes.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('🔒 Migration 036: Security and Performance Fixes');
console.log('================================================');
console.log('');
console.log('This migration will:');
console.log('  ✓ Enable RLS on 2 tables (partner_sms_conversations, payment_retry_log)');
console.log('  ✓ Fix search_path security issues in 18 functions');
console.log('  ✓ Optimize 35 RLS policies for better performance');
console.log('');
console.log('⚠️  WARNING: This is a significant security and performance update');
console.log('   It is recommended to run this during a maintenance window');
console.log('');

// Parse Supabase URL
const url = new URL(SUPABASE_URL);
const isHttps = url.protocol === 'https:';
const httpModule = isHttps ? https : http;

// Prepare request
const requestData = JSON.stringify({
  query: migrationSQL
});

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestData),
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Prefer': 'return=minimal'
  }
};

// Alternative: Use SQL editor endpoint
const sqlOptions = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: '/rest/v1/rpc/sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestData),
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
  }
};

console.log('🚀 Running migration...');
console.log('');

// Execute migration
const req = httpModule.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 204) {
      console.log('✅ Migration completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('  1. Verify changes in Supabase dashboard');
      console.log('  2. Check the Performance advisor to confirm issues are resolved');
      console.log('  3. Monitor application logs for any RLS policy issues');
      console.log('  4. Test critical user flows (admin, partner, customer)');
      console.log('');
      console.log('📊 Expected improvements:');
      console.log('  • 2 security issues fixed (RLS enabled on tables)');
      console.log('  • 18 security issues fixed (function search_path)');
      console.log('  • 35 performance issues fixed (RLS policy optimization)');
      console.log('  • ~175 warnings about duplicate policies (these are expected)');
      console.log('');
    } else {
      console.error('❌ Migration failed with status:', res.statusCode);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error executing migration:', error.message);
  console.error('');
  console.error('Troubleshooting:');
  console.error('  • Verify SUPABASE_URL is correct');
  console.error('  • Verify SUPABASE_SERVICE_KEY is the service role key');
  console.error('  • Check your network connection');
  console.error('  • Try running the migration manually via Supabase SQL Editor');
  process.exit(1);
});

req.write(requestData);
req.end();

// Timeout after 60 seconds
setTimeout(() => {
  console.error('❌ Migration timed out after 60 seconds');
  console.error('   The migration may still be running. Check Supabase dashboard.');
  process.exit(1);
}, 60000);
