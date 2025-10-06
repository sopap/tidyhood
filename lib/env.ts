/**
 * Environment Variable Validation Schema
 * 
 * Validates all environment variables at boot time using Zod.
 * Fails closed if any required variables are missing or invalid.
 * 
 * Usage:
 *   import { env } from '@/lib/env'
 *   const apiKey = env.STRIPE_SECRET_KEY
 */

import { z } from 'zod'

const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Site Configuration
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default('Tidyhood'),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_ALLOWED_ZIPS: z.string().min(1).transform((val) => val.split(',')),

  // Supabase (REQUIRED)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(32),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(32),

  // Google Maps API (REQUIRED)
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(20),

  // Stripe (REQUIRED)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

  // Twilio (Optional - for SMS notifications)
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC').optional(),
  TWILIO_AUTH_TOKEN: z.string().min(32).optional(),
  TWILIO_FROM_PHONE: z.string().regex(/^\+1\d{10}$/, 'Phone must be E.164 format: +1XXXXXXXXXX').optional(),

  // Admin Configuration
  ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_EMAIL: z.string().email(),

  // Authentication
  JWT_PARTNER_ROLE_CLAIM: z.string().default('app_role'),

  // Business Rules
  NYC_TAX_RATE: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(0).max(1)),
  FIRST_ORDER_CAP_CENTS: z.string().transform((val) => parseInt(val)).pipe(z.number().positive()),
  LAUNDRY_MIN_LBS: z.string().transform((val) => parseInt(val)).pipe(z.number().positive()),

  // Feature Flags (Optional)
  NEXT_PUBLIC_ENABLE_PARTNER_PORTAL: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_CAPACITY_CALENDAR: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_AUTO_ASSIGN: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_ENABLE_AUTO_NOTIFICATIONS: z.string().transform((val) => val === 'true').default('false'),

  // Unified Order UI Feature Flags
  NEXT_PUBLIC_UNIFIED_ORDER_UI: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_UNIFIED_ROLLOUT: z.string().transform((val) => parseInt(val)).pipe(z.number().min(0).max(100)).default('0'),
  NEXT_PUBLIC_UNIFIED_TIMELINE: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_ENHANCED_ANIMATIONS: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_ANALYTICS: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_NEW_HEADER: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_NEW_TIMELINE: z.string().transform((val) => val === 'true').default('false'),
  NEXT_PUBLIC_NEW_DETAILS_CARD: z.string().transform((val) => val === 'true').default('false'),

  // File Storage
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: z.string().default('tidyhood-documents'),

  // Observability (Optional - add when implementing)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_SAMPLE_RATE: z.string().transform((val) => parseFloat(val)).pipe(z.number().min(0).max(1)).default('1.0'),
})

/**
 * Validates and parses environment variables
 * Throws ZodError if validation fails
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter((e) => e.code === 'invalid_type' && e.received === 'undefined')
        .map((e) => e.path.join('.'))
      
      const invalidVars = error.errors
        .filter((e) => e.code !== 'invalid_type' || e.received !== 'undefined')
        .map((e) => `${e.path.join('.')}: ${e.message}`)

      console.error('❌ Invalid environment configuration:')
      
      if (missingVars.length > 0) {
        console.error('\n🔴 Missing required variables:')
        missingVars.forEach((v) => console.error(`  - ${v}`))
      }
      
      if (invalidVars.length > 0) {
        console.error('\n🔴 Invalid variable values:')
        invalidVars.forEach((v) => console.error(`  - ${v}`))
      }

      console.error('\n💡 Check your .env.local file and compare with .env.example')
      console.error('💡 Ensure all required variables are set with valid values\n')

      throw new Error('Environment validation failed. Fix the errors above and restart.')
    }
    throw error
  }
}

/**
 * Validated environment variables
 * Safe to use throughout the application
 * 
 * This will throw an error at module load time if validation fails,
 * preventing the app from starting with invalid configuration.
 * 
 * During Next.js build phase, we skip validation to allow the build to complete.
 * Validation will run when the app actually starts.
 */
export const env = process.env.NEXT_PHASE === 'phase-production-build' 
  ? (process.env as unknown as z.infer<typeof envSchema>)
  : validateEnv()

/**
 * Type-safe environment variable access
 */
export type Env = z.infer<typeof envSchema>
