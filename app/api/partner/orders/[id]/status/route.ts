import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { ValidationError, handleApiError } from '@/lib/errors'
import { sendSMS } from '@/lib/sms'

const updateStatusSchema = z.object({
  status: z.enum([
    'pending_pickup',
    'at_facility',
    'awaiting_payment',
    'paid_processing',
    'completed',
    'CANCELED'
  ]),
  notes: z.string().optional()
})

// POST /api/partner/orders/[id]/status - Update order status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const db = getServiceClient()
    
    // Verify user is a partner
    if (user.role !== 'partner' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized - Partner access required' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    const { status, notes } = updateStatusSchema.parse(body)
    
    // Get order
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*, profiles!orders_user_id_fkey(phone)')
      .eq('id', params.id)
      .single()
    
    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
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
    
    // Update order status
    const updates: any = {
      status,
      updated_at: new Date().toISOString()
    }
    
    if (notes) {
      updates.partner_notes = notes
    }
    
    const { data: updatedOrder, error: updateError } = await db
      .from('orders')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating order status:', updateError)
      throw updateError
    }
    
    // Log event
    await db.from('order_events').insert({
      order_id: params.id,
      actor: user.id,
      actor_role: user.role,
      event_type: 'status_updated',
      payload_json: { 
        old_status: order.status,
        new_status: status,
        notes 
      }
    })
    
    // Send SMS notification to customer
    const customerPhone = order.profiles?.phone
    if (customerPhone) {
      await sendStatusUpdateSMS(customerPhone, status, order.service_type, params.id)
    }
    
    return NextResponse.json({ 
      success: true, 
      order: updatedOrder 
    })
  } catch (error) {
    console.error('Status update error:', error)
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

// Helper function to send SMS based on status
async function sendStatusUpdateSMS(phone: string, status: string, serviceType: string, orderId: string) {
  const messages: Record<string, string> = {
    'pending_pickup': `Tidyhood: Your ${serviceType.toLowerCase()} pickup is scheduled! We'll text you when the driver is on the way.`,
    'at_facility': `Tidyhood: We've received your ${serviceType.toLowerCase()} items! ${serviceType === 'LAUNDRY' ? "We'll weigh them and send you a quote shortly." : "Cleaning in progress."}`,
    'awaiting_payment': `Tidyhood: Your quote is ready! View and pay: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://tidyhood.vercel.app'}/orders/${orderId}/pay`,
    'paid_processing': `Tidyhood: Payment received! Your ${serviceType.toLowerCase()} is now being processed.`,
    'completed': `Tidyhood: Your ${serviceType.toLowerCase()} order is complete! ${serviceType === 'LAUNDRY' ? 'Items are ready for delivery.' : 'Thank you for choosing Tidyhood!'}`
  }
  
  const message = messages[status]
  if (message) {
    try {
      await sendSMS({ to: phone, message })
    } catch (error) {
      console.error('Failed to send status SMS:', error)
      // Don't throw - SMS failure shouldn't block status update
    }
  }
}
