import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partner_id');
    const serviceType = searchParams.get('service_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const db = getServiceClient();
    let query = db
      .from('capacity_calendar')
      .select(`
        *,
        partner:partners(id, name, service_type)
      `)
      .order('slot_start', { ascending: true });

    // Apply filters
    if (partnerId) {
      query = query.eq('partner_id', partnerId);
    }

    if (serviceType && (serviceType === 'LAUNDRY' || serviceType === 'CLEANING')) {
      query = query.eq('service_type', serviceType);
    }

    if (startDate) {
      query = query.gte('slot_start', new Date(startDate).toISOString());
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      query = query.lte('slot_start', endOfDay.toISOString());
    }

    const { data: slots, error } = await query;

    if (error) throw error;

    // Calculate availability for each slot
    const slotsWithAvailability = slots?.map(slot => ({
      ...slot,
      available_units: slot.max_units - slot.reserved_units,
      utilization_percent: Math.round((slot.reserved_units / slot.max_units) * 100),
      status: slot.reserved_units === 0 
        ? 'available' 
        : slot.reserved_units < slot.max_units 
          ? 'partial' 
          : 'full'
    })) || [];

    return NextResponse.json({ slots: slotsWithAvailability });
  } catch (error) {
    console.error('Error fetching capacity slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch capacity slots' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      partner_id,
      service_type,
      slot_start,
      slot_end,
      max_units,
      notes
    } = body;

    // Validation
    if (!partner_id || !service_type || !slot_start || !slot_end || !max_units) {
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

    if (max_units <= 0) {
      return NextResponse.json(
        { error: 'max_units must be greater than 0' },
        { status: 400 }
      );
    }

    const startTime = new Date(slot_start);
    const endTime = new Date(slot_end);

    if (endTime <= startTime) {
      return NextResponse.json(
        { error: 'slot_end must be after slot_start' },
        { status: 400 }
      );
    }

    if (startTime < new Date()) {
      return NextResponse.json(
        { error: 'Cannot create slots in the past' },
        { status: 400 }
      );
    }

    const db = getServiceClient();

    // Verify partner exists and is active
    const { data: partner, error: partnerError } = await db
      .from('partners')
      .select('id, name, service_type, active')
      .eq('id', partner_id)
      .single();

    if (partnerError || !partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }

    if (!partner.active) {
      return NextResponse.json(
        { error: 'Cannot create slots for inactive partner' },
        { status: 400 }
      );
    }

    if (partner.service_type !== service_type) {
      return NextResponse.json(
        { error: 'Service type does not match partner service type' },
        { status: 400 }
      );
    }

    // Check for conflicts using the database function
    const { data: hasConflict, error: conflictError } = await db
      .rpc('check_capacity_conflict', {
        p_partner_id: partner_id,
        p_slot_start: startTime.toISOString(),
        p_slot_end: endTime.toISOString()
      });

    if (conflictError) throw conflictError;

    if (hasConflict) {
      return NextResponse.json(
        { error: 'This time slot overlaps with an existing slot for this partner' },
        { status: 409 }
      );
    }

    // Create the slot
    const { data: slot, error: createError } = await db
      .from('capacity_calendar')
      .insert({
        partner_id,
        service_type,
        slot_start: startTime.toISOString(),
        slot_end: endTime.toISOString(),
        max_units,
        reserved_units: 0,
        created_by: user.id,
        notes: notes || null
      })
      .select()
      .single();

    if (createError) throw createError;

    // Log to audit trail
    await db.from('audit_logs').insert({
      actor_id: user.id,
      actor_role: 'admin',
      action: 'capacity.create',
      entity_type: 'capacity_slot',
      entity_id: slot.id,
      changes: {
        partner_id,
        service_type,
        slot_start: startTime.toISOString(),
        slot_end: endTime.toISOString(),
        max_units
      }
    });

    return NextResponse.json({ slot }, { status: 201 });
  } catch (error) {
    console.error('Error creating capacity slot:', error);
    return NextResponse.json(
      { error: 'Failed to create capacity slot' },
      { status: 500 }
    );
  }
}
