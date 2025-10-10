import { NextRequest, NextResponse } from 'next/server';
import { parseIntent } from '@/lib/partner-sms/intent-parser';
import { executeAction } from '@/lib/partner-sms/action-executor';
import { getOrCreateConversation } from '@/lib/partner-sms/conversation-state';
import { sendSMS } from '@/lib/sms';
import { responses } from '@/lib/partner-sms/response-templates';

/**
 * Twilio SMS Webhook
 * Receives incoming SMS from partners and orchestrates response
 * 
 * Twilio sends:
 * - From: Partner's phone number
 * - Body: SMS message text
 * - (other fields we ignore)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse Twilio webhook payload
    const formData = await request.formData();
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
      await sendSMS(from, responses.error());
      return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Parse intent based on message and conversation state
    const intent = await parseIntent(body, conversation);
    
    // Execute the action
    const responseMessage = await executeAction(intent, conversation, from);
    
    // Send response via SMS
    await sendSMS(from, responseMessage);
    
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
        await sendSMS(from, responses.error());
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
