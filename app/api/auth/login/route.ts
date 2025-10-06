import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { checkRateLimit, resetRateLimit, getTimeUntilReset } from '@/lib/rate-limit'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Get IP address for rate limiting
    const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1'
    
    // Check rate limit (5 attempts per 15 minutes)
    if (!checkRateLimit(ip, 5, 15 * 60 * 1000)) {
      const timeUntilReset = getTimeUntilReset(ip)
      const minutesUntilReset = Math.ceil(timeUntilReset / 60000)
      
      return NextResponse.json(
        { 
          error: `Too many login attempts. Please try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.` 
        },
        { status: 429 }
      )
    }

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      // Don't reset rate limit on failed login
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      )
    }

    // Success - reset rate limit for this IP
    resetRateLimit(ip)

    return NextResponse.json({
      user: data.user,
      session: data.session,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
