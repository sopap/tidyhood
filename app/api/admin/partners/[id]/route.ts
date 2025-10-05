import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
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
      .select('status, subtotal_cents')
      .eq('partner_id', id);

    if (statsError) throw statsError;

    // Calculate stats
    const stats = {
      total_orders: orderStats?.length || 0,
      completed_orders: orderStats?.filter(o => o.status === 'completed').length || 0,
      in_progress: orderStats?.filter(o => 
        ['pending_quote', 'quote_sent', 'scheduled', 'in_progress'].includes(o.status)
      ).length || 0,
      total_revenue_cents: orderStats?.reduce((sum, o) => sum + (o.subtotal_cents || 0), 0) || 0,
    };

    return NextResponse.json({ 
      partner,
      stats
    });
  } catch (error) {
    console.error('Error fetching partner:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partner' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
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
    } = body;

    // Validation
    if (!name || !service_type || !contact_email || !contact_phone) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

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
    return NextResponse.json(
      { error: 'Failed to update partner' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { active } = body;

    if (typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'active field must be a boolean' },
        { status: 400 }
      );
    }

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
    return NextResponse.json(
      { error: 'Failed to toggle partner status' },
      { status: 500 }
    );
  }
}
