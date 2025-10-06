#!/usr/bin/env node
/**
 * Test Environment Variable Validation
 * 
 * Runs the env validation logic independently to identify which
 * variables are missing or invalid without crashing the app.
 */

const { z } = require('zod');

// Define schemas (copy from lib/env.ts)
const clientEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default('Tidyhood'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://www.tidyhood.nyc'),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_ALLOWED_ZIPS: z.string().min(1).default('10026,10027,10030').transform((val) => val.split(',')),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(32),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(20),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  NEXT_PUBLIC_ENABLE_PARTNER_PORTAL: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ENABLE_CAPACITY_CALENDAR: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ENABLE_AUTO_ASSIGN: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ENABLE_AUTO_NOTIFICATIONS: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_UNIFIED_ORDER_UI: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_UNIFIED_ROLLOUT: z.string().default('0').transform((val) => parseInt(val)).pipe(z.number().min(0).max(100)),
  NEXT_PUBLIC_UNIFIED_TIMELINE: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ENHANCED_ANIMATIONS: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ANALYTICS: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_NEW_HEADER: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_NEW_TIMELINE: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_NEW_DETAILS_CARD: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: z.string().default('tidyhood-documents'),
});

const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(32),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC').optional(),
  TWILIO_AUTH_TOKEN: z.string().min(32).optional(),
  TWILIO_FROM_PHONE: z.string().regex(/^\+1\d{10}$/).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  JWT_PARTNER_ROLE_CLAIM: z.string().default('app_role'),
  NYC_TAX_RATE: z.string().default('0.08875').transform((val) => parseFloat(val)).pipe(z.number().min(0).max(1)),
  FIRST_ORDER_CAP_CENTS: z.string().default('7500').transform((val) => parseInt(val)).pipe(z.number().positive()),
  LAUNDRY_MIN_LBS: z.string().default('10').transform((val) => parseInt(val)).pipe(z.number().positive()),
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_SAMPLE_RATE: z.string().default('1.0').transform((val) => parseFloat(val)).pipe(z.number().min(0).max(1)),
});

// Load .env.local
require('dotenv').config({ path: '.env.local' });

console.log('\n🔍 Testing Environment Variable Validation...\n');

try {
  const result = serverEnvSchema.parse(process.env);
  console.log('✅ SUCCESS! All environment variables are valid.\n');
  console.log('Validated variables:');
  Object.keys(result).forEach(key => {
    if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')) {
      console.log(`  ✓ ${key}: ***REDACTED***`);
    } else {
      console.log(`  ✓ ${key}: ${result[key]}`);
    }
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log('❌ VALIDATION FAILED\n');
    
    const missingVars = error.errors
      .filter((e) => e.code === 'invalid_type' && e.received === 'undefined')
      .map((e) => e.path.join('.'));
    
    const invalidVars = error.errors
      .filter((e) => e.code !== 'invalid_type' || e.received !== 'undefined')
      .map((e) => ({ path: e.path.join('.'), message: e.message }));

    if (missingVars.length > 0) {
      console.log('🔴 Missing Required Variables:');
      missingVars.forEach((v) => console.log(`  - ${v}`));
      console.log('');
    }
    
    if (invalidVars.length > 0) {
      console.log('🔴 Invalid Variable Values:');
      invalidVars.forEach(({ path, message }) => {
        console.log(`  - ${path}: ${message}`);
        const currentValue = process.env[path];
        if (currentValue && !path.includes('KEY') && !path.includes('SECRET')) {
          console.log(`    Current value: "${currentValue}"`);
        }
      });
      console.log('');
    }

    console.log('💡 To fix:');
    console.log('  1. Update .env.local with the correct values');
    console.log('  2. Compare with .env.example for reference');
    console.log('  3. Ensure all required variables are set\n');
    
    process.exit(1);
  }
  
  console.error('❌ Unexpected error:', error);
  process.exit(1);
}
