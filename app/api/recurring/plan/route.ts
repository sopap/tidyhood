import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic'

/**
 * GET /api/recurring/plan
 * List user's active recurring plans
 */
export async function GET(request: NextRequest) {
  try {
    // Add timeout wrapper for auth check
    const user = await Promise.race([
      requireAuth(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 5000)
      )
    ]) as Awaited<ReturnType<typeof requireAuth>>
    
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHENTICATED',
          message: 'Please log in to view recurring plans'
        },
        { status: 401 }
      )
    }
    const db = getServiceClient()

    const { data: plans, error } = await db
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/recurring/plan] Database error:', error)
      throw error
    }

    return NextResponse.json({ plans })
  } catch (error) {
    console.error('[GET /api/recurring/plan] Error:', error)
    
    // Handle specific auth/timeout errors
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || 
          error.message.includes('JWT') ||
          error.message.includes('Auth timeout')) {
        return NextResponse.json(
          { 
            error: 'Session expired or invalid',
            code: 'UNAUTHENTICATED',
            message: 'Please log in again to continue'
          },
          { status: 401 }
        )
      }
      
      if (error.message.includes('timeout') || 
          error.message.includes('Timeout')) {
        return NextResponse.json(
          { 
            error: 'Request timeout',
            code: 'TIMEOUT',
            message: 'The request took too long. Please try again.'
          },
          { status: 408 }
        )
      }
    }
    
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}

/**
 * POST /api/recurring/plan
 * Create a new recurring plan
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const db = getServiceClient()
    const body = await request.json()

    const {
      service_type,
      frequency,
      day_of_week,
      time_window,
      default_addons,
      first_visit_deep,
      next_date,
    } = body

    // Validate required fields
    if (!service_type || !frequency) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Map frontend frequency to DB format
    const dbFrequency = frequency.toUpperCase()

    // Get discount percentage
    const RECURRING_DISCOUNTS: Record<string, number> = {
      WEEKLY: 0.20,
      BIWEEKLY: 0.15,
      MONTHLY: 0.10,
    }
    const discount_pct = RECURRING_DISCOUNTS[dbFrequency] || 0

    const { data: plan, error } = await db
      .from('subscriptions')
      .insert({
        user_id: user.id,
        service_type,
        frequency: dbFrequency,
        visits_completed: 0,
        day_of_week,
        time_window,
        default_addons: default_addons || {},
        first_visit_deep: first_visit_deep || false,
        discount_pct,
        next_date,
        active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/recurring/plan] Database error:', error)
      throw error
    }

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/recurring/plan] Error:', error)
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.statusCode }
    )
  }
}

/**
 * PATCH /api/recurring/plan
 * Update multiple plans (bulk operations like pause all)
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const db = getServiceClient()
    const body = await request.json()

    const { action } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required action' },
        { status: 400 }
      )
    }

    if (action === 'pause_all') {
      const { error } = await db
        .from('subscriptions')
        .update({ active: false })
        .eq('user_id', user.id)
        .eq('active', true)

      if (error) {
        console.error('[PATCH /api/recurring/plan] Database error:', error)
        throw error
      }

      return NextResponse.json({ message: 'All plans paused' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[PATCH /api/recurring/plan] Error:', error)
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.statusCode }
    )
  }
}
