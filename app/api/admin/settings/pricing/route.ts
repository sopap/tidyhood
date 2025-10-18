import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/pricing
 * 
 * Fetches all pricing rules with optional filtering
 * Query params:
 * - service_type: 'LAUNDRY' | 'CLEANING'
 * - active: 'true' | 'false'
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const serviceType = searchParams.get('service_type')
    const activeFilter = searchParams.get('active')

    const db = getServiceClient()
    let query = db
      .from('pricing_rules')
      .select('*')
      .order('service_type', { ascending: true })
      .order('priority', { ascending: true })

    if (serviceType) {
      query = query.eq('service_type', serviceType)
    }

    if (activeFilter) {
      query = query.eq('active', activeFilter === 'true')
    }

    const { data: rules, error } = await query

    if (error) {
      console.error('Error fetching pricing rules:', error)
      return NextResponse.json(
        { error: 'Failed to fetch pricing rules' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      rules: rules || [],
      total: rules?.length || 0
    })
  } catch (error) {
    console.error('Pricing rules fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
