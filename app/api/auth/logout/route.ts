import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST() {
  try {
    const cookieStore = await cookies()
    // TEMPORARY FIX: Hardcoding values due to Vercel env var blocking
    const supabase = createServerClient(
      'https://gbymheksmnenuranuvjr.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieW1oZWtzbW5lbnVyYW51dmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1OTY1MDksImV4cCI6MjA3NTE3MjUwOX0.SSbPkXH5wHjAz7L6uBT8s4NzfXcwHw4wHDax0BoB2ZA',
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    )
  }
}
