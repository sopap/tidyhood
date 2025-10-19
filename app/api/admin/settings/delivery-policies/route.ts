import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/delivery-policies
 * 
 * Fetches all active delivery time policies
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin()

    const db = getServiceClient()
    const { data, error } = await db
      .from('delivery_time_policies')
      .select('*')
      .eq('active', true)
      .order('service_type')

    if (error) {
      console.error('Error fetching delivery policies:', error)
      return NextResponse.json(
        { error: 'Failed to fetch delivery policies' },
        { status: 500 }
      )
    }

    return NextResponse.json({ policies: data || [] })
  } catch (error) {
    console.error('Delivery policies fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
