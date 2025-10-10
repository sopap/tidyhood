import Anthropic from '@anthropic-ai/sdk';
import { Conversation } from './conversation-state';

export interface ParsedIntent {
  type: 
    | 'CONFIRM_PICKUP'
    | 'RESCHEDULE'
    | 'PICKED_UP'
    | 'WEIGHT'
    | 'CONFIRM_QUOTE'
    | 'CONFIRM_DELIVERY'
    | 'SUGGEST_TIME'
    | 'UNKNOWN';
  value?: string | number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Try to parse intent using simple pattern matching first
 * This is fast and works for common cases
 */
function quickParseIntent(
  message: string,
  conversationState: string
): ParsedIntent | null {
  const msg = message.trim().toUpperCase();
  
  // Simple confirmations
  if (msg === 'CONFIRM' || msg === 'YES' || msg === 'Y' || msg === 'OK' || msg === 'OKAY') {
    // Context matters - what are they confirming?
    switch (conversationState) {
      case 'awaiting_pickup_confirm':
        return { type: 'CONFIRM_PICKUP', confidence: 'high' };
      case 'awaiting_quote_approval':
        return { type: 'CONFIRM_QUOTE', confidence: 'high' };
      case 'awaiting_delivery_confirm':
        return { type: 'CONFIRM_DELIVERY', confidence: 'high' };
      default:
        return null; // Let Claude handle it
    }
  }
  
  // Rescheduling
  if (msg.includes('RESCHEDULE') || msg.includes('LATER') || msg.includes('CANT') || msg.includes('CAN\'T')) {
    return { type: 'RESCHEDULE', confidence: 'high' };
  }
  
  // Picked up notification
  if (msg.includes('PICKED UP') || msg.includes('GOT IT') || msg.includes('PICKED') || msg.includes('HAVE IT')) {
    return { type: 'PICKED_UP', confidence: 'high' };
  }
  
  // Weight input - just a number
  if (conversationState === 'awaiting_weight') {
    const numMatch = msg.match(/^\d+$/);
    if (numMatch) {
      return {
        type: 'WEIGHT',
        value: parseInt(numMatch[0]),
        confidence: 'high'
      };
    }
    
    // Try to extract number from message like "18 lbs" or "weight is 18"
    const numInText = msg.match(/\b(\d+)\b/);
    if (numInText) {
      return {
        type: 'WEIGHT',
        value: parseInt(numInText[1]),
        confidence: 'medium'
      };
    }
  }
  
  // Time suggestion
  if (conversationState === 'awaiting_delivery_suggestion') {
    // Look for time patterns like "2pm", "14:00", "tomorrow at 2"
    if (msg.match(/\d+\s*(AM|PM|:|TOMORROW|TODAY)/)) {
      return {
        type: 'SUGGEST_TIME',
        value: msg,
        confidence: 'medium'
      };
    }
  }
  
  return null; // Couldn't parse, need Claude
}

/**
 * Parse intent using Claude when pattern matching fails
 * Uses Claude Haiku for speed and cost-effectiveness
 */
async function parseWithClaude(
  message: string,
  conversation: Conversation
): Promise<ParsedIntent> {
  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not configured, defaulting to UNKNOWN intent');
    return { type: 'UNKNOWN', confidence: 'low' };
  }
  
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt = `You are parsing partner SMS messages for a laundry/cleaning service.

Current conversation state: ${conversation.state}
Order ID: ${conversation.context?.order_short_id || 'N/A'}
Order type: ${conversation.context?.service_type || 'N/A'}

Partner's message: "${message}"

Determine the intent. Respond ONLY with valid JSON:
{
  "type": "CONFIRM_PICKUP" | "RESCHEDULE" | "PICKED_UP" | "WEIGHT" | "CONFIRM_QUOTE" | "CONFIRM_DELIVERY" | "SUGGEST_TIME" | "UNKNOWN",
  "value": "string or number (optional - the weight number, suggested time, etc)",
  "confidence": "high" | "medium" | "low"
}

Examples based on context:
- When awaiting_pickup_confirm:
  * "yes" → {"type": "CONFIRM_PICKUP", "confidence": "high"}
  * "can't do today" → {"type": "RESCHEDULE", "confidence": "high"}

- When awaiting_weight:
  * "18" → {"type": "WEIGHT", "value": 18, "confidence": "high"}
  * "weight is 22 pounds" → {"type": "WEIGHT", "value": 22, "confidence": "high"}

- When awaiting_quote_approval:
  * "ok" → {"type": "CONFIRM_QUOTE", "confidence": "high"}
  * "looks good" → {"type": "CONFIRM_QUOTE", "confidence": "high"}

- When awaiting_delivery_confirm:
  * "yes" → {"type": "CONFIRM_DELIVERY", "confidence": "high"}
  * "no, tomorrow better" → {"type": "SUGGEST_TIME", "value": "tomorrow", "confidence": "medium"}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: systemPrompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const parsed = JSON.parse(content.text);
    return parsed as ParsedIntent;
  } catch (error) {
    console.error('Error parsing with Claude:', error);
    return { type: 'UNKNOWN', confidence: 'low' };
  }
}

/**
 * Main intent parser - tries pattern matching first, falls back to Claude
 */
export async function parsePartnerIntent(
  message: string,
  conversation: Conversation
): Promise<ParsedIntent> {
  // Try quick pattern matching first
  const quickResult = quickParseIntent(message, conversation.state);
  
  if (quickResult) {
    console.log('Intent parsed with pattern matching:', quickResult);
    return quickResult;
  }
  
  // Fall back to Claude for ambiguous cases
  console.log('Falling back to Claude for intent parsing');
  const claudeResult = await parseWithClaude(message, conversation);
  console.log('Intent parsed with Claude:', claudeResult);
  
  return claudeResult;
}

// Alias for backwards compatibility
export const parseIntent = parsePartnerIntent;
