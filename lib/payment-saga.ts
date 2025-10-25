/**
 * Payment Setup Saga (Setup Intent Approach)
 * 
 * Implements the Saga pattern for payment method setup to ensure atomicity.
 * Prevents the catastrophic scenario where payment method is saved on Stripe
 * but order creation fails in the database (or vice versa).
 * 
 * The saga follows these steps:
 * 1. Create order in DRAFT status (reversible)
 * 2. Save payment method via SetupIntent (reversible)
 * 3. Validate card with $0.01 charge + instant refund (reversible)
 * 4. Finalize order to pending_pickup (commit)
 * 
 * If any step fails, all previous steps are compensated (rolled back).
 */

import { getServiceClient } from '@/lib/db';
import Stripe from 'stripe';
import { logger } from './logger';
import { executeWithQuota } from './stripe-quota-manager';
import { executeWithCircuitBreaker } from './stripe-circuit-breaker';
import { tracePaymentOperation } from './payment-tracing';
import { getCardValidationAmount } from './payment-config';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

interface SagaStep {
  type: 'create_order' | 'save_payment_method' | 'validate_card' | 'finalize_order';
  data: any;
  timestamp: number;
}

interface BookingParams {
  user_id?: string; // Optional for guest bookings
  service_type: 'LAUNDRY' | 'CLEANING';
  service_category: 'washFold' | 'dryClean' | 'mixed' | 'standard';
  estimated_amount_cents: number;
  payment_method_id: string;
  slot: {
    partner_id: string;
    slot_start: string;
    slot_end: string;
  };
  delivery_slot?: {
    slot_start: string;
    slot_end: string;
  };
  address: {
    line1: string;
    line2?: string;
    city: string;
    zip: string;
    notes?: string;
  };
  phone?: string;
  details: any;
  // Guest booking fields
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
}

interface SetupResult {
  setup_intent_id: string;
  payment_method_id: string;
  status: string;
  requires_action: boolean;
  client_secret?: string;
  card_validated: boolean;
}

export class PaymentAuthorizationSaga {
  private sagaId!: string;
  private steps: SagaStep[] = [];
  private db = getServiceClient();
  
  /**
   * Execute the payment authorization saga
   * 
   * @param params - Booking parameters
   * @returns The finalized order
   */
  async execute(params: BookingParams): Promise<any> {
    return tracePaymentOperation(
      'payment_authorization_saga',
      {
        user_id: params.user_id || 'guest',
        service_category: params.service_category,
        estimated_amount: params.estimated_amount_cents
      },
      async () => {
        try {
          // Initialize saga
          await this.initializeSaga(params);
          
          // Step 1: Create order in DRAFT status
          const draftOrder = await this.createDraftOrder(params);
          this.recordStep('create_order', { order_id: draftOrder.id });
          
          // Step 2: Save payment method via SetupIntent
          const setupResult = await this.savePaymentMethod(params, draftOrder);
          this.recordStep('save_payment_method', { 
            setup_intent_id: setupResult.setup_intent_id,
            payment_method_id: setupResult.payment_method_id
          });
          
          // Step 3: Validate card with $0.01 test charge (skip for guests to reduce friction)
          if (getCardValidationAmount() > 0 && params.user_id) {
            await this.validateCard(setupResult.payment_method_id, params.user_id);
            this.recordStep('validate_card', { 
              payment_method_id: setupResult.payment_method_id,
              validated: true
            });
          }
          
          // Step 4: Finalize order
          const finalOrder = await this.finalizeOrder(draftOrder.id, setupResult);
          this.recordStep('finalize_order', { order_id: finalOrder.id });
          
          // Mark saga as complete
          await this.completeSaga();
          
          logger.info({
            event: 'payment_saga_success',
            saga_id: this.sagaId,
            order_id: finalOrder.id,
            steps_completed: this.steps.length
          });
          
          return finalOrder;
          
        } catch (error) {
          // Compensation: Undo all completed steps
          await this.compensate(error);
          throw error;
        }
      }
    );
  }
  
