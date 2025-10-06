import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { quoteLaundry } from '@/lib/pricing'
import { handleApiError } from '@/lib/errors'
import { sendSMS } from '@/lib/sms'

const submitQuoteSchema = z.object({
  actual_weight_lbs: z.number().positive(),
  notes: z.string().optional()
})

// POST /api/partner/orders/[id]/quote - Submit weight and quote for laundry order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: orderId } = await params
    const db = getServiceClient()
    
    // Verify user is a partner
    if (user.role !== 'partner' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Partner access required' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { actual_weight_lbs, notes } = submitQuoteSchema.parse(body)
    
    // Get order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*, profiles!orders_user_id_fkey(phone)')
      .eq('id', orderId)
      .single()
    
    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }
    
    // Verify this is a laundry order
    if (order.service_type !== 'LAUNDRY') {
      return NextResponse.json(
        { error: 'Quotes only apply to laundry orders' },
        { status: 400 }
      )
    }
    
    // Verify order is in correct status
    if (order.status !== 'at_facility' && order.status !== 'pending_pickup') {
      return NextResponse.json(
        { error: `Cannot submit quote for order in status: ${order.status}` },
        { status: 400 }
      )
    }
    
    // Verify partner owns this order (unless admin)
    if (user.role === 'partner') {
      const { data: partner } = await db
        .from('partners')
        .select('id')
        .eq('contact_email', user.email)
        .single()
      
      if (!partner || order.partner_id !== partner.id) {
        return NextResponse.json(
          { error: 'Unauthorized - Order belongs to different partner' },
          { status: 403 }
        )
      }
    }
    
    // Calculate quote based on actual weight
    const addons = order.order_details?.addons || []
    const pricing = await quoteLaundry({
      zip: order.address_snapshot.zip,
      lbs: actual_weight_lbs,
      addons
    })
    
    // Update order with actual weight and quote
    const updates = {
      actual_weight_lbs,
      quote_cents: pricing.total_cents,
      quoted_at: new Date().toISOString(),
      status: 'awaiting_payment',
      partner_notes: notes || order.partner_notes
    }
    
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error submitting quote:', updateError)
      throw updateError
    }
    
    // Log event
    await db.from('order_events').insert({
      order_id: orderId,
      actor: user.id,
      actor_role: user.role,
      event_type: 'quote_submitted',
      payload_json: {
        actual_weight_lbs,
        quote_cents: pricing.total_cents,
        pricing_breakdown: pricing,
        notes
      }
    })
    
    // Send SMS with payment link to customer
    const customerPhone = order.profiles?.phone
    if (customerPhone) {
      const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tidyhood.vercel.app'}/orders/${orderId}/pay`
      const amount = `$${(pricing.total_cents / 100).toFixed(2)}`
      
      await sendSMS({
        to: customerPhone,
        message: `Tidyhood: Your laundry quote is ready! ${actual_weight_lbs} lbs = ${amount}. Pay now: ${paymentUrl}`
      }).catch(err => {
        console.error('Failed to send quote SMS:', err)
        // Don't throw - SMS failure shouldn't block quote submission
      })
    }
    
    return NextResponse.json({
      success: true,
      order: updatedOrder,
      quote: {
        actual_weight_lbs,
        quote_cents: pricing.total_cents,
        subtotal_cents: pricing.subtotal_cents,
        tax_cents: pricing.tax_cents,
        payment_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://tidyhood.vercel.app'}/orders/${orderId}/pay`
      }
    })
  } catch (error) {
    console.error('Quote submission error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error },
      { status: apiError.statusCode }
    )
  }
}
