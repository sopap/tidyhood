import { NextResponse } from 'next/server'
import { getLaundryDisplayPricing, getCleaningDisplayPricing } from '@/lib/display-pricing'

/**
 * GET /api/pricing/display
 *
 * Public, unauthenticated display pricing for marketing surfaces
 * (landing page hero/cards). Reads the same active pricing_rules the
 * booking flow charges from, so marketing and checkout never diverge.
 */
export async function GET() {
  try {
    const [laundry, cleaning] = await Promise.all([
      getLaundryDisplayPricing(),
      getCleaningDisplayPricing(),
    ])

    return NextResponse.json(
      { laundry, cleaning },
      {
        headers: {
          // Cache at the edge for 5 minutes; pricing rarely changes
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Display pricing fetch failed:', error)
    return NextResponse.json({ error: 'Pricing unavailable' }, { status: 500 })
  }
}
