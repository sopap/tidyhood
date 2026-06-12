import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { parseIntent } from '@/lib/partner-sms/intent-parser';
import { executeAction } from '@/lib/partner-sms/action-executor';
import { getOrCreateConversation } from '@/lib/partner-sms/conversation-state';
import { sendSMS } from '@/lib/sms';
import { responses } from '@/lib/partner-sms/response-templates';

/**
 * Reconstruct the exact public URL Twilio signed against.
 * Behind Vercel's proxy, request.url may show internal host/proto, so prefer
 * forwarded headers. Override with TWILIO_WEBHOOK_URL if needed.
 */
function getWebhookUrl(request: NextRequest): string {
  if (process.env.TWILIO_WEBHOOK_URL) return process.env.TWILIO_WEBHOOK_URL;
  const proto = request.headers.get('x-forwarded-proto') ?? 'https';
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  return `${proto}://${host}${request.nextUrl.pathname}`;
}

/**
 * Twilio SMS Webhook
 * Receives incoming SMS from partners and orchestrates response
 *
 * Twilio sends:
 * - From: Partner's phone number
 * - Body: SMS message text
 * - (other fields we ignore)
 *
 * Security: every request is verified against X-Twilio-Signature.
 * Fails closed (403) if the signature is missing/invalid or
 * TWILIO_AUTH_TOKEN is not configured.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook payload
    const formData = await request.formData();

    // --- Signature validation (fail closed) ---
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) {
      console.error('Partner SMS webhook: TWILIO_AUTH_TOKEN not configured — rejecting request');
      return new NextResponse('Forbidden', { status: 403 });
    }

    const signature = request.headers.get('x-twilio-signature');
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === 'string') params[key] = value;
    });

    const isValid =
      !!signature &&
      twilio.validateRequest(authToken, signature, getWebhookUrl(request), params);

    if (!isValid) {
      console.error('Partner SMS webhook: invalid Twilio signature — rejecting request');
      return new NextResponse('Forbidden', { status: 403 });
    }
    // --- End signature validation ---

    const from = formData.get('From') as string; // Partner phone number
    const body = formData.get('Body') as string; // SMS text

    if (!from || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get or create conversation for this partner phone
    const conversation = await getOrCreateConversation(from);
    
    if (!conversation) {
      await sendSMS({ to: from, message: responses.error() });
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Parse intent based on message and conversation state
    const intent = await parseIntent(body, conversation);
    
    // Execute the action
    const responseMessage = await executeAction(intent, conversation, from);
    
    // Send response via SMS
    await sendSMS({ to: from, message: responseMessage });
    
    // Return empty TwiML (we already sent SMS via API)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  } catch (error) {
    console.error('Partner SMS webhook error:', error);
    
    // Try to send error message
    try {
      const formData = await request.formData();
      const from = formData.get('From') as string;
      if (from) {
        await sendSMS({ to: from, message: responses.error() });
      }
    } catch (smsError) {
      console.error('Failed to send error SMS:', smsError);
    }
    
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}
