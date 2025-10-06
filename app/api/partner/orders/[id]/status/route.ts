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
    'in_progress',
    'out_for_delivery',
    'delivered',
    'completed',
    'canceled'
  ]),
  notes: z.string().optional()
})

// POST /api/partner/orders/[id]/status - Update order status
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
    const { status, notes } = updateStatusSchema.parse(body)
    
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
      .eq('id', orderId)
      .select()
      .single()
    
    if (updateError) {
      console.error('Error updating order status:', updateError)
      throw updateError
    }
    
    // Log event
    await db.from('order_events').insert({
      order_id: orderId,
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
      await sendStatusUpdateSMS(customerPhone, status, order.service_type, orderId)
    }
    
    // Increment recurring subscription visit counter only when order is truly complete:
    // - LAUNDRY: status = 'delivered' (items returned to customer)
    // - CLEANING: status = 'completed' (service finished)
    const isLaundry = order.service_type === 'LAUNDRY'
    const isTrulyComplete = (isLaundry && status === 'delivered') || (!isLaundry && status === 'completed')
    
    if (isTrulyComplete && order.subscription_id) {
      try {
        const visitResponse = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/recurring/visit-complete`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subscription_id: order.subscription_id,
              order_id: orderId,
            }),
          }
        )
        
        if (visitResponse.ok) {
          const visitData = await visitResponse.json()
          console.log(
            `[Recurring] Visit completed for subscription ${order.subscription_id}. ` +
            `Visits: ${visitData.visits_completed}, Next: ${visitData.next_date}`
          )
        } else {
          console.error('[Recurring] Failed to increment visit counter:', await visitResponse.text())
        }
      } catch (visitError) {
        console.error('[Recurring] Error incrementing visit counter:', visitError)
        // Don't throw - visit tracking failure shouldn't block status update
      }
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
  const isLaundry = serviceType === 'LAUNDRY'
  const messages: Record<string, string> = {
    'pending_pickup': `Tidyhood: Your ${serviceType.toLowerCase()} pickup is scheduled! We'll text you when the driver is on the way.`,
    'at_facility': `Tidyhood: We've received your ${serviceType.toLowerCase()} items! ${isLaundry ? "We'll weigh them and send you a quote shortly." : "Work is in progress."}`,
    'awaiting_payment': `Tidyhood: Your quote is ready! View and pay: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://tidyhood.vercel.app'}/orders/${orderId}/pay`,
    'paid_processing': `Tidyhood: Payment received! Your ${serviceType.toLowerCase()} is now being processed.`,
    'in_progress': `Tidyhood: Your ${serviceType.toLowerCase()} service is now in progress. We'll notify you when complete!`,
    'out_for_delivery': `Tidyhood: Great news! Your clean laundry is out for delivery and will arrive soon.`,
    'delivered': `Tidyhood: Your laundry has been delivered! Thank you for choosing Tidyhood.`,
    'completed': `Tidyhood: Your ${serviceType.toLowerCase()} service is complete! ${isLaundry ? 'Items are ready for pickup/delivery.' : 'Thank you for choosing Tidyhood!'}`
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