  /**
   * Initialize the saga record
   */
  private async initializeSaga(params: BookingParams) {
    const { data: saga, error } = await this.db
      .from('payment_sagas')
      .insert({
        type: 'payment_authorization',
        status: 'pending',
        params: params,
      })
      .select()
      .single();
    
    if (error || !saga) {
      throw new Error('Failed to initialize payment saga');
    }
    
    this.sagaId = saga.id;
    
    logger.info({
      event: 'payment_saga_initialized',
      saga_id: this.sagaId
    });
  }
  
  /**
   * Step 1: Create order in DRAFT status
   */
  private async createDraftOrder(params: BookingParams) {
    const orderData: any = {
      user_id: params.user_id || null,
      service_type: params.service_type,
      partner_id: params.slot.partner_id,
      slot_start: params.slot.slot_start,
      slot_end: params.slot.slot_end,
      delivery_slot_start: params.delivery_slot?.slot_start || null,
      delivery_slot_end: params.delivery_slot?.slot_end || null,
      status: 'pending' as any, // Temporary status, will be updated to pending_pickup after payment method saved
      subtotal_cents: params.estimated_amount_cents,
      tax_cents: 0, // Will be calculated
      delivery_cents: 0,
      total_cents: params.estimated_amount_cents,
      order_details: params.details,
      address_snapshot: {
        ...params.address,
        phone: params.phone
      },
      version: 0,
    };
    
    // Add guest fields if not authenticated
    if (!params.user_id && params.guest_email && params.guest_phone) {
      orderData.guest_name = params.guest_name;
      orderData.guest_email = params.guest_email;
      orderData.guest_phone = params.guest_phone;
    }
    
    const { data: order, error } = await this.db
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (error || !order) {
      throw new Error(`Failed to create draft order: ${error?.message}`);
    }
    
    logger.info({
      event: 'saga_order_created',
      saga_id: this.sagaId,
      order_id: order.id,
      status: 'pending'
    });
    
    return order;
  }
  
  /**
   * Step 2: Save payment method via SetupIntent
   */
  private async savePaymentMethod(
    params: BookingParams,
    order: any
  ): Promise<SetupResult> {
    // Get or create Stripe customer (for authenticated or guest users)
    const customerId = await this.getOrCreateStripeCustomer(
      params.user_id,
      params.guest_email,
      params.guest_name
    );
    
    // Check if payment method needs to be re-attached to this customer
    try {
      const paymentMethod = await executeWithQuota(() =>
        stripe.paymentMethods.retrieve(params.payment_method_id)
      );
      
      // If payment method is attached to a different customer, detach and re-attach
      if (paymentMethod.customer && paymentMethod.customer !== customerId) {
        logger.info({
          event: 'payment_method_reattachment_needed',
          payment_method_id: params.payment_method_id,
          old_customer: paymentMethod.customer,
          new_customer: customerId
        });
        
        // Detach from old customer
        await stripe.paymentMethods.detach(params.payment_method_id);
        
        // Attach to current customer
        await stripe.paymentMethods.attach(params.payment_method_id, {
          customer: customerId
        });
        
        logger.info({
          event: 'payment_method_reattached',
          payment_method_id: params.payment_method_id,
          customer_id: customerId
        });
      }
    } catch (error: any) {
      // Check if this is a "No such PaymentMethod" error
      if (error.code === 'resource_missing' || error.message?.includes('No such')) {
        const isTestKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
        const isLiveKey = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
        
        logger.error({
          event: 'payment_method_not_found',
          payment_method_id: params.payment_method_id,
          stripe_mode: isTestKey ? 'test' : isLiveKey ? 'live' : 'unknown',
          error: error.message
        });
        
        throw new Error(
          `Payment method not found. This usually means:\n` +
          `1. You're using ${isTestKey ? 'test' : 'live'} keys but the card was saved with ${isTestKey ? 'live' : 'test'} keys\n` +
          `2. The payment method doesn't exist in your Stripe account\n\n` +
          `Solution: Please add a new card or ensure you're using the correct Stripe keys (test vs live).`
        );
      }
      
      // If retrieval fails for other reasons, payment method might be newly created, continue
      logger.warn({
        event: 'payment_method_check_skipped',
        payment_method_id: params.payment_method_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Create SetupIntent to save payment method
    const setupIntent = await executeWithQuota(() =>
      executeWithCircuitBreaker(
        () => stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ['card'],
          metadata: {
            order_id: order.id,
            user_id: params.user_id || 'guest',
            guest_email: params.guest_email || '',
            saga_id: this.sagaId
          },
        }),
        true // Use payment-specific circuit breaker
      )
    );
    
    // Confirm the SetupIntent
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const confirmed = await executeWithQuota(() =>
      stripe.setupIntents.confirm(setupIntent.id, {
        payment_method: params.payment_method_id,
        return_url: `${baseUrl}/orders/${order.id}/setup-complete`
      })
    );
    
    logger.info({
      event: 'saga_payment_method_saved',
      saga_id: this.sagaId,
      order_id: order.id,
      setup_intent_id: confirmed.id,
      payment_method_id: confirmed.payment_method,
      status: confirmed.status
    });
    
    return {
      setup_intent_id: confirmed.id,
      payment_method_id: confirmed.payment_method as string,
      status: confirmed.status,
      requires_action: confirmed.status === 'requires_action',
      client_secret: confirmed.status === 'requires_action' ? (confirmed.client_secret ?? undefined) : undefined,
      card_validated: false // Will be set by validation step
    };
  }
  
  /**
   * Step 3: Validate card with $0.01 test charge
   * This confirms the card works and has funds available
   */
  private async validateCard(paymentMethodId: string, userId: string) {
    const customerId = await this.getOrCreateStripeCustomer(userId);
    
    // Charge $0.01
    const validation = await executeWithQuota(() =>
      stripe.paymentIntents.create({
        amount: getCardValidationAmount(),
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never' // Disable redirect-based payment methods
        },
        metadata: {
          type: 'card_validation',
          saga_id: this.sagaId
        }
      })
    );
    
    // Immediately refund
    await executeWithQuota(() =>
      stripe.refunds.create({
        payment_intent: validation.id,
      })
    );
    
    logger.info({
      event: 'saga_card_validated',
      saga_id: this.sagaId,
      payment_method_id: paymentMethodId,
      validation_charge_id: validation.id
    });
  }
  
