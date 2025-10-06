/**
 * Environment Variable Validation Schema
 * 
 * Validates all environment variables at boot time using Zod.
 * Fails closed if any required variables are missing or invalid.
 * 
 * Split into client and server schemas to prevent server secrets
 * from being validated in the browser context.
 * 
 * Usage:
 *   import { env } from '@/lib/env'
 *   const apiKey = env.STRIPE_SECRET_KEY // Server-side only
 *   const publicKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY // Available everywhere
 */

import { z } from 'zod'

/**
 * Client-side schema - Only NEXT_PUBLIC_* variables
 * These are safe to expose in the browser
 */
const clientEnvSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Site Configuration
  NEXT_PUBLIC_SITE_NAME: z.string().min(1).default('Tidyhood'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('https://www.tidyhood.nyc'),
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_ALLOWED_ZIPS: z.string().min(1).default('10026,10027,10030').transform((val) => val.split(',')),

  // Supabase (Public keys only)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(32),

  // Google Maps API (Public key)
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(20),

  // Stripe (Public key only)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),

  // Feature Flags (Public)
  NEXT_PUBLIC_ENABLE_PARTNER_PORTAL: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ENABLE_CAPACITY_CALENDAR: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ENABLE_AUTO_ASSIGN: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ENABLE_AUTO_NOTIFICATIONS: z.string().default('false').transform((val) => val === 'true'),

  // Unified Order UI Feature Flags
  NEXT_PUBLIC_UNIFIED_ORDER_UI: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_UNIFIED_ROLLOUT: z.string().default('0').transform((val) => parseInt(val)).pipe(z.number().min(0).max(100)),
  NEXT_PUBLIC_UNIFIED_TIMELINE: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ENHANCED_ANIMATIONS: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_ANALYTICS: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_NEW_HEADER: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_NEW_TIMELINE: z.string().default('false').transform((val) => val === 'true'),
  NEXT_PUBLIC_NEW_DETAILS_CARD: z.string().default('false').transform((val) => val === 'true'),

  // File Storage
  NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET: z.string().default('tidyhood-documents'),
})

/**
 * Server-side schema - Extends client schema with server-only secrets
 * These should NEVER be exposed to the browser
 */
const serverEnvSchema = clientEnvSchema.extend({
  // Supabase (Server secret)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(32),

  // Stripe (Server secrets)
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

  // Twilio (Server secrets - Optional for SMS)
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC').optional(),
  TWILIO_AUTH_TOKEN: z.string().min(32).optional(),
  TWILIO_FROM_PHONE: z.string().regex(/^\+1\d{10}$/, 'Phone must be E.164 format: +1XXXXXXXXXX').optional(),

  // Admin Configuration
  ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_EMAIL: z.string().email().optional(),

  // Authentication
  JWT_PARTNER_ROLE_CLAIM: z.string().default('app_role'),

  // Business Rules
  NYC_TAX_RATE: z.string().default('0.08875').transform((val) => parseFloat(val)).pipe(z.number().min(0).max(1)),
  FIRST_ORDER_CAP_CENTS: z.string().default('7500').transform((val) => parseInt(val)).pipe(z.number().positive()),
  LAUNDRY_MIN_LBS: z.string().default('10').transform((val) => parseInt(val)).pipe(z.number().positive()),

  // Observability (Server-side - Optional)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_SAMPLE_RATE: z.string().default('1.0').transform((val) => parseFloat(val)).pipe(z.number().min(0).max(1)),
})

/**
 * Detect if we're running on the server or in the browser
 */
const isServer = typeof window === 'undefined'

/**
 * Select appropriate schema based on execution context
 */
const envSchema = isServer ? serverEnvSchema : clientEnvSchema

/**
 * Validates and parses environment variables
 * Throws ZodError if validation fails
 */
function validateEnv() {
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const context = isServer ? 'Server' : 'Client'
      const missingVars = error.errors
        .filter((e) => e.code === 'invalid_type' && e.received === 'undefined')
        .map((e) => e.path.join('.'))
      
      const invalidVars = error.errors
        .filter((e) => e.code !== 'invalid_type' || e.received !== 'undefined')
        .map((e) => `${e.path.join('.')}: ${e.message}`)

      console.error(`❌ Invalid ${context} environment configuration:`)
      
      if (missingVars.length > 0) {
        console.error('\n🔴 Missing required variables:')
        missingVars.forEach((v) => console.error(`  - ${v}`))
      }
      
      if (invalidVars.length > 0) {
        console.error('\n🔴 Invalid variable values:')
        invalidVars.forEach((v) => console.error(`  - ${v}`))
      }

      console.error('\n💡 Check your .env.local file and compare with .env.example')
      console.error('💡 Ensure all required variables are set with valid values')
      
      if (!isServer) {
        console.error('💡 Note: Server-side secrets should NOT be in the browser\n')
      }

      throw new Error(`${context} environment validation failed. Fix the errors above and restart.`)
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
  ? (process.env as unknown as z.infer<typeof serverEnvSchema>)
  : validateEnv()

/**
 * Type-safe environment variable access
 * Type will be ServerEnv when accessed server-side, ClientEnv when accessed client-side
 */
export type ClientEnv = z.infer<typeof clientEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>
export type Env = typeof env
