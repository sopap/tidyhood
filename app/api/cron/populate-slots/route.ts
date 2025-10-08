import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/db';
import { getNYTime } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getServiceClient();
    const now = getNYTime();
    const results = {
      success: true,
      created: 0,
      skipped: 0,
      errors: [] as Array<{ template_id: string; date: string; error: string }>,
    };

    // Get all active templates
    const { data: templates, error: templatesError } = await db
      .from('capacity_templates')
      .select(`
        *,
        partner:partners(id, name, service_type, active)
      `)
      .eq('active', true);

    if (templatesError) throw templatesError;

    if (!templates || templates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active templates found',
        results,
      });
    }

    // Filter for active partners only
    const activeTemplates = templates.filter((t: any) => t.partner.active);

    // For each template, ensure slots exist for next 14 days
    for (const template of activeTemplates) {
      const startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 14);

      const currentDate = new Date(startDate);

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
          if (slotStart > now) {
            // Check if slot already exists
            const { data: existing } = await db
              .from('capacity_calendar')
              .select('id')
              .eq('partner_id', template.partner_id)
              .eq('service_type', template.service_type)
              .eq('slot_start', slotStart.toISOString())
              .maybeSingle();

            if (!existing) {
              // Create new slot
              const { error: insertError } = await db
                .from('capacity_calendar')
                .insert({
                  partner_id: template.partner_id,
                  service_type: template.service_type,
                  slot_start: slotStart.toISOString(),
                  slot_end: slotEnd.toISOString(),
                  max_units: template.max_units,
                  reserved_units: 0,
                  notes: `Auto-generated from template ${template.id}`,
                });

              if (insertError) {
                results.errors.push({
                  template_id: template.id,
                  date: slotStart.toISOString(),
                  error: insertError.message,
                });
              } else {
                results.created++;
              }
            } else {
              results.skipped++;
            }
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Log results to audit trail
    await db.from('audit_logs').insert({
      actor_id: 'system',
      actor_role: 'system',
      action: 'capacity.auto_populate',
      entity_type: 'capacity_slot',
      entity_id: 'bulk',
      changes: results,
    });

    return NextResponse.json({
      success: true,
      message: `Auto-populated capacity: ${results.created} created, ${results.skipped} skipped`,
      results,
    });
  } catch (error) {
    console.error('Error auto-populating slots:', error);
    return NextResponse.json(
      { 
        error: 'Failed to auto-populate slots', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
