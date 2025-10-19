import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{
    service_type: string
  }>
}

/**
 * GET /api/admin/settings/delivery-policies/[service_type]
 * 
 * Fetches a delivery time policy for a specific service type
 * Public endpoint - no auth required so booking page can fetch it
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { service_type } = await context.params

    // Validate service type
    if (!['LAUNDRY', 'CLEANING'].includes(service_type.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid service type' },
        { status: 400 }
      )
    }

    const db = getServiceClient()
    
    // Fetch the active policy
    const { data, error } = await db
      .from('delivery_time_policies')
      .select('*')
      .eq('service_type', service_type.toUpperCase())
      .eq('active', true)
      .single()

    if (error || !data) {
      console.warn(`No active delivery policy found for ${service_type}, returning fallback`)
      // Return fallback policy
      return NextResponse.json({
        standard_minimum_hours: 48,
        rush_enabled: true,
        rush_early_pickup_hours: 0,
        rush_late_pickup_hours: 24,
        rush_cutoff_hour: 11,
        same_day_earliest_hour: 18
      })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Delivery policy fetch error:', error)
    // Return fallback on error
    return NextResponse.json({
      standard_minimum_hours: 48,
      rush_enabled: true,
      rush_early_pickup_hours: 0,
      rush_late_pickup_hours: 24,
      rush_cutoff_hour: 11,
      same_day_earliest_hour: 18
    })
  }
}

/**
 * PUT /api/admin/settings/delivery-policies/[service_type]
 * 
 * Updates a delivery time policy for a specific service type
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Verify admin access
    await requireAdmin()

    const { service_type } = await context.params
    const body = await request.json()

    const {
      standard_minimum_hours,
      rush_enabled,
      rush_early_pickup_hours,
      rush_late_pickup_hours,
      rush_cutoff_hour,
      same_day_earliest_hour,
      notes,
      change_reason
    } = body

    // Validate service type
    if (!['LAUNDRY', 'CLEANING'].includes(service_type.toUpperCase())) {
      return NextResponse.json(
        { error: 'Invalid service type' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (standard_minimum_hours === undefined) {
      return NextResponse.json(
        { error: 'standard_minimum_hours is required' },
        { status: 400 }
      )
    }

    // Validate ranges
    if (standard_minimum_hours < 24 || standard_minimum_hours > 168) {
      return NextResponse.json(
        { error: 'standard_minimum_hours must be between 24 and 168' },
        { status: 400 }
      )
    }

    if (rush_cutoff_hour !== undefined && (rush_cutoff_hour < 0 || rush_cutoff_hour > 23)) {
      return NextResponse.json(
        { error: 'rush_cutoff_hour must be between 0 and 23' },
        { status: 400 }
      )
    }

    if (same_day_earliest_hour !== undefined && (same_day_earliest_hour < 0 || same_day_earliest_hour > 23)) {
      return NextResponse.json(
        { error: 'same_day_earliest_hour must be between 0 and 23' },
        { status: 400 }
      )
    }

    const db = getServiceClient()
    
    // Update the policy
    const { data, error } = await db
      .from('delivery_time_policies')
      .update({
        standard_minimum_hours,
        rush_enabled: rush_enabled ?? true,
        rush_early_pickup_hours: rush_early_pickup_hours ?? 0,
        rush_late_pickup_hours: rush_late_pickup_hours ?? 24,
        rush_cutoff_hour: rush_cutoff_hour ?? 11,
        same_day_earliest_hour: same_day_earliest_hour ?? 18,
        notes,
        updated_at: new Date().toISOString(),
        updated_by: 'admin', // TODO: Get actual admin user ID
        change_reason: change_reason || 'Updated via admin settings'
      })
      .eq('service_type', service_type.toUpperCase())
      .eq('active', true)
      .select()
      .single()

    if (error) {
      console.error('Error updating delivery policy:', error)
      return NextResponse.json(
        { error: 'Failed to update delivery policy' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Delivery policy updated successfully',
      policy: data
    })
  } catch (error) {
    console.error('Delivery policy update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
