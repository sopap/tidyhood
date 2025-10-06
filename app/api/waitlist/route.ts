import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'

// Simple rate limiting using in-memory store (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 3 // 3 submissions per minute per IP

function getRateLimitKey(ip: string): string {
  return `waitlist:${ip}`
}

function checkRateLimit(ip: string): boolean {
  const key = getRateLimitKey(ip)
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false
  }

  record.count++
  return true
}

/**
 * POST /api/waitlist - Submit waitlist signup
 * 
 * Body:
 * - email: string (required)
 * - zip_code: string (required)
 * - service_interest: 'laundry' | 'cleaning' | 'both' (required)
 * - message: string (optional)
 */
export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again in a minute.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, zip_code, service_interest, message, honeypot } = body

    // Honeypot field (bot protection)
    if (honeypot) {
      return NextResponse.json({ success: true }) // Fake success for bots
    }

    // Validation
    if (!email || !zip_code || !service_interest) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // ZIP code validation (5 digits)
    const zipRegex = /^\d{5}$/
    if (!zipRegex.test(zip_code)) {
      return NextResponse.json(
        { error: 'Invalid ZIP code. Must be 5 digits.' },
        { status: 400 }
      )
    }

    // Service interest validation
    if (!['laundry', 'cleaning', 'both'].includes(service_interest)) {
      return NextResponse.json(
        { error: 'Invalid service interest' },
        { status: 400 }
      )
    }

    // Get device info
    const userAgent = request.headers.get('user-agent') || ''
    const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent)
    const isTablet = /tablet|ipad/i.test(userAgent)
    const device_type = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'

    // Get referrer
    const referrer = request.headers.get('referer') || null

    // Insert into database
    const db = getServiceClient()
    const { data, error } = await db
      .from('waitlist')
      .insert({
        email: email.toLowerCase().trim(),
        zip_code: zip_code.trim(),
        service_interest,
        message: message?.trim() || null,
        device_type,
        referrer
      })
      .select()
      .single()

    if (error) {
      // Check for duplicate entry
      if (error.code === '23505') { // PostgreSQL unique violation code
        return NextResponse.json(
          { error: 'You are already on the waitlist for this ZIP code' },
          { status: 409 }
        )
      }

      console.error('Waitlist submission error:', error)
      return NextResponse.json(
        { error: 'Failed to submit. Please try again.' },
        { status: 500 }
      )
    }

    // TODO: Send confirmation email
    // await sendWaitlistConfirmationEmail(email, zip_code)

    return NextResponse.json({
      success: true,
      message: 'Thank you for joining our waitlist! We\'ll notify you when we expand to your area.'
    })

  } catch (error) {
    console.error('Waitlist API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/waitlist - Get waitlist entries (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const db = getServiceClient()

    // Get all waitlist entries ordered by most recent
    const { data, error } = await db
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching waitlist:', error)
      return NextResponse.json(
        { error: 'Failed to fetch waitlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({ entries: data })

  } catch (error) {
    console.error('Waitlist GET error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
