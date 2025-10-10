# Partner SMS Agent Implementation

## Overview

A conversational SMS agent that enables partners to manage orders via text message, handling the full pickup → quote → delivery workflow without needing to log into the partner portal.

## Architecture

### Simple "Vibe Coding" Approach
- **Pattern Matching First**: Fast regex-based intent parsing for common cases
- **Claude Fallback**: Uses Claude Haiku for ambiguous messages (~$0.0001 per SMS)
- **Stateful Conversations**: Database tracks conversation context
- **Thin Wrapper**: Agents call existing APIs, no duplicate logic

## Implementation Status

### ✅ Completed

1. **Database Schema** (`supabase/migrations/031_partner_sms_conversations.sql`)
   - Tracks SMS conversation state per phone number
   - States: idle, awaiting_pickup_confirm, awaiting_weight, awaiting_quote_approval, etc.
   - Stores context (service_type, order info, etc.)

2. **Conversation State Management** (`lib/partner-sms/conversation-state.ts`)
   - Functions to get/create/update conversations
   - State machine helpers
   - Order-based conversation lookup

3. **Intent Parser** (`lib/partner-sms/intent-parser.ts`)
   - Pattern matching for common inputs (YES, OK, numbers, etc.)
   - Claude Haiku integration for complex cases
   - Context-aware parsing based on conversation state

### 🚧 In Progress

4. **Installing Anthropic SDK**
   - Running `npm install @anthropic-ai/sdk`
   - Required for Claude integration

### 📋 Remaining Work

5. **Action Executor** (`lib/partner-sms/action-executor.ts`)
   - Maps intents to API calls
   - Executes partner actions (update status, submit quote, etc.)

6. **Twilio Webhook** (`app/api/webhooks/partner-sms/route.ts`)
   - Receives incoming SMS from partners
   - Orchestrates: parse → execute → respond
   - Handles Twilio webhook format

7. **SMS Response Templates** (`lib/partner-sms/response-templates.ts`)
   - Pre-built message templates
   - Friendly, conversational tone

8. **Triggers** (Various locations)
   - New order → Send pickup notification
   - Quote approved → Send delivery confirmation request
   - Status changes → Notify partner

## Conversation Flow Example

```
[NEW ORDER]
Agent → Partner: "🧺 New laundry order #7A3B for pickup today 2-4pm
                  📍 123 Lenox Ave, 10027
                  Reply: CONFIRM or RESCHEDULE"

Partner: "CONFIRM"

Agent: "✅ Great! Pickup confirmed for 2-4pm. Text when picked up."

[AFTER PICKUP]
Partner: "PICKED UP 7A3B"

Agent: "📊 What's the actual weight? (Reply with number, e.g. '18')"

Partner: "18"

Agent: "💰 Quote: $31.50 for 18 lbs
        Reply OK to submit for approval"

Partner: "OK"

Agent: "✅ Quote submitted! Admin will approve & charge customer.
        I'll text when ready for delivery."
```

## Technical Details

### Pattern Matching (Fast Path)
- YES/OK/CONFIRM → Contextual confirmation
- Numbers → Weight when awaiting_weight
- "PICKED UP" → Pickup notification
- "RESCHEDULE" → Reschedule request

### Claude Fallback (Smart Path)
- Activated when pattern matching fails
- Model: `claude-3-haiku-20240307`
- Cost: ~$0.25 per 1M tokens
- Returns structured JSON with intent + confidence

### Database Table

```sql
CREATE TABLE partner_sms_conversations (
  id UUID PRIMARY KEY,
  partner_id UUID REFERENCES partners(id),
  order_id UUID REFERENCES orders(id),
  phone TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'idle',
  context JSONB DEFAULT '{}',
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

## Environment Variables Needed

```env
# Add to .env.local
ANTHROPIC_API_KEY=sk-ant-... # Get from https://console.anthropic.com
```

## Next Steps

1. ✅ Install Anthropic SDK
2. Build action executor
3. Create Twilio webhook endpoint
4. Build response templates
5. Add order triggers
6. Test with real partner phone numbers
7. Deploy and monitor

## Safety Rails

- **Confirmation Required**: Quote submissions need explicit "OK"
- **Fallback to Portal**: Complex requests redirect to web
- **Human Override**: Admins can take over conversations
- **Timeout Reminders**: If no reply in 2 hours, send reminder
- **State Reset**: Conversations auto-expire after 24 hours idle

## Cost Estimate

- Pattern Matching: $0 (regex)
- Claude Fallback: ~$0.0001 per ambiguous message
- **Total**: For 1000 partner SMS/month ≈ **$0.10/month**

## Files Created

1. `supabase/migrations/031_partner_sms_conversations.sql`
2. `lib/partner-sms/conversation-state.ts`
3. `lib/partner-sms/intent-parser.ts`

## Files to Create

4. `lib/partner-sms/action-executor.ts`
5. `lib/partner-sms/response-templates.ts`
6. `app/api/webhooks/partner-sms/route.ts`
7. Triggers in existing order creation/update files

---

**Status**: Foundation complete, waiting for npm install to finish before continuing with webhook and executor implementation.
