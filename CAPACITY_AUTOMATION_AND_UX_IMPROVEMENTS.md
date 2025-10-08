# Capacity Automation & UX Improvements Implementation Plan

**Date:** October 8, 2025  
**Goal:** Eliminate manual coordination & achieve best-in-class booking UX

## Overview

This document outlines the implementation plan for automating capacity management and improving the booking experience to eliminate manual coordination and create a world-class UX.

---

## Phase 1: Automated 14-Day Slot Population

### Current State
- Admins manually create slots via `/admin/capacity/add` page
- Bulk creation available but requires manual triggering
- No automated population of future capacity
- Risk of gaps in availability

### Target State
- Automated cron job maintains 14-day rolling capacity
- Zero manual intervention for standard operations
- Alerts when automation fails or gaps detected

### Implementation

#### 1.1 Create Automated Slot Population Cron Job

**File:** `app/api/cron/populate-slots/route.ts`

```typescript
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
      errors: [],
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
    const activeTemplates = templates.filter(t => t.partner.active);

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
              .single();

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

    // Log results
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
      { error: 'Failed to auto-populate slots', details: error.message },
      { status: 500 }
    );
  }
}
```

#### 1.2 Configure Vercel Cron

**File:** `vercel.json`

```json
{
  "crons": [{
    "path": "/api/cron/populate-slots",
    "schedule": "0 2 * * *"
  }, {
    "path": "/api/cron/capacity-alerts",
    "schedule": "0 */6 * * *"
  }]
}
```

#### 1.3 Create Capacity Monitoring Alerts

**File:** `app/api/cron/capacity-alerts/route.ts`

```typescript
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
    const alerts = [];

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
        s => (s.max_units - s.reserved_units) < 5
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

    // Store alerts in operational_alerts table
    if (alerts.length > 0) {
      for (const alert of alerts) {
        await db.from('operational_alerts').insert({
          type: alert.type,
          severity: alert.severity,
          message: JSON.stringify(alert),
          resolved: false,
        });
      }
    }

    return NextResponse.json({
      success: true,
      alerts_created: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error('Error checking capacity alerts:', error);
    return NextResponse.json(
      { error: 'Failed to check capacity alerts' },
      { status: 500 }
    );
  }
}
```

---

## Phase 2: Monitoring Dashboards

### 2.1 Admin Capacity Dashboard

**File:** `app/admin/capacity/dashboard/page.tsx`

Enhanced dashboard with:
- 14-day capacity heatmap
- Real-time utilization metrics
- Alert notifications
- Capacity trends
- Partner performance metrics

### 2.2 Capacity Metrics API

**File:** `app/api/admin/capacity/metrics/route.ts`

```typescript
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
      by_date: {},
      low_capacity_dates: [],
      no_capacity_dates: [],
    };

    if (slots) {
      slots.forEach(slot => {
        const available = slot.max_units - slot.reserved_units;
        metrics.available_capacity += available;
        metrics.reserved_capacity += slot.reserved_units;

        // By service
        const service = slot.service_type;
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
      Object.keys(metrics.by_service).forEach(service => {
        const s = metrics.by_service[service];
        const total = s.available + s.reserved;
        s.utilization = total > 0 ? Math.round((s.reserved / total) * 100) : 0;
      });

      // Identify low/no capacity dates
      Object.values(metrics.by_date).forEach((day: any) => {
        if (day.available === 0) {
          metrics.no_capacity_dates.push(day.date);
        } else if (day.available < 5) {
          metrics.low_capacity_dates.push(day.date);
        }
      });
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
```

---

## Phase 3: Professional Empty States

### 3.1 Enhanced SlotPicker Empty States

**File:** `components/booking/EnhancedSlotPicker.tsx`

Improvements:
- Beautiful illustrations for no slots
- Helpful messaging based on context
- Alternative date suggestions
- Waitlist signup option
- Loading skeletons

### 3.2 Empty State Component

