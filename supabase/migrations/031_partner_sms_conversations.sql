-- Partner SMS Conversations
-- Tracks SMS conversation state for partner agent interactions

CREATE TABLE IF NOT EXISTS partner_sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'idle',
  context JSONB DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by phone number
CREATE INDEX idx_partner_sms_phone ON partner_sms_conversations(phone);

-- Index for active conversations (not idle)
CREATE INDEX idx_partner_sms_active ON partner_sms_conversations(state) WHERE state != 'idle';

-- Index for order lookups
CREATE INDEX idx_partner_sms_order ON partner_sms_conversations(order_id);

-- Conversation states:
-- 'idle' - no active conversation
-- 'awaiting_pickup_confirm' - sent pickup notification, waiting for confirmation
-- 'awaiting_pickup_notification' - partner confirmed pickup, waiting for "picked up" message
-- 'awaiting_weight' - partner picked up, waiting for weight input
-- 'awaiting_quote_approval' - sent quote, waiting for OK
-- 'awaiting_delivery_confirm' - sent delivery slot, waiting for confirmation
-- 'awaiting_delivery_suggestion' - partner wants different time, waiting for their suggestion

COMMENT ON TABLE partner_sms_conversations IS 'Tracks SMS conversation state for partner agent interactions';
COMMENT ON COLUMN partner_sms_conversations.state IS 'Current conversation state machine position';
COMMENT ON COLUMN partner_sms_conversations.context IS 'JSON context including service_type, last_intent, etc';
