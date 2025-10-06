import { NextRequest, NextResponse } from 'next/server'
import { 
  autoTransitionToInService,
  autoCompleteCleanings
} from '@/lib/cleaningStatus'
import { logger } from '@/lib/logger'

/**
 * Cron endpoint for cleaning status automation
 * 
 * This endpoint handles automated status transitions:
 * - Auto-transition scheduled → in_service (runs daily at 6 AM)
 * - Auto-complete in_service → completed (runs hourly as safety net)
 * 
 * Authorization: Requires CRON_SECRET in header
 * 
 * Usage with Vercel Cron:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleaning-status",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 * 
 * Or use external cron service:
 * curl -H "Authorization: Bearer ${CRON_SECRET}" \
 *   https://your-domain.com/api/cron/cleaning-status?action=transition
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
    
    if (!process.env.CRON_SECRET) {
      console.error('CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron not configured' },
        { status: 500 }
      )
    }
    
    if (authHeader !== expectedAuth) {
      console.warn('Unauthorized cron attempt from:', request.headers.get('x-forwarded-for') || 'unknown')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get action from query params (defaults to 'all')
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'all'
    
    const results: any = {
      timestamp: new Date().toISOString(),
      action
    }
    
    // Run appropriate job(s)
    if (action === 'transition' || action === 'all') {
      console.log('Running auto-transition to in_service cron')
      try {
        const count = await autoTransitionToInService()
        results.transitioned = count
        console.log(`Auto-transitioned ${count} orders to in_service`)
      } catch (error) {
        console.error('Auto-transition cron failed:', error)
        results.transitionError = (error as Error).message
      }
    }
    
    if (action === 'complete' || action === 'all') {
      console.log('Running auto-complete cron')
      try {
        const count = await autoCompleteCleanings()
        results.completed = count
        if (count > 0) {
          console.warn(`Auto-completed ${count} orders (safety net triggered)`)
        } else {
          console.log('Auto-complete check: no orders needed completion')
        }
      } catch (error) {
        console.error('Auto-complete cron failed:', error)
        results.completeError = (error as Error).message
      }
    }
    
    // Check for errors
    const hasErrors = results.transitionError || results.completeError
    
    return NextResponse.json({
      success: !hasErrors,
      ...results
    }, {
      status: hasErrors ? 500 : 200
    })
    
  } catch (error) {
    console.error('Cron endpoint error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}

// Allow POST as well (some cron services prefer POST)
export async function POST(request: NextRequest) {
  return GET(request)
}
