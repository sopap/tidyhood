import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import type { PartnerCapabilities } from '@/lib/types';

/**
 * GET /api/services/available
 * 
 * Checks which service capabilities are available in a given zip code
 * based on active partners serving that area.
 * 
 * Query params:
 * - zip: string (required) - The zip code to check
 * - service_type: 'LAUNDRY' | 'CLEANING' (required) - Type of service
 * 
 * Returns:
 * - available_capabilities: string[] - Capabilities available in this zip
 * - unavailable_capabilities: string[] - Capabilities not available
 * - partner_count: number - Number of active partners serving this zip
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const zip = searchParams.get('zip');
  const serviceType = searchParams.get('service_type') as 'LAUNDRY' | 'CLEANING';

  // Validate required parameters
  if (!zip || !serviceType) {
    return NextResponse.json(
      { error: 'Missing required parameters: zip and service_type' },
      { status: 400 }
    );
  }

  // Validate service type
  if (serviceType !== 'LAUNDRY' && serviceType !== 'CLEANING') {
    return NextResponse.json(
      { error: 'service_type must be LAUNDRY or CLEANING' },
      { status: 400 }
    );
  }

  try {
    // Query partners serving this zip with active status
    const { data: partners, error } = await supabase
      .from('partners')
      .select('id, name, capabilities, service_type')
      .eq('service_type', serviceType)
      .eq('active', true)
      .contains('service_areas', [zip]);

    if (error) {
      console.error('Database error fetching partners:', error);
      throw error;
    }

    // Aggregate capabilities across all partners
    const capabilitySet = new Set<string>();
    
    if (partners && partners.length > 0) {
      partners.forEach((partner: any) => {
        // If partner has no capabilities defined (null), treat as supporting all services
        // This ensures backward compatibility with existing partners
        if (!partner.capabilities) {
          const defaultCapabilities = serviceType === 'LAUNDRY'
            ? ['wash_fold', 'dry_clean', 'mixed']
            : ['standard', 'deep_clean', 'move_in_out'];
          
          defaultCapabilities.forEach(cap => capabilitySet.add(cap));
        } else {
          // Add only the capabilities that are explicitly set to true
          Object.entries(partner.capabilities).forEach(([key, value]) => {
            if (value === true) {
              capabilitySet.add(key);
            }
          });
        }
      });
    }

    const availableCapabilities = Array.from(capabilitySet);
    
    // Determine unavailable capabilities based on service type
    const allCapabilities = serviceType === 'LAUNDRY'
      ? ['wash_fold', 'dry_clean', 'mixed']
      : ['standard', 'deep_clean', 'move_in_out', 'post_construction'];
    
    const unavailableCapabilities = allCapabilities.filter(
      cap => !availableCapabilities.includes(cap)
    );

    return NextResponse.json({
      service_type: serviceType,
      zip_code: zip,
      available_capabilities: availableCapabilities,
      unavailable_capabilities: unavailableCapabilities,
      partner_count: partners?.length || 0,
    });
  } catch (error: any) {
    console.error('Service availability check failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check service availability',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
