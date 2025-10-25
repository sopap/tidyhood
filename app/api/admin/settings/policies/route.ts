import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/policies
 * 
 * Fetches active cancellation policies for all service types
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin()

    const db = getServiceClient()
    
    const { data: policies, error } = await db
      .from('cancellation_policies')
      .select('*')
      .eq('active', true)
      .order('service_type', { ascending: true })

    if (error) {
      console.error('Error fetching policies:', error)
      return NextResponse.json(
        { error: 'Failed to fetch cancellation policies' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      policies: policies || []
    })
  } catch (error) {
    console.error('Policies fetch error:', error)
    
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
