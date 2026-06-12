import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';
import { handleApiError, ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { canUsePaymentAuthorization } from '@/lib/feature-flags';
import { executePaymentAuthorizationSaga } from '@/lib/payment-saga';
import { logPaymentError, createErrorResponse } from '@/lib/payment-errors';
import { quoteLaundry } from '@/lib/pricing';

/**
 * Max authorization for dry-clean-only orders (quoted after inspection,
 * so there is no server-computable price at booking time).
 */
const MAX_DRY_CLEAN_AUTH_CENTS = parseInt(
  process.env.MAX_DRY_CLEAN_AUTH_CENTS || '30000',
  10
);

const TIER_TO_LBS: Record<string, number> = { small: 15, medium: 25, large: 35 };

const authorizeSchema = z.object({
  estimated_amount_cents: z.number().int().positive(),
  service_category: z.enum(['wash_fold', 'dry_clean', 'mixed']),
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
  details: z.object({
    serviceType: z.enum(['washFold', 'dryClean', 'mixed']).optional(),
    weightTier: z.enum(['small', 'medium', 'large']).optional(),
    lbs: z.number().optional(),
    addons: z.array(z.string()).optional(),
  }),
});

/**
 * POST /api/payment/authorize
 * 
 * Authorize payment for a laundry booking using the saga pattern.
 * This ensures atomic execution across Stripe and database operations.
 * 
 * Request body:
 * - estimated_amount_cents: Estimated cost
 * - service_category: wash_fold | dry_clean | mixed
 * - payment_method_id: Stripe payment method ID
 * - slot: Pickup slot details
 * - delivery_slot: Optional delivery slot
 * - address: Service address
 * - phone: Contact phone
 * - details: Service details
 * 
 * Response:
 * - order_id: Created order ID
 * - requires_action: True if 3DS challenge needed
 * - client_secret: For 3DS challenge (if requires_action)
 * - payment_intent_id: Stripe PaymentIntent ID
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    // Check feature flag
    if (!canUsePaymentAuthorization(user.id)) {
      throw new ValidationError(
        'Payment authorization not available for your account',
        'FEATURE_NOT_ENABLED'
      );
    }
    
    // Parse and validate request
    const body = await request.json();
    const params = authorizeSchema.parse(body);
    
    logger.info({
      event: 'payment_authorization_request',
      user_id: user.id,
      service_category: params.service_category,
      estimated_amount: params.estimated_amount_cents
    });

    // SECURITY: Never trust the client-supplied amount.
    // - wash_fold / mixed: recompute the estimate server-side from weight + addons.
    // - dry_clean: priced after inspection, so cap the authorization at a sanity bound.
    let authorizedAmountCents: number;
    if (params.service_category === 'wash_fold' || params.service_category === 'mixed') {
      const lbs =
        params.details.lbs ??
        (params.details.weightTier ? TIER_TO_LBS[params.details.weightTier] : undefined);
      if (!lbs || lbs <= 0) {
        throw new ValidationError('Weight tier or lbs required for wash & fold orders');
      }
      const quote = await quoteLaundry({
        zip: params.address.zip,
        lbs,
        addons: params.details.addons,
      });
      authorizedAmountCents = quote.total_cents;

      if (Math.abs(authorizedAmountCents - params.estimated_amount_cents) > 100) {
        logger.warn({
          event: 'payment_authorization_estimate_mismatch',
          user_id: user.id,
          client_estimate_cents: params.estimated_amount_cents,
          server_quote_cents: authorizedAmountCents,
        });
      }
    } else {
      // dry_clean
      if (params.estimated_amount_cents > MAX_DRY_CLEAN_AUTH_CENTS) {
        throw new ValidationError(
          'Estimated amount exceeds the maximum allowed for dry cleaning orders',
          'AMOUNT_EXCEEDS_CAP'
        );
      }
      authorizedAmountCents = params.estimated_amount_cents;
    }

    // Convert snake_case to camelCase for database
    const serviceCategoryMap: Record<string, 'washFold' | 'dryClean' | 'mixed'> = {
      'wash_fold': 'washFold',
      'dry_clean': 'dryClean',
      'mixed': 'mixed',
    };
    
    // Execute payment authorization saga
    const order = await executePaymentAuthorizationSaga({
      user_id: user.id,
      service_type: 'LAUNDRY',
      service_category: serviceCategoryMap[params.service_category],
      estimated_amount_cents: authorizedAmountCents,
      payment_method_id: params.payment_method_id,
      slot: params.slot,
      delivery_slot: params.delivery_slot,
      address: params.address,
      phone: params.phone,
      details: params.details,
    });
    
    // Check if 3D Secure is required
    // (This would be set by the saga if PaymentIntent requires_action)
    const requires3DS = order.payment_status === 'requires_action';
    
    logger.info({
      event: 'payment_authorization_success',
      user_id: user.id,
      order_id: order.id,
      requires_action: requires3DS,
      authorized_amount: order.authorized_amount_cents
    });
    
    return NextResponse.json({
      success: true,
      order_id: order.id,
      requires_action: requires3DS,
      client_secret: requires3DS ? order.payment_client_secret : undefined,
      payment_intent_id: order.auth_payment_intent_id,
      authorized_amount: order.authorized_amount_cents
    }, { status: 201 });
    
  } catch (error) {
    logger.error({
      event: 'payment_authorization_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Special handling for payment errors
    if (error instanceof Error && error.message.includes('payment')) {
      const classified = await logPaymentError(
        error,
        'unknown',
        'authorization'
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
