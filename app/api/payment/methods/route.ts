import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAuth } from '@/lib/auth';
import { getServiceClient } from '@/lib/db';
import { handleApiError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { executeWithQuota } from '@/lib/stripe-quota-manager';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

/**
 * GET /api/payment/methods
 * 
 * Retrieve saved payment methods for the current user
 * Returns list of payment methods from Stripe
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const db = getServiceClient();
    
    // Get user's Stripe customer ID
    const { data: profile } = await db
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.stripe_customer_id) {
      // No Stripe customer yet - return empty list
      return NextResponse.json({ payment_methods: [] });
    }
    
    // Fetch payment methods from Stripe
    const paymentMethods = await executeWithQuota(() =>
      stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: 'card',
      })
    );
    
    // Transform to simpler format
    const methods = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card?.brand || 'card',
      last4: pm.card?.last4 || '0000',
      exp_month: pm.card?.exp_month || 1,
      exp_year: pm.card?.exp_year || 2024,
    }));
    
    logger.info({
      event: 'payment_methods_retrieved',
      user_id: user.id,
      count: methods.length
    });
    
    return NextResponse.json({ payment_methods: methods });
    
  } catch (error) {
    logger.error({
      event: 'payment_methods_error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    const apiError = handleApiError(error);
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    );
  }
}
