'use client'

import { createBrowserClient } from '@supabase/ssr'

// Direct access to env vars - Next.js will inline these at build time
// The || '' provides fallback but build should fail if vars are missing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Early validation with helpful error message
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase client initialization failed')
  console.error('Missing env vars:', {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? '✓ Set' : '✗ Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? '✓ Set' : '✗ Missing'
  })
  throw new Error(
    'Supabase environment variables are required. ' +
    'Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel dashboard.'
  )
}

export const supabaseClient = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
)
