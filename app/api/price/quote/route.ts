import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { quoteLaundry, quoteCleaning } from '@/lib/pricing'
import { validateZipCode } from '@/lib/capacity'
import { ValidationError, handleApiError } from '@/lib/errors'

const laundrySchema = z.object({
  service: z.literal('LAUNDRY'),
  zip: z.string().length(5),
  lbs: z.number().min(1).max(200),
  addons: z.array(z.string()).optional(),
})

const cleaningSchema = z.object({
  service: z.literal('CLEANING'),
  zip: z.string().length(5),
  bedrooms: z.number().min(0).max(5),
  bathrooms: z.number().min(1).max(5),
  deep: z.boolean().optional(),
  addons: z.array(z.string()).optional(),
  frequency: z.enum(['oneTime', 'weekly', 'biweekly', 'monthly']).optional(),
  visitsCompleted: z.number().min(0).optional(),
  firstVisitDeep: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    console.log('[API] POST /api/price/quote - Starting')
    const body = await request.json()
    console.log('[API] Request body:', JSON.stringify(body))
    
    // Validate service type
    if (!body.service || !['LAUNDRY', 'CLEANING'].includes(body.service)) {
      console.error('[API] Invalid service type:', body.service)
      throw new ValidationError('Invalid service type')
    }
    
    // Validate ZIP code
    if (!validateZipCode(body.zip)) {
      console.error('[API] Invalid ZIP code:', body.zip)
      throw new ValidationError(
        `Service not available in ZIP code ${body.zip}. Currently serving Harlem (10026, 10027, 10030).`
      )
    }
    
    console.log('[API] Validation passed, calculating quote...')
    
    let quote
    
    if (body.service === 'LAUNDRY') {
      const params = laundrySchema.parse(body)
      console.log('[API] Calling quoteLaundry with:', params)
      quote = await quoteLaundry({
        zip: params.zip,
        lbs: params.lbs,
        addons: params.addons,
      })
    } else {
      const params = cleaningSchema.parse(body)
      console.log('[API] Calling quoteCleaning with:', params)
      quote = await quoteCleaning({
        zip: params.zip,
        bedrooms: params.bedrooms,
        bathrooms: params.bathrooms,
        deep: params.deep,
        addons: params.addons,
        frequency: params.frequency,
        visitsCompleted: params.visitsCompleted,
        firstVisitDeep: params.firstVisitDeep,
      })
    }
    
    console.log('[API] Quote calculated successfully:', quote)
    return NextResponse.json(quote)
  } catch (error) {
    console.error('[API] Error occurred:', error)
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    if (error instanceof z.ZodError) {
      console.error('[API] Zod validation error:', error.errors)
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    const apiError = handleApiError(error)
    console.error('[API] Handled error:', apiError)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}
