#!/usr/bin/env node

/**
 * Test Supabase Connection
 * Verifies that the Supabase keys in .env.local are valid
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testing Supabase Connection...\n');
console.log('URL:', SUPABASE_URL);
console.log('Anon Key:', ANON_KEY ? `${ANON_KEY.substring(0, 20)}...` : 'MISSING');
console.log('Service Role Key:', SERVICE_ROLE_KEY ? `${SERVICE_ROLE_KEY.substring(0, 20)}...` : 'MISSING');
console.log('');

async function testConnection() {
  if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  try {
    // Test with anon key (client)
    console.log('1️⃣  Testing Anon Key (client access)...');
    const anonClient = createClient(SUPABASE_URL, ANON_KEY);
    
    const { data: anonData, error: anonError } = await anonClient
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (anonError) {
      console.error('❌ Anon Key Test Failed:', anonError.message);
      console.error('   Details:', anonError);
    } else {
      console.log('✅ Anon Key Working - Client can query database');
    }

    // Test with service role key (admin)
    console.log('\n2️⃣  Testing Service Role Key (admin access)...');
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    const { data: adminData, error: adminError } = await adminClient
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (adminError) {
      console.error('❌ Service Role Key Test Failed:', adminError.message);
      console.error('   Details:', adminError);
    } else {
      console.log('✅ Service Role Key Working - Admin can query database');
    }

    // Summary
    console.log('\n📊 Test Summary:');
    if (!anonError && !adminError) {
      console.log('✅ All tests passed! Your Supabase keys are working correctly.');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed. Please check the errors above.');
      console.log('\n💡 Next Steps:');
      console.log('   1. Go to https://app.supabase.com');
      console.log('   2. Select your project');
      console.log('   3. Go to Settings → API');
      console.log('   4. Copy the correct keys (they should be JWT tokens starting with "eyJhbGci...")');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Connection test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

testConnection();
