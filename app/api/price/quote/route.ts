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
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate service type
    if (!body.service || !['LAUNDRY', 'CLEANING'].includes(body.service)) {
      throw new ValidationError('Invalid service type')
    }
    
    // Validate ZIP code
    if (!validateZipCode(body.zip)) {
      throw new ValidationError(
        `Service not available in ZIP code ${body.zip}. Currently serving Harlem (10026, 10027, 10030).`
      )
    }
    
    let quote
    
    if (body.service === 'LAUNDRY') {
      const params = laundrySchema.parse(body)
      quote = await quoteLaundry({
        zip: params.zip,
        lbs: params.lbs,
        addons: params.addons,
      })
    } else {
      const params = cleaningSchema.parse(body)
      quote = await quoteCleaning({
        zip: params.zip,
        bedrooms: params.bedrooms,
        bathrooms: params.bathrooms,
        deep: params.deep,
        addons: params.addons,
      })
    }
    
    return NextResponse.json(quote)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      )
    }
    
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}
