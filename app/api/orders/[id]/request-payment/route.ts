import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendSMS } from '@/lib/sms';

/**
 * POST /api/orders/[id]/request-payment
 * 
 * Handles failed charge recovery workflow.
 * 
 * When a final charge fails (after partner quote):
 * 1. Mark order as payment_failed
 * 2. Send SMS to customer with payment link
 * 3. Start 24h grace period
 * 4. Customer can update payment method and retry
 * 5. If not resolved within 24h: Apply no-show fee OR send to collections
 * 
 * This is triggered by:
 * - Webhook: payment_intent.payment_failed
 * - Manual: Admin/partner triggering retry
 * - Automatic: Grace period expiration cron job
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: orderId } = params;
    const db = getServiceClient();
    
    // Get order details
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('*, profiles!inner(phone, email, name)')
      .eq('id', orderId)
      .single();
    
    if (orderError || !order) {
      logger.error({
        event: 'request_payment_order_not_found',
        order_id: orderId,
        error: orderError
      });
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    // Verify order is in payment_failed status
    if (order.status !== 'payment_failed') {
      logger.warn({
        event: 'request_payment_invalid_status',
        order_id: orderId,
        current_status: order.status
      });
      return NextResponse.json({ 
        error: 'Order must be in payment_failed status' 
      }, { status: 400 });
    }
    
    // Get customer phone number
    const customerPhone = order.profiles?.phone;
    if (!customerPhone) {
      logger.error({
        event: 'request_payment_no_phone',
        order_id: orderId
      });
      return NextResponse.json({ 
        error: 'Customer phone number not available' 
      }, { status: 400 });
    }
    
    // Generate payment link
    const paymentLink = `${process.env.NEXT_PUBLIC_SITE_URL}/orders/${orderId}/pay`;
    
    // Calculate grace period expiry (24 hours from now)
    const gracePeriodExpiry = new Date();
    gracePeriodExpiry.setHours(gracePeriodExpiry.getHours() + 24);
    
    // Send SMS notification
    const smsMessage = formatPaymentRequestSMS({
      orderId,
      amount: order.total_cents,
      paymentLink,
      gracePeriodExpiry
    });
    
    try {
      await sendSMS({
        to: customerPhone,
        message: smsMessage
      });
      
      logger.info({
        event: 'payment_request_sms_sent',
        order_id: orderId,
        phone: customerPhone
      });
    } catch (smsError) {
      logger.error({
        event: 'payment_request_sms_failed',
        order_id: orderId,
        error: smsError
      });
      // Continue even if SMS fails - customer can still access order
    }
    
    // Update order with grace period info
    const { error: updateError } = await db
      .from('orders')
      .update({
        payment_retry_requested_at: new Date().toISOString(),
        payment_grace_period_expiry: gracePeriodExpiry.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);
    
    if (updateError) {
      logger.error({
        event: 'request_payment_update_failed',
        order_id: orderId,
        error: updateError
      });
      return NextResponse.json({ 
        error: 'Failed to update order' 
      }, { status: 500 });
    }
    
    // Log event
    await db.from('order_events').insert({
      order_id: orderId,
      event_type: 'payment_retry_requested',
      actor_role: 'system',
      payload_json: {
        grace_period_expiry: gracePeriodExpiry.toISOString(),
        payment_link: paymentLink
      }
    });
    
    logger.info({
      event: 'payment_retry_requested',
      order_id: orderId,
      grace_period_expiry: gracePeriodExpiry.toISOString()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Payment retry requested',
      grace_period_expiry: gracePeriodExpiry.toISOString(),
      payment_link: paymentLink
    });
    
  } catch (error) {
    logger.error({
      event: 'request_payment_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ 
      error: 'Failed to process payment request' 
    }, { status: 500 });
  }
}

/**
 * GET /api/orders/[id]/request-payment
 * 
 * Check grace period status and remaining time
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: orderId } = params;
    const db = getServiceClient();
    
    const { data: order, error } = await db
      .from('orders')
      .select('payment_retry_requested_at, payment_grace_period_expiry, status')
      .eq('id', orderId)
      .single();
    
    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    
    const now = new Date();
    const expiryDate = order.payment_grace_period_expiry 
      ? new Date(order.payment_grace_period_expiry)
      : null;
    
    const isExpired = expiryDate ? expiryDate < now : false;
    const remainingMs = expiryDate ? expiryDate.getTime() - now.getTime() : 0;
    const remainingHours = Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60)));
    const remainingMinutes = Math.max(0, Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60)));
    
    return NextResponse.json({
      order_id: orderId,
      status: order.status,
      grace_period_active: order.status === 'payment_failed' && !isExpired,
      grace_period_expired: isExpired,
      grace_period_expiry: order.payment_grace_period_expiry,
      remaining_time: {
        hours: remainingHours,
        minutes: remainingMinutes,
        formatted: `${remainingHours}h ${remainingMinutes}m`
      }
    });
    
  } catch (error) {
    logger.error({
      event: 'get_grace_period_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ 
      error: 'Failed to get grace period status' 
    }, { status: 500 });
  }
}

/**
 * Format SMS message for payment retry request
 */
