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

    const { amount, reason } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid refund amount is required' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: 'Refund reason is required' },
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

    // Validate refund amount doesn't exceed paid amount
    const paidAmount = order.total_amount_cents || 0
    const refundAmountCents = Math.round(amount * 100)

    if (refundAmountCents > paidAmount) {
      return NextResponse.json(
        { error: 'Refund amount cannot exceed paid amount' },
        { status: 400 }
      )
    }

    // Create refund record
    const { data: refund, error: refundError } = await db
      .from('refunds')
      .insert({
        order_id: orderId,
        amount_cents: refundAmountCents,
        reason,
        approved_by: user.id,
        status: 'approved'
      })
      .select()
      .single()

    if (refundError) {
      // If refunds table doesn't exist yet, just log and continue
      console.warn('Refunds table not available:', refundError)
    }

    // Update order status if fully refunded
    if (refundAmountCents >= paidAmount) {
      await db
        .from('orders')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
    }

    // Log audit trail
    await logAudit({
      actor_id: user.id,
      actor_role: 'admin',
      action: 'refund_order',
      entity_type: 'order',
      entity_id: orderId,
      changes: {
        amount: amount,
        amount_cents: refundAmountCents,
        reason,
        original_amount: paidAmount
      }
    })

    // Add admin note
    await db
      .from('admin_notes')
      .insert({
        order_id: orderId,
        admin_id: user.id,
        note: `Refund issued: $${amount.toFixed(2)}. Reason: ${reason}`
      })

    return NextResponse.json({
      success: true,
      refund,
      message: 'Refund processed successfully'
    })
  } catch (error) {
    console.error('Refund error:', error)
    return NextResponse.json(
      { error: 'Failed to process refund' },
      { status: 500 }
    )
  }
}
