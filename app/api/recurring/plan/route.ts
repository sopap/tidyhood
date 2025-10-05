import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

/**
 * GET /api/recurring/plan
 * List user's active recurring plans
 */
export async function GET(request: NextRequest) {
  try {
    const db = getServiceClient()
    
    // Extract user ID from query params (for testing)
    // TODO: In production, get userId from authenticated session
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const { data: plans, error } = await db
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ plans })
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error },
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
    const db = getServiceClient()
    const body = await request.json()

    const {
      user_id,
      service_type,
      frequency,
      day_of_week,
      time_window,
      default_addons,
      first_visit_deep,
      next_date,
    } = body

    // Validate required fields
    if (!user_id || !service_type || !frequency) {
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
        user_id,
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

    if (error) throw error

    return NextResponse.json({ plan }, { status: 201 })
  } catch (error) {
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
    const db = getServiceClient()
    const body = await request.json()

    const { user_id, action } = body

    if (!user_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (action === 'pause_all') {
      const { error } = await db
        .from('subscriptions')
        .update({ active: false })
        .eq('user_id', user_id)
        .eq('active', true)

      if (error) throw error

      return NextResponse.json({ message: 'All plans paused' })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.statusCode }
    )
  }
}
