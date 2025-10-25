import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { handleApiError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { canUsePaymentAuthorization } from '@/lib/feature-flags';
import { executePaymentAuthorizationSaga } from '@/lib/payment-saga';
import { logPaymentError, createErrorResponse } from '@/lib/payment-errors';

const setupSchema = z.object({
  service_type: z.enum(['LAUNDRY', 'CLEANING']),
  estimated_amount_cents: z.number().int().positive(),
  service_category: z.enum(['washFold', 'dryClean', 'mixed', 'standard']),
  payment_method_id: z.string(),
  slot: z.object({
    partner_id: z.string().uuid(),
    slot_start: z.string(),
    slot_end: z.string(),
  }),
  delivery_slot: z.object({
    slot_start: z.string(),
    slot_end: z.string(),
  }).optional(),
  address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    zip: z.string().length(5),
    notes: z.string().optional(),
  }),
  phone: z.string().optional(),
  details: z.any(), // Allow any details object for flexibility between LAUNDRY and CLEANING
  subscription_id: z.string().uuid().optional(), // For recurring cleaning
  // Guest booking fields
  guest_name: z.string().optional(),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(), // E.164 format
});

/**
 * POST /api/payment/setup
 * 
 * Save payment method for a laundry booking using Setup Intent.
 * This ensures atomic execution across Stripe and database operations.
 * 
 * Flow:
 * 1. Creates SetupIntent to save payment method
 * 2. Validates card with $0.01 charge (instantly refunded)
 * 3. Creates order with saved payment method
 * 4. Customer charged later after weighing
 * 
 * Benefits over authorization:
 * - Customer sees $0.00 (not $39 authorized)
 * - No 7-day expiry
 * - No 10% Stripe limit on final charge
 * - "Book now, pay later" is literally true
 */
export async function POST(request: NextRequest) {
  try {
    // Get user if authenticated (optional for guest bookings)
    const user = await getCurrentUser();
    
    // Parse and validate request
    const body = await request.json();
    const params = setupSchema.parse(body);
    
    // Validate guest booking requirements
    if (!user) {
      if (!params.guest_name || !params.guest_email || !params.guest_phone) {
        throw new ValidationError(
          'Guest bookings require guest_name, guest_email, and guest_phone',
          'GUEST_INFO_REQUIRED'
        );
      }
    }
    
    // Check feature flag (only for authenticated users)
    if (user && !canUsePaymentAuthorization(user.id)) {
      throw new ValidationError(
        'Payment setup not available for your account',
        'FEATURE_NOT_ENABLED'
      );
    }
    
    logger.info({
      event: 'payment_setup_request',
      user_id: user?.id || 'guest',
      is_guest: !user,
      guest_email: params.guest_email,
      service_category: params.service_category,
      estimated_amount: params.estimated_amount_cents
    });
    
    // Execute payment setup saga
    const order = await executePaymentAuthorizationSaga({
      user_id: user?.id,
      service_type: params.service_type,
      service_category: params.service_category,
      estimated_amount_cents: params.estimated_amount_cents,
      payment_method_id: params.payment_method_id,
      slot: params.slot,
      delivery_slot: params.delivery_slot,
      address: params.address,
      phone: params.phone,
      details: params.details,
      guest_name: params.guest_name,
      guest_email: params.guest_email,
      guest_phone: params.guest_phone,
    });
    
    // Check if 3D Secure is required
    const requires3DS = order.setup_status === 'requires_action';
    
    logger.info({
      event: 'payment_setup_success',
      user_id: user?.id || 'guest',
      is_guest: !user,
      order_id: order.id,
      requires_action: requires3DS,
      card_validated: order.card_validated
    });
    
    return NextResponse.json({
      success: true,
      order_id: order.id,
      requires_action: requires3DS,
      client_secret: requires3DS ? order.setup_client_secret : undefined,
      setup_intent_id: order.setup_intent_id,
      payment_method_saved: true,
      card_validated: order.card_validated
    }, { status: 201 });
    
  } catch (error) {
    logger.error({
      event: 'payment_setup_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Special handling for payment errors
    if (error instanceof Error && error.message.includes('payment')) {
      const classified = await logPaymentError(
        error,
        'unknown',
        'setup'
      );
      
      return NextResponse.json(
        createErrorResponse(classified),
        { status: 400 }
      );
    }
    
    // Validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    // Generic error handling
    const apiError = handleApiError(error);
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    );
  }
}
