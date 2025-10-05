import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

/**
 * GET /api/recurring/plan/[id]
 * Get a single recurring plan
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getServiceClient()
    const { id } = params

    const { data: plan, error } = await db
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.statusCode }
    )
  }
}

/**
 * PATCH /api/recurring/plan/[id]
 * Update a recurring plan (pause/resume, change frequency, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getServiceClient()
    const { id } = params
    const body = await request.json()

    const {
      frequency,
      active,
      day_of_week,
      time_window,
      default_addons,
      next_date,
    } = body

    // Build update object
    const updates: any = {}

    if (frequency !== undefined) {
      updates.frequency = frequency.toUpperCase()
      // Update discount percentage when frequency changes
      const RECURRING_DISCOUNTS: Record<string, number> = {
        WEEKLY: 0.20,
        BIWEEKLY: 0.15,
        MONTHLY: 0.10,
      }
      updates.discount_pct = RECURRING_DISCOUNTS[updates.frequency] || 0
    }

    if (active !== undefined) updates.active = active
    if (day_of_week !== undefined) updates.day_of_week = day_of_week
    if (time_window !== undefined) updates.time_window = time_window
    if (default_addons !== undefined) updates.default_addons = default_addons
    if (next_date !== undefined) updates.next_date = next_date

    const { data: plan, error } = await db
      .from('subscriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ plan })
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.statusCode }
    )
  }
}

/**
 * DELETE /api/recurring/plan/[id]
 * Cancel a recurring plan
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getServiceClient()
    const { id } = params

    // Soft delete by setting active to false
    const { error } = await db
      .from('subscriptions')
      .update({ active: false })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ message: 'Plan canceled successfully' })
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.statusCode }
    )
  }
}
