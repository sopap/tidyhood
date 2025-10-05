import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getServiceClient } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Check if user has partner role
    if (user.role !== 'partner') {
      return NextResponse.json(
        { error: 'Not a partner account' },
        { status: 403 }
      );
    }

    const db = getServiceClient();

    // Get partner information
    const { data: partner, error } = await db
      .from('partners')
      .select('id, name, service_type, active')
      .or(`profile_id.eq.${user.id},contact_email.eq.${user.email}`)
      .single();

    if (error || !partner) {
      return NextResponse.json(
        { error: 'Partner record not found' },
        { status: 404 }
      );
    }

    if (!partner.active) {
      return NextResponse.json(
        { error: 'Partner account is inactive' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      verified: true,
      partner: {
        id: partner.id,
        name: partner.name,
        service_type: partner.service_type
      }
    });
  } catch (error) {
    console.error('Partner verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
