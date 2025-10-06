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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: partnerId } = await params;
    
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
    
    // Fetch partner public information (using actual schema columns)
    const { data: partner, error } = await supabase
      .from('partners')
      .select('id, name, contact_phone, scorecard_json')
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
    
    // Extract rating from scorecard_json if available
    const scorecard = partner.scorecard_json || {};
    const rating = scorecard.rating || 4.5; // Default rating
    const review_count = scorecard.review_count || 0;
    
    // Return only public information (with defaults for missing fields)
    return NextResponse.json({
      id: partner.id,
      name: partner.name,
      photo_url: null, // Photo feature not yet implemented in DB
      rating: rating,
      review_count: review_count,
      phone: partner.contact_phone, // Map contact_phone to phone for consistency
    });
    
  } catch (error) {
    console.error('Partner API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
