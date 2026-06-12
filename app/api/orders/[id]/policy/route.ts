import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { NotFoundError, ForbiddenError, handleApiError } from '@/lib/errors'
import { getCancellationPolicy } from '@/lib/cancellationFees'

export const dynamic = 'force-dynamic'

/**
 * GET /api/orders/[id]/policy
 *
 * Returns the cancellation/reschedule policy computed for this order
 * (using the policy version locked at booking time).
 *
 * Exists because lib/cancellationFees.getCancellationPolicy needs the
 * service-role DB client and therefore can only run server-side — the
 * order detail page (a client component) must fetch it from here.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: orderId } = await params
    const db = getServiceClient()

    const { data: order, error } = await db
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error || !order) {
      throw new NotFoundError('Order not found')
    }

    if (
      order.user_id !== user.id &&
      user.role !== 'admin' &&
      !(user.role === 'partner' && order.partner_id)
    ) {
      throw new ForbiddenError()
    }

    const policy = await getCancellationPolicy(order)
    return NextResponse.json(policy)
  } catch (error) {
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}
