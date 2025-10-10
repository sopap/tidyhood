import { getServiceClient } from '@/lib/db';

export type ConversationState = 
  | 'idle'
  | 'awaiting_pickup_confirm'
  | 'awaiting_pickup_notification'
  | 'awaiting_weight'
  | 'awaiting_quote_approval'
  | 'awaiting_delivery_confirm'
  | 'awaiting_delivery_suggestion';

export interface Conversation {
  id: string;
  partner_id: string | null;
  order_id: string | null;
  phone: string;
  state: ConversationState;
  context: {
    service_type?: string;
    last_intent?: string;
    order_short_id?: string;
    quoted_weight?: number;
    quote_cents?: number;
    [key: string]: any;
  };
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get active conversation for a phone number
 * Returns most recent non-idle conversation, or creates new idle one
 */
export async function getActiveConversation(phone: string): Promise<Conversation | null> {
  const db = getServiceClient();
  
  // Get most recent conversation for this phone
  const { data, error } = await db
    .from('partner_sms_conversations')
    .select('*')
    .eq('phone', phone)
    .order('last_message_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" which is okay
    console.error('Error getting conversation:', error);
    return null;
  }
  
  return data;
}

/**
 * Create new conversation for a partner and order
 */
export async function createConversation(
  phone: string,
  partnerId: string,
  orderId: string,
  initialState: ConversationState = 'idle',
  initialContext: Record<string, any> = {}
): Promise<Conversation | null> {
  const db = getServiceClient();
  
  const { data, error } = await db
    .from('partner_sms_conversations')
    .insert({
      phone,
      partner_id: partnerId,
      order_id: orderId,
      state: initialState,
      context: initialContext,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }
  
  return data;
}

/**
 * Update conversation state
 */
export async function updateConversationState(
  conversationId: string,
  newState: ConversationState,
  contextUpdate?: Record<string, any>
): Promise<boolean> {
  const db = getServiceClient();
  
  const updates: any = {
    state: newState,
    last_message_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  // Merge context if provided
  if (contextUpdate) {
    const { data: current } = await db
      .from('partner_sms_conversations')
      .select('context')
      .eq('id', conversationId)
      .single();
    
    if (current) {
      updates.context = {
        ...current.context,
        ...contextUpdate,
      };
    }
  }
  
  const { error } = await db
    .from('partner_sms_conversations')
    .update(updates)
    .eq('id', conversationId);
  
  if (error) {
    console.error('Error updating conversation:', error);
    return false;
  }
  
  return true;
}

/**
 * Get conversation by order ID
 */
export async function getConversationByOrder(orderId: string): Promise<Conversation | null> {
  const db = getServiceClient();
  
  const { data, error } = await db
    .from('partner_sms_conversations')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error getting conversation by order:', error);
    return null;
  }
  
  return data;
}

/**
 * Mark conversation as idle (conversation ended)
 */
export async function endConversation(conversationId: string): Promise<boolean> {
  return updateConversationState(conversationId, 'idle');
}

/**
 * Get or create conversation for a phone number
 * Used by webhook to get existing conversation or create idle one
 */
export async function getOrCreateConversation(phone: string): Promise<Conversation | null> {
  let conversation = await getActiveConversation(phone);
  
  if (!conversation) {
    // Create new idle conversation (no partner/order assigned yet)
    const db = getServiceClient();
    
    const { data, error } = await db
      .from('partner_sms_conversations')
      .insert({
        phone,
        state: 'idle',
        context: {},
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
    
    conversation = data;
  }
  
  return conversation;
}
