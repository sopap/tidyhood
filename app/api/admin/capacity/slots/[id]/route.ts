import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = getServiceClient();

    const { data: slot, error } = await db
      .from('capacity_calendar')
      .select(`
        *,
        partner:partners(id, name, service_type)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
      }
      throw error;
    }

    // Add calculated fields
    const slotWithAvailability = {
      ...slot,
      available_units: slot.max_units - slot.reserved_units,
      utilization_percent: Math.round((slot.reserved_units / slot.max_units) * 100),
      status: slot.reserved_units === 0 
        ? 'available' 
        : slot.reserved_units < slot.max_units 
          ? 'partial' 
          : 'full'
    };

    return NextResponse.json({ slot: slotWithAvailability });
  } catch (error) {
    console.error('Error fetching slot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slot' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      slot_start,
      slot_end,
      max_units,
      notes
    } = body;

    const db = getServiceClient();

    // Get current slot
    const { data: currentSlot, error: fetchError } = await db
      .from('capacity_calendar')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !currentSlot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    const changes: any = {};

    // Update slot times if provided
    if (slot_start || slot_end) {
      const startTime = slot_start ? new Date(slot_start) : new Date(currentSlot.slot_start);
      const endTime = slot_end ? new Date(slot_end) : new Date(currentSlot.slot_end);

      if (endTime <= startTime) {
        return NextResponse.json(
          { error: 'slot_end must be after slot_start' },
          { status: 400 }
        );
      }

      if (startTime < new Date()) {
        return NextResponse.json(
          { error: 'Cannot set slots to the past' },
          { status: 400 }
        );
      }

      // Check for conflicts if times changed
      if (slot_start || slot_end) {
        const { data: hasConflict, error: conflictError } = await db
          .rpc('check_capacity_conflict', {
            p_partner_id: currentSlot.partner_id,
            p_slot_start: startTime.toISOString(),
            p_slot_end: endTime.toISOString(),
            p_exclude_id: id
          });

        if (conflictError) throw conflictError;

        if (hasConflict) {
          return NextResponse.json(
            { error: 'Updated time slot overlaps with an existing slot' },
            { status: 409 }
          );
        }
      }

      if (slot_start) {
        updateData.slot_start = startTime.toISOString();
        changes.slot_start = {
          from: currentSlot.slot_start,
          to: startTime.toISOString()
        };
      }
      if (slot_end) {
        updateData.slot_end = endTime.toISOString();
        changes.slot_end = {
          from: currentSlot.slot_end,
          to: endTime.toISOString()
        };
      }
    }

    // Update max_units if provided
    if (max_units !== undefined) {
      if (max_units <= 0) {
        return NextResponse.json(
          { error: 'max_units must be greater than 0' },
          { status: 400 }
        );
      }

      // Cannot reduce capacity below currently reserved
      if (max_units < currentSlot.reserved_units) {
        return NextResponse.json(
          { 
            error: `Cannot reduce capacity below ${currentSlot.reserved_units} (currently reserved). Cancel or reschedule orders first.` 
          },
          { status: 400 }
        );
      }

      updateData.max_units = max_units;
      changes.max_units = {
        from: currentSlot.max_units,
        to: max_units
      };
    }

    // Update notes if provided
    if (notes !== undefined) {
      updateData.notes = notes || null;
      if (currentSlot.notes !== (notes || null)) {
        changes.notes = {
          from: currentSlot.notes,
          to: notes || null
        };
      }
    }

    // If no changes, return current slot
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ slot: currentSlot });
    }

    // Update slot
    const { data: slot, error: updateError } = await db
      .from('capacity_calendar')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log to audit trail
    if (Object.keys(changes).length > 0) {
      await db.from('audit_logs').insert({
        actor_id: user.id,
        actor_role: 'admin',
        action: 'capacity.update',
        entity_type: 'capacity_slot',
        entity_id: id,
        changes
      });
    }

    return NextResponse.json({ slot });
  } catch (error) {
    console.error('Error updating slot:', error);
    return NextResponse.json(
      { error: 'Failed to update slot' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const db = getServiceClient();

    // Get current slot
    const { data: slot, error: fetchError } = await db
      .from('capacity_calendar')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !slot) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

    // Cannot delete if there are reservations
    if (slot.reserved_units > 0) {
      return NextResponse.json(
        { 
          error: `Cannot delete slot with ${slot.reserved_units} reserved units. Cancel or reschedule orders first.` 
        },
        { status: 400 }
      );
    }

    // Delete slot
    const { error: deleteError } = await db
      .from('capacity_calendar')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Log to audit trail
    await db.from('audit_logs').insert({
      actor_id: user.id,
      actor_role: 'admin',
      action: 'capacity.delete',
      entity_type: 'capacity_slot',
      entity_id: id,
      changes: {
        deleted_slot: {
          partner_id: slot.partner_id,
          slot_start: slot.slot_start,
          slot_end: slot.slot_end,
          max_units: slot.max_units
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting slot:', error);
    return NextResponse.json(
      { error: 'Failed to delete slot' },
      { status: 500 }
    );
  }
}
