import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'
import { requireAdmin, getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/admin/settings/pricing/[id]
 * 
 * Updates a single pricing rule
 * Body: { unit_price_cents?, multiplier?, active?, change_reason? }
 */
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Verify admin access
    const adminUser = await requireAdmin()
    const { id } = await context.params
    
    const body = await request.json()
    const { unit_price_cents, multiplier, active, change_reason } = body

    // Validation
    if (unit_price_cents !== undefined && unit_price_cents <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than 0' },
        { status: 400 }
      )
    }

    if (multiplier !== undefined && (multiplier <= 0 || multiplier > 10)) {
      return NextResponse.json(
        { error: 'Multiplier must be between 0 and 10' },
        { status: 400 }
      )
    }

    const db = getServiceClient()

    // Fetch old values for audit
    const { data: oldRule, error: fetchError } = await db
      .from('pricing_rules')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !oldRule) {
      return NextResponse.json(
        { error: 'Pricing rule not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updates: any = {
      updated_by: adminUser.id,
      change_reason: change_reason || null
    }

    if (unit_price_cents !== undefined) updates.unit_price_cents = unit_price_cents
    if (multiplier !== undefined) updates.multiplier = multiplier
    if (active !== undefined) updates.active = active

    // Update pricing rule
    const { data: updatedRule, error: updateError } = await db
      .from('pricing_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating pricing rule:', updateError)
      return NextResponse.json(
        { error: 'Failed to update pricing rule' },
        { status: 500 }
      )
    }

    // Log changes to audit table
    const changes = []
    if (unit_price_cents !== undefined && oldRule.unit_price_cents !== unit_price_cents) {
      changes.push({
        field: 'unit_price_cents',
        oldValue: oldRule.unit_price_cents,
        newValue: unit_price_cents
      })
    }
    if (multiplier !== undefined && oldRule.multiplier !== multiplier) {
      changes.push({
        field: 'multiplier',
        oldValue: oldRule.multiplier,
        newValue: multiplier
      })
    }
    if (active !== undefined && oldRule.active !== active) {
      changes.push({
        field: 'active',
        oldValue: oldRule.active,
        newValue: active
      })
    }

    // Insert audit logs
    for (const change of changes) {
      await db.from('settings_audit_log').insert({
        table_name: 'pricing_rules',
        record_id: id,
        action: change.field === 'active' ? 'TOGGLE' : 'UPDATE',
        field_name: change.field,
        old_value: String(change.oldValue),
        new_value: String(change.newValue),
        changed_by: adminUser.id,
        change_reason: change_reason || null
      })
    }

    return NextResponse.json({
      rule: updatedRule,
      success: true,
      changesLogged: changes.length
    })
  } catch (error) {
    console.error('Pricing rule update error:', error)
    
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
