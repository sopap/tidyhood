import twilio from 'twilio'

const isDev = process.env.NODE_ENV === 'development'

// Lazy-initialize Twilio client (only when needed at runtime)
let twilioClient: ReturnType<typeof twilio> | null = null

function getTwilioClient() {
  if (isDev) {
    return null
  }
  
  if (!twilioClient) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    
    if (!accountSid || !authToken) {
      console.warn('Twilio credentials not configured')
      return null
    }
    
    twilioClient = twilio(accountSid, authToken)
  }
  
  return twilioClient
}

const FROM_PHONE = process.env.TWILIO_FROM_PHONE

export interface SendSMSParams {
  to: string
  message: string
}

/**
 * Normalize phone number to E.164 format
 * Adds '+' prefix if missing for valid US numbers
 */
function normalizePhoneNumber(phone: string): string {
  if (!phone) {
    throw new Error(`Invalid phone number: empty or null`)
  }
  
  // Already has '+' prefix
  if (phone.startsWith('+')) {
    return phone
  }
  
  // US number without '+' (11 digits starting with 1)
  if (/^1\d{10}$/.test(phone)) {
    return `+${phone}`
  }
  
  // 10-digit US number (add +1 prefix)
  if (/^\d{10}$/.test(phone)) {
    return `+1${phone}`
  }
  
  throw new Error(`Invalid phone number format: ${phone}`)
}

/**
 * Send SMS notification
 * In development, logs to console
 * In production, sends via Twilio
 */
export async function sendSMS(params: SendSMSParams): Promise<void> {
  const { to, message } = params
  
  // Normalize phone number
  let normalizedPhone: string
  try {
    normalizedPhone = normalizePhoneNumber(to)
  } catch (error) {
    console.error('Invalid phone number format:', to, error)
    throw error
  }
  
  if (isDev) {
    console.log('📱 [SMS] TO:', normalizedPhone)
    console.log('📱 [SMS] MESSAGE:', message)
    return
  }
  
  const client = getTwilioClient()
  
  if (!client || !FROM_PHONE) {
    console.error('Twilio not configured')
    return
  }
  
  try {
    await client.messages.create({
      body: message,
      to: normalizedPhone,
      from: FROM_PHONE,
    })
  } catch (error) {
    console.error('Failed to send SMS:', error)
    throw error
  }
}

/**
 * Send order created notification
 */
export async function sendOrderCreatedSMS(
  phone: string,
  orderId: string,
  serviceType: 'LAUNDRY' | 'CLEANING',
  slotStart: string
): Promise<void> {
  const shortId = orderId.slice(-8).toUpperCase()
  const date = new Date(slotStart).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const time = new Date(slotStart).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  const service = serviceType === 'LAUNDRY' ? 'laundry' : 'cleaning'
  
  await sendSMS({
    to: phone,
    message: `Tidyhood: Your ${service} order #${shortId} is confirmed for ${date} at ${time}. We'll text you updates!`,
  })
}

/**
 * Send status change notification
 */
export async function sendStatusChangeSMS(
  phone: string,
  orderId: string,
  status: string
): Promise<void> {
  const shortId = orderId.slice(-8).toUpperCase()
  
  const messages: Record<string, string> = {
    RECEIVED: `Your order #${shortId} has been received by our partner. We're working on it!`,
    READY: `Your order #${shortId} is ready! We'll deliver it soon.`,
    OUT_FOR_DELIVERY: `Your order #${shortId} is out for delivery! ETA: 30-60 minutes.`,
    DELIVERED: `Your order #${shortId} has been delivered. Thanks for using Tidyhood!`,
    CANCELED: `Your order #${shortId} has been canceled. Contact us if you have questions.`,
  }
  
  const message = messages[status] || `Your order #${shortId} status: ${status}`
  
  await sendSMS({
    to: phone,
    message: `Tidyhood: ${message}`,
  })
}

/**
 * Send late delivery notification
 */
export async function sendLateNotificationSMS(
  phone: string,
  orderId: string,
  lateMinutes: number
): Promise<void> {
  const shortId = orderId.slice(-8).toUpperCase()
  
  await sendSMS({
    to: phone,
    message: `Tidyhood: Sorry, order #${shortId} is running ${lateMinutes} min late. We'll make it right with a credit!`,
  })
}

/**
 * Send credit issued notification
 */
export async function sendCreditIssuedSMS(
  phone: string,
  orderId: string,
  creditCents: number
): Promise<void> {
  const shortId = orderId.slice(-8).toUpperCase()
  const amount = `$${(creditCents / 100).toFixed(2)}`
  
  await sendSMS({
    to: phone,
    message: `Tidyhood: We've issued a ${amount} credit to your account for order #${shortId}. Thanks for your patience!`,
  })
}
