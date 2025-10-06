'use client'

import { createBrowserClient } from '@supabase/ssr'

// TEMPORARY FIX: Hardcoding values due to Vercel blocking env vars with "KEY" in the name
// These are NEXT_PUBLIC_* values that are safe to expose in the browser
const supabaseUrl = 'https://gbymheksmnenurazuvjr.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieW1oZWtzbW5lbnVyYXp1dmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA2MzExNDAsImV4cCI6MjA0NjIwNzE0MH0.SSbPkXHbwHjAz7L6uBTBs4NzfXcw4w4wHDax0BoB2ZA'

// Validation to ensure we have the correct values
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration error')
}

export const supabaseClient = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
)
