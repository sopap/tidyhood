import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/partners/[id]
 * 
 * Fetch partner information for display in order details
 * Returns: name, photo, rating, review count
 * 
 * Public endpoint (no auth required) - only returns public info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id;
    
    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID required' },
        { status: 400 }
      );
    }
    
    // Create server-side Supabase client for API routes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Fetch partner public information
    const { data: partner, error } = await supabase
      .from('partners')
      .select('id, name, photo_url, rating, review_count, phone')
      .eq('id', partnerId)
      .single();
    
    if (error) {
      console.error('Partner fetch error:', error);
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }
    
    if (!partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      );
    }
    
    // Return only public information
    return NextResponse.json({
      id: partner.id,
      name: partner.name,
      photo_url: partner.photo_url,
      rating: partner.rating,
      review_count: partner.review_count,
      phone: partner.phone, // For contact functionality
    });
    
  } catch (error) {
    console.error('Partner API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
