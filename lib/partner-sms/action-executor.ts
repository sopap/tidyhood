import { getServiceClient } from '@/lib/db';
import { sendSMS } from '@/lib/sms';
import { responses, formatTimeForSMS, formatAddressForSMS } from './response-templates';
import { updateConversationState, type Conversation } from './conversation-state';
import type { ParsedIntent } from './intent-parser';

/**
 * Action Executor
 * Maps parsed intents to actual API calls/database updates
 * Thin wrapper over existing functionality
 */

export async function executeAction(
  intent: ParsedIntent,
  conversation: Conversation,
  partnerPhone: string
): Promise<string> {
  const db = getServiceClient();

  try {
    switch (intent.type) {
      case 'confirm': {
        // Update conversation state
        await updateConversationState(
          conversation.id,
          'awaiting_pickup_notification',
          { pickup_confirmed: true }
        );
        
        const pickupTime = conversation.context.pickup_time || 'scheduled time';
        return responses.pickupConfirmed(pickupTime);
      }

      case 'reschedule': {
        // Mark as needing reschedule, direct to portal
        await updateConversationState(
          conversation.id,
          'idle',
          { needs_reschedule: true }
        );
        
        return responses.pickupRescheduled();
      }

      case 'picked_up': {
        if (!conversation.order_id) {
          return responses.notFound();
        }

        // Update order status to picked_up
        await db
          .from('orders')
          .update({
            status: 'with_partner',
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversation.order_id);

        // Move to weight collection
        await updateConversationState(
          conversation.id,
          'awaiting_weight',
          { picked_up_at: new Date().toISOString() }
        );

        const shortId = conversation.context.order_short_id || 'order';
        return responses.requestWeight(shortId);
      }

      case 'weight': {
        if (!intent.value || typeof intent.value !== 'number') {
          return 'Please reply with just the weight number (e.g. "18")';
        }

        const weight = intent.value;
        
        // Store weight in context
        await updateConversationState(
          conversation.id,
          'awaiting_quote_approval',
          { 
            actual_weight: weight,
            weight_collected_at: new Date().toISOString()
          }
        );

        // Calculate quote (simplified - you'd call your existing pricing logic)
        const serviceType = conversation.context.service_type || 'laundry';
        const pricePerLb = serviceType === 'laundry' ? 175 : 300; // cents
        const quoteCents = weight * pricePerLb;

        // Store quote in context
        await updateConversationState(
          conversation.id,
          'awaiting_quote_approval',
          { 
            quoted_weight: weight,
            quote_cents: quoteCents
          }
        );

        // Send weight confirmation
        const confirmation = responses.weightConfirmed(weight, serviceType);
        await sendSMS({ to: partnerPhone, message: confirmation });

        // Send quote
        return responses.quoteReady(quoteCents, weight);
      }

      case 'delivered': {
        if (!conversation.order_id) {
          return responses.notFound();
        }

        // Confirm delivery slot
        await db
          .from('orders')
          .update({
            delivery_confirmed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversation.order_id);

        await updateConversationState(
          conversation.id,
          'idle',
          { delivery_confirmed_at: new Date().toISOString() }
        );

        const deliveryTime = conversation.context.delivery_time || 'scheduled time';
        return responses.deliveryConfirmed(deliveryTime);
      }

      case 'help': {
        return responses.unknown();
      }

      case 'unknown':
      default: {
        return responses.unknown();
      }
    }
  } catch (error) {
    console.error('Error executing action:', error);
    return responses.error();
  }
}

/**
 * Helper to send agent-initiated messages
 * These are called by triggers when order status changes
 */
export async function sendAgentMessage(
  partnerPhone: string,
  messageType: string,
  data: any
): Promise<void> {
  let message: string;

  switch (messageType) {
    case 'pickup_notification':
      message = responses.pickupNotification(data.order, data.pickupTime, data.address);
      break;
    case 'delivery_ready':
      message = responses.deliveryReady(data.deliveryTime, data.address);
      break;
    case 'order_complete':
      message = responses.orderComplete(data.orderShortId);
      break;
    default:
      console.warn(`Unknown message type: ${messageType}`);
      return;
  }

  await sendSMS({ to: partnerPhone, message });
}
