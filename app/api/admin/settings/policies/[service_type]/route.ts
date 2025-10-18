import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ service_type: string }>
}

/**
 * PUT /api/admin/settings/policies/[service_type]
 * 
 * Updates cancellation policy for LAUNDRY or CLEANING
 * Archives old policy and creates new active one
 * 
 * Body: {
 *   notice_hours: number,
 *   cancellation_fee_percent: number,
 *   reschedule_notice_hours: number,
 *   reschedule_fee_percent: number,
 *   allow_cancellation: boolean,
 *   allow_rescheduling: boolean,
 *   notes?: string,
 *   change_reason?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Verify admin access
    const adminUser = await requireAdmin()
    const { service_type } = await context.params
    
    // Validate service type
    if (service_type !== 'LAUNDRY' && service_type !== 'CLEANING') {
      return NextResponse.json(
        { error: 'Invalid service type. Must be LAUNDRY or CLEANING' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      notice_hours,
      cancellation_fee_percent,
      reschedule_notice_hours,
      reschedule_fee_percent,
      allow_cancellation,
      allow_rescheduling,
      notes,
      change_reason
    } = body

    // Validation
    if (notice_hours < 0 || notice_hours > 168) {
      return NextResponse.json(
        { error: 'Notice hours must be between 0 and 168 (1 week)' },
        { status: 400 }
      )
    }

    if (cancellation_fee_percent < 0 || cancellation_fee_percent > 0.50) {
      return NextResponse.json(
        { error: 'Cancellation fee must be between 0% and 50%' },
        { status: 400 }
      )
    }

    if (reschedule_notice_hours < 0 || reschedule_notice_hours > 168) {
      return NextResponse.json(
        { error: 'Reschedule notice hours must be between 0 and 168 (1 week)' },
        { status: 400 }
      )
    }

    if (reschedule_fee_percent < 0 || reschedule_fee_percent > 0.50) {
      return NextResponse.json(
        { error: 'Reschedule fee must be between 0% and 50%' },
        { status: 400 }
      )
    }

    const db = getServiceClient()

    // Begin transaction: Archive old policy and create new one
    
    // 1. Fetch current active policy for audit
    const { data: oldPolicy, error: fetchError } = await db
      .from('cancellation_policies')
      .select('*')
      .eq('service_type', service_type)
      .eq('active', true)
      .single()

    if (fetchError) {
      console.error('Error fetching current policy:', fetchError)
    }

    // 2. Deactivate old policy
    if (oldPolicy) {
      const { error: deactivateError } = await db
        .from('cancellation_policies')
        .update({ active: false })
        .eq('id', oldPolicy.id)

      if (deactivateError) {
        console.error('Error deactivating old policy:', deactivateError)
        return NextResponse.json(
          { error: 'Failed to archive old policy' },
          { status: 500 }
        )
      }
    }

    // 3. Create new active policy
    const { data: newPolicy, error: createError } = await db
      .from('cancellation_policies')
      .insert({
        service_type,
        notice_hours,
        cancellation_fee_percent,
        reschedule_notice_hours,
        reschedule_fee_percent,
        allow_cancellation,
        allow_rescheduling,
        active: true,
        effective_at: new Date().toISOString(),
        updated_by: adminUser.id,
        notes: notes || null
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating new policy:', createError)
      return NextResponse.json(
        { error: 'Failed to create new policy' },
        { status: 500 }
      )
    }

    // 4. Log policy changes to audit table
    const changes = []
    
    if (oldPolicy) {
      if (oldPolicy.notice_hours !== notice_hours) {
        changes.push({
          field: 'notice_hours',
          oldValue: oldPolicy.notice_hours,
          newValue: notice_hours
        })
      }
      if (oldPolicy.cancellation_fee_percent !== cancellation_fee_percent) {
        changes.push({
          field: 'cancellation_fee_percent',
          oldValue: oldPolicy.cancellation_fee_percent,
          newValue: cancellation_fee_percent
        })
      }
      if (oldPolicy.reschedule_notice_hours !== reschedule_notice_hours) {
        changes.push({
          field: 'reschedule_notice_hours',
          oldValue: oldPolicy.reschedule_notice_hours,
          newValue: reschedule_notice_hours
        })
      }
      if (oldPolicy.reschedule_fee_percent !== reschedule_fee_percent) {
        changes.push({
          field: 'reschedule_fee_percent',
          oldValue: oldPolicy.reschedule_fee_percent,
          newValue: reschedule_fee_percent
        })
      }
    }

    // Insert audit logs
    for (const change of changes) {
      await db.from('settings_audit_log').insert({
        table_name: 'cancellation_policies',
        record_id: newPolicy.id,
        action: 'UPDATE',
        field_name: change.field,
        old_value: String(change.oldValue),
        new_value: String(change.newValue),
        changed_by: adminUser.id,
        change_reason: change_reason || null
      })
    }

    // If no old policy existed, log creation
    if (!oldPolicy) {
      await db.from('settings_audit_log').insert({
        table_name: 'cancellation_policies',
        record_id: newPolicy.id,
        action: 'CREATE',
        field_name: 'policy',
        old_value: null,
        new_value: JSON.stringify(newPolicy),
        changed_by: adminUser.id,
        change_reason: change_reason || 'Initial policy creation'
      })
    }

    // 5. Count affected future orders (orders not yet completed/cancelled)
    const { count: affectedOrders } = await db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('service_type', service_type)
      .in('status', ['PENDING', 'SCHEDULED', 'IN_PROGRESS', 'AWAITING_PAYMENT'])

    return NextResponse.json({
      policy: newPolicy,
      oldPolicy: oldPolicy || null,
      success: true,
      changesLogged: changes.length,
      affectedOrders: affectedOrders || 0,
      message: `Policy updated successfully. ${affectedOrders || 0} future orders will use new policy.`
    })
  } catch (error) {
    console.error('Policy update error:', error)
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