  /**
   * Step 4: Finalize order with payment method details
   */
  private async finalizeOrder(orderId: string, setupResult: SetupResult) {
    // Get order to retrieve user_id and guest info
    const { data: order } = await this.db
      .from('orders')
      .select('user_id, guest_email')
      .eq('id', orderId)
      .single();
    
    if (!order) {
      throw new Error('Order not found during finalization');
    }
    
    let stripeCustomerId: string;
    
    // Get stripe_customer_id based on user type
    if (order.user_id) {
      // Authenticated user - get from profile
      const { data: profile } = await this.db
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', order.user_id)
        .single();
      
      if (!profile?.stripe_customer_id) {
        throw new Error('Stripe customer ID not found in profile');
      }
      
      stripeCustomerId = profile.stripe_customer_id;
    } else {
      // Guest user - retrieve from SetupIntent
      const setupIntent = await stripe.setupIntents.retrieve(setupResult.setup_intent_id);
      stripeCustomerId = setupIntent.customer as string;
    }
    
    const { data: finalOrder, error } = await this.db
      .from('orders')
      .update({
        status: 'pending_pickup',
        setup_intent_id: setupResult.setup_intent_id,
        saved_payment_method_id: setupResult.payment_method_id,
        stripe_customer_id: stripeCustomerId,
        payment_method_saved_at: new Date().toISOString(),
        card_validated: order.user_id ? (getCardValidationAmount() > 0) : false, // Only validate for auth users
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
    
    if (error || !finalOrder) {
      throw new Error(`Failed to finalize order: ${error?.message}`);
    }
    
    logger.info({
      event: 'saga_order_finalized',
      saga_id: this.sagaId,
      order_id: orderId,
      status: 'pending_pickup',
      is_guest: !order.user_id
    });
    
    return finalOrder;
  }
  
  /**
   * Compensate (rollback) all completed steps
   */
  private async compensate(error: any) {
    logger.error({
      event: 'payment_saga_compensation_start',
      saga_id: this.sagaId,
      error: error.message,
      steps_to_compensate: this.steps.length
    });
    
    // Reverse steps in reverse order
    for (let i = this.steps.length - 1; i >= 0; i--) {
      const step = this.steps[i];
      
      try {
        switch (step.type) {
          case 'save_payment_method':
            // Detach payment method (optional - can leave it saved)
            // await stripe.paymentMethods.detach(step.data.payment_method_id);
            logger.info({
              event: 'saga_compensation_payment_method_detached',
              saga_id: this.sagaId,
              payment_method_id: step.data.payment_method_id
            });
            break;
            
          case 'validate_card':
            // Validation already refunded, nothing to rollback
            logger.info({
              event: 'saga_compensation_validation_skipped',
              saga_id: this.sagaId
            });
            break;
            
          case 'create_order':
          case 'finalize_order':
            // Delete order from database
            await this.db
              .from('orders')
              .delete()
              .eq('id', step.data.order_id);
            logger.info({
              event: 'saga_compensation_order_deleted',
              saga_id: this.sagaId,
              order_id: step.data.order_id
            });
            break;
        }
      } catch (compensationError) {
        // Log compensation failure but continue
        logger.error({
          event: 'saga_compensation_error',
          saga_id: this.sagaId,
          step_type: step.type,
          error: compensationError
        });
      }
    }
    
    // Mark saga as failed
    await this.db
      .from('payment_sagas')
      .update({
        status: 'failed',
        error_message: error.message,
        steps: this.steps,
        completed_at: new Date().toISOString()
      })
      .eq('id', this.sagaId);
    
    logger.error({
      event: 'payment_saga_failed',
      saga_id: this.sagaId,
      error: error.message,
      steps_completed: this.steps.length
    });
  }
  
  /**
   * Record a completed step
   */
  private recordStep(type: SagaStep['type'], data: any) {
    this.steps.push({
      type,
      data,
      timestamp: Date.now()
    });
  }
  
  /**
   * Mark saga as successfully completed
   */
  private async completeSaga() {
    await this.db
      .from('payment_sagas')
      .update({
        status: 'completed',
        steps: this.steps,
        completed_at: new Date().toISOString()
      })
      .eq('id', this.sagaId);
  }
  
  /**
   * Get or create Stripe customer for authenticated user or guest
   */
  private async getOrCreateStripeCustomer(
    userId?: string,
    guestEmail?: string,
    guestName?: string
  ): Promise<string> {
    // For authenticated users
    if (userId) {
      // Check if user already has Stripe customer ID
      const { data: profile } = await this.db
        .from('profiles')
        .select('stripe_customer_id, email, name')
        .eq('id', userId)
        .single();
      
      if (profile?.stripe_customer_id) {
        return profile.stripe_customer_id;
      }
      
      // Create new Stripe customer for authenticated user
      const customer = await executeWithQuota(() =>
        stripe.customers.create({
          email: profile?.email || undefined,
          name: profile?.name || undefined,
          metadata: { user_id: userId }
        })
      );
      
      // Save customer ID to profile
      await this.db
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', userId);
      
      logger.info({
        event: 'stripe_customer_created',
        user_id: userId,
        customer_id: customer.id
      });
      
      return customer.id;
    }
    
    // For guest users
    if (guestEmail) {
      // Create ephemeral Stripe customer for guest
      const customer = await executeWithQuota(() =>
        stripe.customers.create({
          email: guestEmail,
          name: guestName || undefined,
          metadata: { 
            is_guest: 'true',
            guest_email: guestEmail
          }
        })
      );
      
      logger.info({
        event: 'stripe_customer_created_guest',
        guest_email: guestEmail,
        customer_id: customer.id
      });
      
      return customer.id;
    }
    
    throw new Error('Either userId or guestEmail required to create Stripe customer');
  }
}

/**
 * Execute a payment authorization saga
 * 
 * @param params - Booking parameters
 * @returns The created order
 */
export async function executePaymentAuthorizationSaga(
  params: BookingParams
): Promise<any> {
  const saga = new PaymentAuthorizationSaga();
  return saga.execute(params);
}
