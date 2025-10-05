import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { logAudit } from '@/lib/audit'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { newStatus, reason } = await request.json()

    if (!newStatus) {
      return NextResponse.json(
        { error: 'New status is required' },
        { status: 400 }
      )
    }

    const db = getServiceClient()
    const orderId = params.id

    // Get current order
    const { data: order, error: fetchError } = await db
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (fetchError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const oldStatus = order.status

    // Update order status
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) throw updateError

    // Log audit trail
    await logAudit({
      actor_id: user.id,
      actor_role: 'admin',
      action: 'force_status_change',
      entity_type: 'order',
      entity_id: orderId,
      changes: {
        old_status: oldStatus,
        new_status: newStatus,
        reason: reason || 'Admin override'
      }
    })

    // Add admin note if reason provided
    if (reason) {
      await db
        .from('admin_notes')
        .insert({
          order_id: orderId,
          admin_id: user.id,
          note: `Status changed from ${oldStatus} to ${newStatus}. Reason: ${reason}`
        })
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order status updated successfully'
    })
  } catch (error) {
    console.error('Force status error:', error)
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}
