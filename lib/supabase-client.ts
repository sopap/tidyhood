'use client'

import { createBrowserClient } from '@supabase/ssr'

// TEMPORARY FIX: Hardcoding values due to Vercel blocking env vars with "KEY" in the name
// These are NEXT_PUBLIC_* values that are safe to expose in the browser
const supabaseUrl = 'https://gbymheksmnenuranuvjr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieW1oZWtzbW5lbnVyYW51dmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTY1MDksImV4cCI6MjA3NTE3MjUwOX0.SSbPkXH5wHjAz7L6uBT8s4NzfXcwHw4wHDax0BoB2ZA'

// Validation to ensure we have the correct values
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration error')
}

export const supabaseClient = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
)
