import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceClient } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const updatePartnerSchema = z.object({
  name: z.string().min(1),
  service_type: z.string().min(1),
  contact_email: z.string().min(1),
  contact_phone: z.string().min(1),
  address: z.string().nullable().optional(),
  payout_percent: z.number().optional(),
  service_areas: z.array(z.string()).optional(),
  max_orders_per_slot: z.number().optional(),
  max_minutes_per_slot: z.number().optional()
});

const togglePartnerSchema = z.object({
  active: z.boolean()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id } = await params;
    const db = getServiceClient();

    // Get partner details
    const { data: partner, error: partnerError } = await db
      .from('partners')
      .select('*')
      .eq('id', id)
      .single();

    if (partnerError) {
      if (partnerError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
      }
      throw partnerError;
    }

    // Get order statistics
    const { data: orderStats, error: statsError } = await db
      .from('orders')
      .select('status, total_cents, quote_cents')
      .eq('partner_id', id);

    if (statsError) throw statsError;

    // Calculate stats - only count completed/delivered orders for revenue
    // Use quote_cents (final quoted amount) if available, otherwise fall back to total_cents (estimate)
    const completedOrders = orderStats?.filter(o => 
      o.status === 'completed' || o.status === 'delivered'
    ) || [];
    
    const stats = {
      total_orders: orderStats?.length || 0,
      completed_orders: completedOrders.length,
      in_progress: orderStats?.filter(o => 
        ['pending_pickup', 'picked_up', 'at_facility', 'quote_sent', 'awaiting_payment', 'paid_processing', 'in_progress', 'out_for_delivery'].includes(o.status)
      ).length || 0,
      total_revenue_cents: completedOrders.reduce((sum, o) => {
        const actualAmount = o.quote_cents || o.total_cents || 0;
        return sum + actualAmount;
      }, 0),
    };

    return NextResponse.json({ 
      partner,
      stats
    });
  } catch (error) {
    console.error('Error fetching partner:', error);

    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch partner' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();

    const { id } = await params;
    const body = await request.json();

    // Validation
    const parsed = updatePartnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    const {
      name,
      service_type,
      contact_email,
      contact_phone,
      address,
      payout_percent,
      service_areas,
      max_orders_per_slot,
      max_minutes_per_slot,
    } = parsed.data;

    if (!['LAUNDRY', 'CLEANING'].includes(service_type)) {
      return NextResponse.json(
        { error: 'Invalid service_type' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (payout_percent !== undefined && (payout_percent < 0 || payout_percent > 100)) {
      return NextResponse.json(
        { error: 'Payout percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    const db = getServiceClient();

    // Get current partner data for audit log
    const { data: currentPartner } = await db
      .from('partners')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentPartner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Check for duplicate email (excluding current partner)
    const { data: existing } = await db
      .from('partners')
      .select('id')
      .eq('contact_email', contact_email)
      .neq('id', id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Another partner with this email already exists' },
        { status: 409 }
      );
    }

    // Prepare update data
    const updateData: any = {
      name,
      service_type,
      contact_email,
      contact_phone,
      address: address || null,
      payout_percent: payout_percent !== undefined ? payout_percent : currentPartner.payout_percent,
      updated_at: new Date().toISOString(),
    };

    if (service_areas && Array.isArray(service_areas)) {
      updateData.service_areas = service_areas;
    }

    if (service_type === 'LAUNDRY' && max_orders_per_slot !== undefined) {
      updateData.max_orders_per_slot = max_orders_per_slot;
    }
    if (service_type === 'CLEANING' && max_minutes_per_slot !== undefined) {
      updateData.max_minutes_per_slot = max_minutes_per_slot;
    }

    // Update partner
    const { data: partner, error } = await db
      .from('partners')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log to audit trail
    const changes: any = {};
    Object.keys(updateData).forEach(key => {
      if (JSON.stringify(currentPartner[key]) !== JSON.stringify(updateData[key])) {
        changes[key] = {
          from: currentPartner[key],
          to: updateData[key]
        };
      }
    });

    if (Object.keys(changes).length > 0) {
      await db.from('audit_logs').insert({
        actor_id: user.id,
        actor_role: 'admin',
        action: 'partner.update',
        entity_type: 'partner',
        entity_id: id,
        changes,
      });
    }

    return NextResponse.json({ partner });
  } catch (error) {
    console.error('Error updating partner:', error);

    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update partner' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin();

    const { id } = await params;
    const body = await request.json();

    const parsed = togglePartnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'active field must be a boolean' },
        { status: 400 }
      );
    }
    const { active } = parsed.data;

    const db = getServiceClient();

    // Get current status for audit log
    const { data: currentPartner } = await db
      .from('partners')
      .select('active, name')
      .eq('id', id)
      .single();

    if (!currentPartner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Update active status
    const { data: partner, error } = await db
      .from('partners')
      .update({ 
        active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log to audit trail
    await db.from('audit_logs').insert({
      actor_id: user.id,
      actor_role: 'admin',
      action: active ? 'partner.activate' : 'partner.deactivate',
      entity_type: 'partner',
      entity_id: id,
      changes: {
        active: {
          from: currentPartner.active,
          to: active
        }
      },
    });

    return NextResponse.json({ partner });
  } catch (error) {
    console.error('Error toggling partner status:', error);

    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to toggle partner status' },
      { status: 500 }
    );
  }
}
