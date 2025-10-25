import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'
import { handleApiError } from '@/lib/errors'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface CancellationPolicy {
  id: string
  version: number
  service_type: 'LAUNDRY' | 'CLEANING'
  notice_hours: number
  cancellation_fee_percent: number
  reschedule_notice_hours: number
  reschedule_fee_percent: number
  allow_cancellation: boolean
  allow_rescheduling: boolean
}

interface PolicyResponse extends CancellationPolicy {
  summary_html: string
  details_html: string
}

/**
 * GET /api/policies/cancellation
 * 
 * Returns the active cancellation policy for a given service type.
 * Used in booking flow to display policy details and lock policy version.
 * 
 * Query Parameters:
 * - service (required): "LAUNDRY" or "CLEANING"
 * - zip (optional): ZIP code for future geo-specific policies
 * 
 * Response: Active policy with generated HTML summaries
 * Cache-Control: max-age=300 (5 minutes)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const service = searchParams.get('service')
    const zip = searchParams.get('zip') // Reserved for future geo-specific policies
    
    // Validate service parameter
    if (!service) {
      return NextResponse.json(
        { 
          error: 'Missing required parameter: service',
          code: 'INVALID_PARAMS',
          message: 'Please specify service type (LAUNDRY or CLEANING)'
        },
        { status: 400 }
      )
    }
    
    if (service !== 'LAUNDRY' && service !== 'CLEANING') {
      return NextResponse.json(
        { 
          error: 'Invalid service type',
          code: 'INVALID_SERVICE',
          message: 'Service must be either LAUNDRY or CLEANING'
        },
        { status: 400 }
      )
    }
    
    // Fetch active policy from database
    const db = getServiceClient()
    const { data: policy, error: dbError } = await db
      .from('cancellation_policies')
      .select('*')
      .eq('service_type', service)
      .eq('active', true)
      .single()
    
    if (dbError) {
      console.error('[GET /api/policies/cancellation] Database error:', dbError)
      
      // Handle not found specifically
      if (dbError.code === 'PGRST116') {
        return NextResponse.json(
          { 
            error: 'No active policy found',
            code: 'POLICY_NOT_FOUND',
            message: `No active cancellation policy configured for ${service}`
          },
          { status: 404 }
        )
      }
      
      throw dbError
    }
    
    if (!policy) {
      return NextResponse.json(
        { 
          error: 'No active policy found',
          code: 'POLICY_NOT_FOUND',
          message: `No active cancellation policy configured for ${service}`
        },
        { status: 404 }
      )
    }
    
    // Generate HTML summaries
    const summary_html = generateSummary(policy)
    const details_html = generateDetails(policy)
    
    // Build response
    const response: PolicyResponse = {
      id: policy.id,
      version: policy.version,
      service_type: policy.service_type,
      notice_hours: policy.notice_hours,
      cancellation_fee_percent: policy.cancellation_fee_percent,
      reschedule_notice_hours: policy.reschedule_notice_hours,
      reschedule_fee_percent: policy.reschedule_fee_percent,
      allow_cancellation: policy.allow_cancellation,
      allow_rescheduling: policy.allow_rescheduling,
      summary_html,
      details_html,
    }
    
    // Return with caching headers
    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutes
      },
    })
  } catch (error) {
    console.error('[GET /api/policies/cancellation] Error:', error)
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}

/**
 * Generate user-friendly summary HTML for the policy
 */
function generateSummary(policy: CancellationPolicy): string {
  if (policy.service_type === 'LAUNDRY') {
    return '<p>Free cancellation anytime before pickup. Free rescheduling.</p>'
  }
  
  // CLEANING policies
  if (policy.notice_hours === 0) {
    return '<p>Free cancellation and rescheduling anytime.</p>'
  }
  
  const feePercent = Math.round(policy.cancellation_fee_percent * 100)
  const hours = policy.notice_hours
  
  return `
    <p><strong>Free cancellation</strong> with ${hours}+ hours notice.</p>
    <p><strong>${feePercent}% fee</strong> if cancelled within ${hours} hours.</p>
    <p><strong>Free rescheduling</strong> with ${hours}+ hours notice.</p>
  `.trim()
}

/**
 * Generate detailed policy information HTML
 */
function generateDetails(policy: CancellationPolicy): string {
  const feePercent = Math.round(policy.cancellation_fee_percent * 100)
  const rescheduleFeePercent = Math.round(policy.reschedule_fee_percent * 100)
  const hours = policy.notice_hours
  
  if (policy.service_type === 'LAUNDRY') {
    return `
      <div class="policy-details">
        <h4>Laundry Service Policy</h4>
        <ul>
          <li><strong>Cancellation:</strong> Free at any time before pickup</li>
          <li><strong>Rescheduling:</strong> Free, contact us anytime</li>
          <li><strong>No Fees:</strong> We understand plans change!</li>
        </ul>
        <p class="text-sm text-gray-600 mt-2">
          Since payment is collected after service completion, you can cancel 
          or reschedule your laundry pickup at any time without penalty.
        </p>
      </div>
    `.trim()
  }
  
  // CLEANING policies
  const cancelSection = policy.allow_cancellation
    ? `
      <li>
        <strong>Cancellation:</strong> 
        ${hours > 0 
          ? `Free with ${hours}+ hours notice. ${feePercent}% fee if within ${hours} hours.`
          : 'Free at any time'
        }
      </li>
    `
    : '<li><strong>Cancellation:</strong> Not allowed once booking is confirmed</li>'
  
  const rescheduleSection = policy.allow_rescheduling
    ? `
      <li>
        <strong>Rescheduling:</strong> 
        ${policy.reschedule_notice_hours > 0
          ? `Free with ${policy.reschedule_notice_hours}+ hours notice. ${rescheduleFeePercent}% fee if within ${policy.reschedule_notice_hours} hours.`
          : 'Free at any time'
        }
      </li>
    `
    : '<li><strong>Rescheduling:</strong> Not allowed once booking is confirmed</li>'
  
  return `
    <div class="policy-details">
      <h4>Cleaning Service Policy</h4>
      <ul>
        ${cancelSection}
        ${rescheduleSection}
        <li><strong>Notice Period:</strong> ${hours} hours before scheduled service</li>
      </ul>
      <p class="text-sm text-gray-600 mt-2">
        ${hours > 0
          ? `To avoid cancellation fees, please cancel or reschedule at least ${hours} hours 
             before your scheduled cleaning time. This allows us to offer the slot to other customers.`
          : 'You can cancel or reschedule at any time without fees.'
        }
      </p>
      <p class="text-sm text-gray-600 mt-2">
        <strong>Refunds:</strong> Cancellation fees are deducted from your refund. 
        The remaining balance will be returned to your original payment method within 5-10 business days.
      </p>
    </div>
  `.trim()
}
