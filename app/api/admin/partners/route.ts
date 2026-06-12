import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceClient } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const createPartnerSchema = z.object({
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

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const serviceType = searchParams.get('service_type');

    const db = getServiceClient();
    let query = db
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false });

    if (status === 'active') {
      query = query.eq('active', true);
    } else if (status === 'inactive') {
      query = query.eq('active', false);
    }

    if (serviceType) {
      query = query.eq('service_type', serviceType);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,contact_email.ilike.%${search}%`);
    }

    const { data: partners, error } = await query;

    if (error) throw error;

    return NextResponse.json({ partners: partners || [] });
  } catch (error) {
    console.error('Error fetching partners:', error);

    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();

    const body = await request.json();

    // Validation
    const parsed = createPartnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Missing required fields: name, service_type, contact_email, contact_phone' },
        { status: 400 }
      );
    }
    const {
      name,
      service_type,
      contact_email,
      contact_phone,
      address,
      payout_percent = 65,
      service_areas,
      max_orders_per_slot,
      max_minutes_per_slot,
    } = parsed.data;

    // Validate service type
    if (!['LAUNDRY', 'CLEANING'].includes(service_type)) {
      return NextResponse.json(
        { error: 'Invalid service_type. Must be LAUNDRY or CLEANING' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate payout percentage
    if (payout_percent < 0 || payout_percent > 100) {
      return NextResponse.json(
        { error: 'Payout percentage must be between 0 and 100' },
        { status: 400 }
      );
    }

    const db = getServiceClient();

    // Check for duplicate email
    const { data: existing } = await db
      .from('partners')
      .select('id')
      .eq('contact_email', contact_email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Partner with this email already exists' },
        { status: 409 }
      );
    }

    // Prepare partner data
    const partnerData: any = {
      name,
      service_type,
      contact_email,
      contact_phone,
      address: address || null,
      payout_percent,
      active: true,
    };

    // Add service_areas if provided
    if (service_areas && Array.isArray(service_areas)) {
      partnerData.service_areas = service_areas;
    }

    // Add capacity limits based on service type
    if (service_type === 'LAUNDRY' && max_orders_per_slot) {
      partnerData.max_orders_per_slot = max_orders_per_slot;
    }
    if (service_type === 'CLEANING' && max_minutes_per_slot) {
      partnerData.max_minutes_per_slot = max_minutes_per_slot;
    }

    // Create partner
    const { data: partner, error } = await db
      .from('partners')
      .insert(partnerData)
      .select()
      .single();

    if (error) throw error;

    // Log to audit trail
    await db.from('audit_logs').insert({
      actor_id: user.id,
      actor_role: 'admin',
      action: 'partner.create',
      entity_type: 'partner',
      entity_id: partner.id,
      changes: { created: partnerData },
    });

    // TODO: Send welcome email with login instructions
    // This would integrate with your email service

    return NextResponse.json({ partner }, { status: 201 });
  } catch (error) {
    console.error('Error creating partner:', error);

    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create partner' },
      { status: 500 }
    );
  }
}