function formatPaymentRequestSMS({
  orderId,
  amount,
  paymentLink,
  gracePeriodExpiry
}: {
  orderId: string;
  amount: number;
  paymentLink: string;
  gracePeriodExpiry: Date;
}): string {
  const amountDollars = (amount / 100).toFixed(2);
  const expiryTime = gracePeriodExpiry.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const expiryDate = gracePeriodExpiry.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
  
  return `Your laundry quote ($${amountDollars}) is ready but payment failed. Please update your payment method by ${expiryTime} ${expiryDate} to avoid a $25 no-show fee: ${paymentLink}`;
}

/**
 * CRON Job Handler: Check expired grace periods
 * 
 * This should be called periodically (e.g., every hour) to:
 * 1. Find orders with expired grace periods
 * 2. Apply no-show fee
 * 3. Update order status
 */
export async function checkExpiredGracePeriods() {
  const db = getServiceClient();
  const now = new Date().toISOString();
  
  // Find orders with expired grace periods
  const { data: expiredOrders, error } = await db
    .from('orders')
    .select('*')
    .eq('status', 'payment_failed')
    .not('payment_grace_period_expiry', 'is', null)
    .lt('payment_grace_period_expiry', now);
  
  if (error) {
    logger.error({
      event: 'check_expired_grace_periods_error',
      error: error
    });
    return;
  }
  
  if (!expiredOrders || expiredOrders.length === 0) {
    return;
  }
  
  logger.info({
    event: 'expired_grace_periods_found',
    count: expiredOrders.length
  });
  
  // Process each expired order
  for (const order of expiredOrders) {
    try {
      // Apply no-show fee (configured in payment-config.ts)
      const NO_SHOW_FEE_CENTS = 2500; // $25
      
      const { error: updateError } = await db
        .from('orders')
        .update({
          no_show_charged: true,
          no_show_fee_cents: NO_SHOW_FEE_CENTS,
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);
      
      if (updateError) {
        logger.error({
          event: 'apply_no_show_fee_error',
          order_id: order.id,
          error: updateError
        });
        continue;
      }
      
      // Log event
      await db.from('order_events').insert({
        order_id: order.id,
        event_type: 'no_show_fee_applied',
        actor_role: 'system',
        payload_json: {
          fee_cents: NO_SHOW_FEE_CENTS,
          reason: 'payment_grace_period_expired'
        }
      });
      
      logger.info({
        event: 'no_show_fee_applied',
        order_id: order.id,
        fee_cents: NO_SHOW_FEE_CENTS
      });
      
      // TODO: Send final SMS notification
      // TODO: Send to collections if necessary
      
    } catch (err) {
      logger.error({
        event: 'process_expired_grace_period_error',
        order_id: order.id,
        error: err
      });
    }
  }
}
