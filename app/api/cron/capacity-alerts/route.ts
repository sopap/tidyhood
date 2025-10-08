import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/db';
import { getNYTime } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getServiceClient();
    const now = getNYTime();
    const alerts: Array<{
      type: string;
      service?: string;
      date: string;
      severity: string;
      count?: number;
    }> = [];

    // Check for gaps in next 7 days
    const checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const startOfDay = new Date(checkDate);
      const endOfDay = new Date(checkDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Check LAUNDRY capacity
      const { data: laundrySlots } = await db
        .from('capacity_calendar')
        .select('*')
        .eq('service_type', 'LAUNDRY')
        .gte('slot_start', startOfDay.toISOString())
        .lte('slot_start', endOfDay.toISOString());

      if (!laundrySlots || laundrySlots.length === 0) {
        alerts.push({
          type: 'NO_CAPACITY',
          service: 'LAUNDRY',
          date: checkDate.toISOString().split('T')[0],
          severity: i < 2 ? 'CRITICAL' : 'WARNING',
        });
      }

      // Check CLEANING capacity
      const { data: cleaningSlots } = await db
        .from('capacity_calendar')
        .select('*')
        .eq('service_type', 'CLEANING')
        .gte('slot_start', startOfDay.toISOString())
        .lte('slot_start', endOfDay.toISOString());

      if (!cleaningSlots || cleaningSlots.length === 0) {
        alerts.push({
          type: 'NO_CAPACITY',
          service: 'CLEANING',
          date: checkDate.toISOString().split('T')[0],
          severity: i < 2 ? 'CRITICAL' : 'WARNING',
        });
      }

      // Check for low capacity (< 5 available units)
      const allSlots = [...(laundrySlots || []), ...(cleaningSlots || [])];
      const lowCapSlots = allSlots.filter(
        (s: any) => (s.max_units - s.reserved_units) < 5 && (s.max_units - s.reserved_units) > 0
      );

      if (lowCapSlots.length > 0) {
        alerts.push({
          type: 'LOW_CAPACITY',
          date: checkDate.toISOString().split('T')[0],
          count: lowCapSlots.length,
          severity: 'INFO',
        });
      }

      checkDate.setDate(checkDate.getDate() + 1);
    }

    // Store alerts in operational_alerts table (only if new)
    if (alerts.length > 0) {
      for (const alert of alerts) {
        // Check if similar alert exists in last 24 hours
        const oneDayAgo = new Date(now);
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        const { data: existingAlert } = await db
          .from('operational_alerts')
          .select('id')
          .eq('type', alert.type)
          .eq('severity', alert.severity)
          .eq('resolved', false)
          .gte('created_at', oneDayAgo.toISOString())
          .maybeSingle();

        // Only create if no similar recent alert exists
        if (!existingAlert) {
          await db.from('operational_alerts').insert({
            type: alert.type,
            severity: alert.severity,
            message: JSON.stringify(alert),
            resolved: false,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      alerts_created: alerts.length,
      alerts,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Error checking capacity alerts:', error);
    return NextResponse.json(
      { error: 'Failed to check capacity alerts' },
      { status: 500 }
    );
  }
}
