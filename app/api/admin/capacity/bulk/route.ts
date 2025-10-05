import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      template_id,
      start_date,
      end_date
    } = body;

    // Validation
    if (!template_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: template_id, start_date, end_date' },
        { status: 400 }
      );
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: 'end_date must be after start_date' },
        { status: 400 }
      );
    }

    // Limit to reasonable range (e.g., 3 months)
    const maxDays = 90;
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > maxDays) {
      return NextResponse.json(
        { error: `Date range too large. Maximum ${maxDays} days allowed.` },
        { status: 400 }
      );
    }

    const db = getServiceClient();

    // Get template
    const { data: template, error: templateError } = await db
      .from('capacity_templates')
      .select('*, partner:partners(id, name, service_type, active)')
      .eq('id', template_id)
      .eq('active', true)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found or inactive' },
        { status: 404 }
      );
    }

    if (!template.partner.active) {
      return NextResponse.json(
        { error: 'Cannot generate slots for inactive partner' },
        { status: 400 }
      );
    }

    // Generate slots for each matching day of week in range
    const slotsToCreate = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      // Check if this day matches template's day_of_week
      if (currentDate.getDay() === template.day_of_week) {
        // Create slot date/time
        const slotStart = new Date(currentDate);
        const [hours, minutes, seconds] = template.slot_start.split(':');
        slotStart.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds || '0'));

        const slotEnd = new Date(currentDate);
        const [endHours, endMinutes, endSeconds] = template.slot_end.split(':');
        slotEnd.setHours(parseInt(endHours), parseInt(endMinutes), parseInt(endSeconds || '0'));

        // Only create if in future
        if (slotStart > new Date()) {
          slotsToCreate.push({
            partner_id: template.partner_id,
            service_type: template.service_type,
            slot_start: slotStart.toISOString(),
            slot_end: slotEnd.toISOString(),
            max_units: template.max_units,
            reserved_units: 0,
            created_by: user.id,
            notes: `Generated from template ${template.id}`
          });
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (slotsToCreate.length === 0) {
      return NextResponse.json(
        { 
          message: 'No slots created. All potential slots are in the past or no matching days found.',
          slots_created: 0
        }
      );
    }

    // Check for conflicts before inserting
    const conflicts = [];
    for (const slot of slotsToCreate) {
      const { data: hasConflict } = await db
        .rpc('check_capacity_conflict', {
          p_partner_id: slot.partner_id,
          p_slot_start: slot.slot_start,
          p_slot_end: slot.slot_end
        });

      if (hasConflict) {
        conflicts.push(slot.slot_start);
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json(
        { 
          error: `Found ${conflicts.length} conflicting slot(s). Please delete or modify existing slots first.`,
          conflicts: conflicts.slice(0, 5) // Return first 5 conflicts
        },
        { status: 409 }
      );
    }

    // Insert all slots
    const { data: createdSlots, error: insertError } = await db
      .from('capacity_calendar')
      .insert(slotsToCreate)
      .select();

    if (insertError) throw insertError;

    // Log to audit trail
    await db.from('audit_logs').insert({
      actor_id: user.id,
      actor_role: 'admin',
      action: 'capacity.bulk_create',
      entity_type: 'capacity_slot',
      entity_id: template_id,
      changes: {
        template_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        slots_created: createdSlots?.length || 0
      }
    });

    return NextResponse.json({ 
      slots: createdSlots,
      slots_created: createdSlots?.length || 0,
      message: `Successfully created ${createdSlots?.length || 0} slots`
    }, { status: 201 });
  } catch (error) {
    console.error('Error bulk creating slots:', error);
    return NextResponse.json(
      { error: 'Failed to bulk create slots' },
      { status: 500 }
    );
  }
}