**File:** `components/booking/SlotEmptyState.tsx`

```typescript
'use client';

import { Calendar, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface SlotEmptyStateProps {
  type: 'no-slots' | 'all-full' | 'loading-error';
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  suggestedDates?: string[];
}

export default function SlotEmptyState({
  type,
  selectedDate,
  onDateChange,
  suggestedDates = [],
}: SlotEmptyStateProps) {
  if (type === 'loading-error') {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Unable to load time slots
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          We're having trouble connecting. Please try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (type === 'all-full') {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 mx-auto mb-4 bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          All slots are booked for {selectedDate}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          This date is popular! Try selecting a different day or join our waitlist.
        </p>

        {suggestedDates.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Available nearby dates:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestedDates.map(date => (
                <button
                  key={date}
                  onClick={() => onDateChange?.(date)}
                  className="px-3 py-2 bg-white border-2 border-blue-200 text-blue-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-sm font-medium"
                >
                  {new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Link
            href="/waitlist"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Join Waitlist
          </Link>
          <p className="text-xs text-gray-500">
            We'll notify you when slots open up
          </p>
        </div>
      </div>
    );
  }

  // no-slots
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
        <Calendar className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No availability for {selectedDate}
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        We're not operating on this date. Please select a different day.
      </p>
      <p className="text-xs text-gray-500 mb-4">
        💡 Tip: We're closed on Sundays
      </p>
      
      {suggestedDates.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">
            Try these dates instead:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestedDates.map(date => (
              <button
                key={date}
                onClick={() => onDateChange?.(date)}
                className="px-3 py-2 bg-white border-2 border-blue-200 text-blue-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition text-sm font-medium"
              >
                {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 4: Mobile Experience Improvements

### 4.1 Mobile-Optimized Slot Picker

Key improvements:
- Larger touch targets (min 44x44px)
- Swipeable time period filters
- Bottom sheet date picker
- Sticky CTA
- Better empty states

### 4.2 Mobile Booking Flow

**File:** `components/booking/MobileSlotPicker.tsx`

- Full-screen date selector on mobile
- Haptic feedback for selections
- Pull-to-refresh slot list
- Optimized for one-handed use

---

## Phase 5: User Testing Framework

### 5.1 Test Plan

**Participants:** 5-10 customers from different segments
- 3 laundry-only users
- 3 cleaning-only users
- 2-4 multi-service users

**Test Scenarios:**
1. **First-time booking** - Complete flow from landing to confirmation
2. **Repeat booking** - Use saved preferences
3. **Slot selection** - Find and select preferred time
4. **Mobile booking** - Complete booking on mobile device
5. **Error recovery** - Handle no-slot scenarios

### 5.2 Metrics to Track

**Quantitative:**
- Time to complete booking
- Number of clicks/taps
- Drop-off points
- Error rates
- Slot selection time

**Qualitative:**
- User satisfaction (1-5 scale)
- Clarity of information
- Ease of use
- Mobile experience rating
- Likelihood to recommend

### 5.3 Testing Script

**File:** `docs/USER_TESTING_SCRIPT.md`

```markdown
# User Testing Script - Booking Flow

## Pre-Test Setup
- [ ] Device ready (test both mobile and desktop)
- [ ] Screen recording enabled
- [ ] Test account created
- [ ] Observer notes ready

## Introduction (2 min)
"Thank you for participating. We're testing our booking experience. Please think aloud as you go through the tasks. There are no wrong answers - we're testing the interface, not you."

## Task 1: Book a Service (10 min)
"Imagine you need to book [service type]. Walk me through how you would do that."

**Observe:**
- How easily they find the booking page
- Slot picker interactions
- Date/time selection process
- Any confusion points
- Time to completion

**Questions:**
- What was confusing?
- What did you like?
- Was anything missing?

## Task 2: No Slots Available (5 min)
"The date you selected has no slots. What would you do?"

**Observe:**
- Understanding of empty state
- Use of suggestions
- Frustration level
- Alternative actions

