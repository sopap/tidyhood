import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAvailableSlots } from '@/lib/capacity'
import { handleApiError } from '@/lib/errors'

const querySchema = z.object({
  service: z.enum(['LAUNDRY', 'CLEANING']),
  zip: z.string().length(5),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    const params = querySchema.parse({
      service: searchParams.get('service'),
      zip: searchParams.get('zip'),
      date: searchParams.get('date'),
    })
    
    const slots = await getAvailableSlots(
      params.service,
      params.zip,
      params.date
    )
    
    return NextResponse.json({ slots })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
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
