import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

/**
 * POST /api/recurring/visit-complete
 * Increment visits_completed for a subscription
 * Called when order status changes to DELIVERED
 */
export async function POST(request: NextRequest) {
  try {
    const db = getServiceClient()
    const body = await request.json()

    const { subscription_id, order_id } = body

    if (!subscription_id) {
      return NextResponse.json(
        { error: 'Subscription ID required' },
        { status: 400 }
      )
    }

    // Get current subscription
    const { data: subscription, error: fetchError } = await db
      .from('subscriptions')
      .select('*')
      .eq('id', subscription_id)
      .single()

    if (fetchError) throw fetchError

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Increment visits_completed
    const newVisitsCompleted = (subscription.visits_completed || 0) + 1

    // Calculate next visit date based on frequency
    const calculateNextDate = (frequency: string): string => {
      const now = new Date()
      switch (frequency) {
        case 'WEEKLY':
          now.setDate(now.getDate() + 7)
          break
        case 'BIWEEKLY':
          now.setDate(now.getDate() + 14)
          break
        case 'MONTHLY':
          now.setMonth(now.getMonth() + 1)
          break
      }
      return now.toISOString().split('T')[0] // Return YYYY-MM-DD
    }

    const next_date = calculateNextDate(subscription.frequency)

    // Update subscription
    const { data: updated, error: updateError } = await db
      .from('subscriptions')
      .update({
        visits_completed: newVisitsCompleted,
        next_date,
      })
      .eq('id', subscription_id)
      .select()
      .single()

    if (updateError) throw updateError

    console.log(
      `[Recurring] Visit completed for subscription ${subscription_id}. Visits: ${newVisitsCompleted}, Next: ${next_date}`
    )

    return NextResponse.json({
      subscription: updated,
      visits_completed: newVisitsCompleted,
      next_date,
    })
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.statusCode }
    )
  }
}