## Task 3: Mobile Experience (8 min)
"Now try booking on this mobile device."

**Observe:**
- Touch target usability
- Scroll behavior
- Form completion
- Overall mobile UX

## Wrap-up Questions (5 min)
1. Rate overall experience (1-5)
2. Would you recommend to friends? Why/why not?
3. What's one thing you'd change?
4. Any other feedback?

## Post-Test
- [ ] Save recording
- [ ] Compile notes
- [ ] Send thank-you + incentive
```

---

## Phase 6: Implementation Checklist

### Week 1: Automation Setup
- [ ] Create populate-slots cron endpoint
- [ ] Create capacity-alerts cron endpoint
- [ ] Configure Vercel cron jobs
- [ ] Add CRON_SECRET to env vars
- [ ] Test automation locally
- [ ] Deploy and verify crons running
- [ ] Monitor for 3 days

### Week 2: Monitoring Dashboard
- [ ] Create capacity metrics API
- [ ] Build admin dashboard UI
- [ ] Add capacity heatmap visualization
- [ ] Add alert notifications
- [ ] Add utilization charts
- [ ] Test dashboard with real data

### Week 3: Empty States & Mobile
- [ ] Design empty state variations
- [ ] Build SlotEmptyState component
- [ ] Integrate with SlotPicker
- [ ] Add suggested dates logic
- [ ] Optimize mobile touch targets
- [ ] Add loading skeletons
- [ ] Test on various devices

### Week 4: Documentation & Testing
- [ ] Write capacity management docs
- [ ] Create runbook for ops team
- [ ] Recruit 5-10 test participants
- [ ] Conduct user testing sessions
- [ ] Compile feedback
- [ ] Create improvement backlog
- [ ] Implement quick wins

---

## Success Metrics

### Operational Efficiency
- **Slot population:** 100% automated (0 manual interventions/week)
- **Capacity gaps:** <1% of days with no available slots
- **Alert response time:** <2 hours for critical alerts

### User Experience
- **Booking completion rate:** >85% (up from current baseline)
- **Mobile conversion:** >80% (up from current)
- **Time to book:** <3 minutes average
- **User satisfaction:** >4.2/5.0

### Business Impact
- **Booking volume:** +20% from improved UX
- **Support tickets:** -30% (fewer booking issues)
- **Mobile bookings:** +40% from better mobile UX

---

## Rollout Plan

### Phase A: Automation (Week 1-2)
- Deploy cron jobs
- Monitor for issues
- Fine-tune schedules

### Phase B: Monitoring (Week 2-3)
- Launch dashboard
- Train ops team
- Set up alerts

### Phase C: UX Improvements (Week 3-4)
- Deploy empty states
- Release mobile optimizations
- A/B test variations

### Phase D: Testing & Iteration (Week 4-5)
- Conduct user testing
- Analyze results
- Implement feedback
- Measure success metrics

---

## Risk Mitigation

### Technical Risks
- **Cron failure:** Set up redundant monitoring, manual fallback process
- **Database overload:** Implement query optimization, caching
- **Timezone issues:** Comprehensive timezone testing

### UX Risks
- **Confusing empty states:** Multiple user testing rounds
- **Mobile usability:** Test on real devices, various screen sizes
- **Performance:** Load testing, progressive enhancement

---

## Documentation Requirements

1. **Capacity Management Runbook** (`docs/CAPACITY_RUNBOOK.md`)
2. **Monitoring Dashboard Guide** (`docs/MONITORING_GUIDE.md`)
3. **User Testing Results** (`docs/USER_TESTING_RESULTS.md`)
4. **Mobile Optimization Guide** (`docs/MOBILE_UX_GUIDE.md`)

---

## Next Steps

1. Review and approve this plan
2. Assign owners for each phase
3. Set up project tracking
4. Begin Week 1 implementation
5. Schedule check-ins and reviews

**Questions or concerns?** Open an issue or discuss in team meeting.
