import Anthropic from '@anthropic-ai/sdk';
import { Conversation } from './conversation-state';

export interface ParsedIntent {
  type: 
    | 'confirm'
    | 'reschedule'
    | 'picked_up'
    | 'weight'
    | 'delivered'
    | 'help'
    | 'cancel'
    | 'unknown';
  value?: string | number;
  confidence: 'high' | 'medium' | 'low';
  data?: { weight?: number; time?: string };
}

/**
 * Try to parse intent using simple pattern matching first
 * This is fast and works for common cases
 */
function quickParseIntent(
  message: string,
  conversationState: string
): ParsedIntent | null {
  const msg = message.trim().toLowerCase();
  
  // Simple confirmations
  if (msg === 'confirm' || msg === 'yes' || msg === 'y' || msg === 'ok' || msg === 'okay') {
    return { type: 'confirm', confidence: 'high' };
  }
  
  // Cancel
  if (msg === 'cancel' || msg.includes('cancel')) {
    return { type: 'cancel', confidence: 'high' };
  }
  
  // Help
  if (msg === 'help' || msg === '?') {
    return { type: 'help', confidence: 'high' };
  }
  
  // Rescheduling
  if (msg.includes('reschedule') || msg.includes('later') || msg.includes('cant') || msg.includes('can\'t') || msg.includes('can\'t make it')) {
    return { type: 'reschedule', confidence: 'high' };
  }
  
  // Picked up notification
  if (msg.includes('picked up') || msg.includes('picked') || msg.includes('got it') || msg.includes('have it')) {
    return { type: 'picked_up', confidence: 'high' };
  }
  
  // Delivered
  if (msg.includes('delivered') || msg.includes('dropped off') || msg.includes('delivery complete')) {
    return { type: 'delivered', confidence: 'high' };
  }
  
  // Weight input - just a number or number with units
  const numMatch = msg.match(/^\s*(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?|kg|kilograms?)?\s*$/i);
  if (numMatch) {
    const weight = parseFloat(numMatch[1]);
    return {
      type: 'weight',
      value: weight,
      data: { weight },
      confidence: 'high'
    };
  }
  
  // Try to extract number from message like "18 lbs" or "weight is 18"
  const numInText = msg.match(/\b(\d+(?:\.\d+)?)\s*(?:lbs?|pounds?)?/i);
  if (numInText) {
    const weight = parseFloat(numInText[1]);
    return {
      type: 'weight',
      value: weight,
      data: { weight },
      confidence: 'medium'
    };
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
    console.warn('ANTHROPIC_API_KEY not configured, defaulting to unknown intent');
    return { type: 'unknown', confidence: 'low' };
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
  "type": "confirm" | "reschedule" | "picked_up" | "weight" | "delivered" | "help" | "cancel" | "unknown",
  "value": "string or number (optional - the weight number, suggested time, etc)",
  "data": {"weight": number} (optional - for weight intents),
  "confidence": "high" | "medium" | "low"
}

Examples:
- "yes" → {"type": "confirm", "confidence": "high"}
- "can't do today" → {"type": "reschedule", "confidence": "high"}
- "18" → {"type": "weight", "value": 18, "data": {"weight": 18}, "confidence": "high"}
- "weight is 22 pounds" → {"type": "weight", "value": 22, "data": {"weight": 22}, "confidence": "high"}
- "picked up" → {"type": "picked_up", "confidence": "high"}
- "delivered" → {"type": "delivered", "confidence": "high"}
- "help" → {"type": "help", "confidence": "high"}
- "cancel" → {"type": "cancel", "confidence": "high"}`;

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
    return { type: 'unknown', confidence: 'low' };
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
