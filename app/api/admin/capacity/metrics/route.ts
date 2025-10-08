import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getNYTime } from '@/lib/timezone';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getServiceClient();
    const now = getNYTime();
    
    // Get date range (next 14 days)
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 14);

    // Get all slots in range
    const { data: slots, error } = await db
      .from('capacity_calendar')
      .select('*')
      .gte('slot_start', startDate.toISOString())
      .lte('slot_start', endDate.toISOString())
      .order('slot_start');

    if (error) throw error;

    // Calculate metrics
    const metrics = {
      total_slots: slots?.length || 0,
      available_capacity: 0,
      reserved_capacity: 0,
      utilization_rate: 0,
      by_service: {
        LAUNDRY: { slots: 0, available: 0, reserved: 0, utilization: 0 },
        CLEANING: { slots: 0, available: 0, reserved: 0, utilization: 0 },
      },
      by_date: {} as Record<string, {
        date: string;
        slots: number;
        available: number;
        reserved: number;
        max: number;
      }>,
      low_capacity_dates: [] as string[],
      no_capacity_dates: [] as string[],
    };

    if (slots) {
      slots.forEach((slot: any) => {
        const available = slot.max_units - slot.reserved_units;
        metrics.available_capacity += available;
        metrics.reserved_capacity += slot.reserved_units;

        // By service
        const service = slot.service_type as 'LAUNDRY' | 'CLEANING';
        metrics.by_service[service].slots++;
        metrics.by_service[service].available += available;
        metrics.by_service[service].reserved += slot.reserved_units;

        // By date
        const date = slot.slot_start.split('T')[0];
        if (!metrics.by_date[date]) {
          metrics.by_date[date] = {
            date,
            slots: 0,
            available: 0,
            reserved: 0,
            max: 0,
          };
        }
        metrics.by_date[date].slots++;
        metrics.by_date[date].available += available;
        metrics.by_date[date].reserved += slot.reserved_units;
        metrics.by_date[date].max += slot.max_units;
      });

      // Calculate utilization
      const totalMax = metrics.available_capacity + metrics.reserved_capacity;
      metrics.utilization_rate = totalMax > 0
        ? Math.round((metrics.reserved_capacity / totalMax) * 100)
        : 0;

      // Service-level utilization
      (['LAUNDRY', 'CLEANING'] as const).forEach(service => {
        const s = metrics.by_service[service];
        const total = s.available + s.reserved;
        s.utilization = total > 0 ? Math.round((s.reserved / total) * 100) : 0;
      });

      // Identify low/no capacity dates
      Object.values(metrics.by_date).forEach((day) => {
        if (day.available === 0 && day.max > 0) {
          metrics.no_capacity_dates.push(day.date);
        } else if (day.available < 5 && day.available > 0) {
          metrics.low_capacity_dates.push(day.date);
        }
      });
    }

    // Check for date gaps (dates with no slots at all)
    const currentCheck = new Date(startDate);
    while (currentCheck <= endDate) {
      const dateStr = currentCheck.toISOString().split('T')[0];
      if (!metrics.by_date[dateStr]) {
        // No slots exist for this date
        if (currentCheck.getDay() !== 0) { // Ignore Sundays
          metrics.no_capacity_dates.push(dateStr);
        }
      }
      currentCheck.setDate(currentCheck.getDate() + 1);
    }

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching capacity metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
