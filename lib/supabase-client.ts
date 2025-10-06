'use client'

import { createBrowserClient } from '@supabase/ssr'

// Get environment variables with fallback to process.env for build-time embedding
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Validate that we have the required variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    allEnvVars: Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC'))
  })
}

export const supabaseClient = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
)
