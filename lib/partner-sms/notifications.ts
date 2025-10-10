import { sendAgentMessage } from './action-executor';
import { createConversation, updateConversationState } from './conversation-state';
import { formatTimeForSMS, formatAddressForSMS } from './response-templates';
import { getServiceClient } from '@/lib/db';

/**
 * Partner SMS Notifications
 * Call these functions after order status changes to trigger SMS to partner
 */

interface Partner {
  id: string;
  phone: string;
}

interface Order {
  id: string;
  service_type: string;
  status: string;
  pickup_slot?: {
    start_time: string;
  };
  delivery_slot?: {
    start_time: string;
  };
  service_address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

/**
 * Notify partner about new order ready for pickup
 * Call this when order is assigned to partner
 */
export async function notifyPartnerNewOrder(
  order: Order,
  partner: Partner
): Promise<void> {
  if (!partner.phone) {
    console.warn(`Partner ${partner.id} has no phone number`);
    return;
  }

  try {
    // Create conversation for this order
    const pickupTime = order.pickup_slot?.start_time 
      ? formatTimeForSMS(new Date(order.pickup_slot.start_time))
      : 'TBD';
    
    const address = order.service_address
      ? `${order.service_address.street}, ${order.service_address.city}`
      : 'TBD';

    await createConversation(
      partner.phone,
      partner.id,
      order.id,
      'awaiting_pickup_confirm',
      {
        service_type: order.service_type,
        order_short_id: order.id.slice(-4),
        pickup_time: pickupTime,
      }
    );

    // Send SMS
    await sendAgentMessage(
      partner.phone,
      'pickup_notification',
      {
        order,
        pickupTime,
        address,
      }
    );

    console.log(`Sent new order notification to partner ${partner.id}`);
  } catch (error) {
    console.error(`Failed to notify partner ${partner.id}:`, error);
  }
}

/**
 * Notify partner that order is ready for delivery
 * Call this after admin approves quote and charges customer
 */
export async function notifyPartnerReadyForDelivery(
  order: Order,
  partner: Partner
): Promise<void> {
  if (!partner.phone) {
    console.warn(`Partner ${partner.id} has no phone number`);
    return;
  }

  try {
    const db = getServiceClient();
    
    // Get conversation for this order
    const { data: conversation } = await db
      .from('partner_sms_conversations')
      .select('*')
      .eq('order_id', order.id)
      .single();

    if (!conversation) {
      console.warn(`No conversation found for order ${order.id}`);
      return;
    }

    // Update conversation state
    const deliveryTime = order.delivery_slot?.start_time
      ? formatTimeForSMS(new Date(order.delivery_slot.start_time))
      : 'TBD';
    
    const address = order.service_address
      ? `${order.service_address.street}, ${order.service_address.city}`
      : 'TBD';

    await updateConversationState(
      conversation.id,
      'awaiting_delivery_confirm',
      {
        delivery_time: deliveryTime,
      }
    );

    // Send SMS
    await sendAgentMessage(
      partner.phone,
      'delivery_ready',
      {
        deliveryTime,
        address,
      }
    );

    console.log(`Sent delivery ready notification to partner ${partner.id}`);
  } catch (error) {
    console.error(`Failed to notify partner ${partner.id}:`, error);
  }
}

/**
 * Notify partner that order is complete
 * Call this after delivery is confirmed
 */
export async function notifyPartnerOrderComplete(
  order: Order,
  partner: Partner
): Promise<void> {
  if (!partner.phone) {
    console.warn(`Partner ${partner.id} has no phone number`);
    return;
  }

  try {
    const db = getServiceClient();
    
    // Get conversation for this order
    const { data: conversation } = await db
      .from('partner_sms_conversations')
      .select('*')
      .eq('order_id', order.id)
      .single();

    if (conversation) {
      // Mark conversation as idle
      await updateConversationState(conversation.id, 'idle');
    }

    // Send SMS
    await sendAgentMessage(
      partner.phone,
      'order_complete',
      {
        orderShortId: order.id.slice(-4),
      }
    );

    console.log(`Sent order complete notification to partner ${partner.id}`);
  } catch (error) {
    console.error(`Failed to notify partner ${partner.id}:`, error);
  }
}

/**
 * Helper: Get partner for an order
 */
export async function getPartnerForOrder(orderId: string): Promise<Partner | null> {
  const db = getServiceClient();
  
  const { data: order } = await db
    .from('orders')
    .select('partner_id')
    .eq('id', orderId)
    .single();

  if (!order?.partner_id) {
    return null;
  }

  const { data: partner } = await db
    .from('partners')
    .select('id, phone')
    .eq('id', order.partner_id)
    .single();

  return partner;
}
