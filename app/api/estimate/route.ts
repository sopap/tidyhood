import { NextRequest, NextResponse } from 'next/server';
import { estimateLaundry } from '@/lib/estimate';
import { handleApiError } from '@/lib/errors';
import { z } from 'zod';

const estimateSchema = z.object({
  serviceType: z.enum(['washFold', 'dryClean', 'mixed']).optional().default('washFold'),
  weightTier: z.enum(['small', 'medium', 'large']).optional(),
  addons: z.record(z.boolean()).optional(),
  promoCode: z.string().optional(),
  zip: z.string().length(5),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = estimateSchema.parse(body);
    
    const estimate = await estimateLaundry({
      serviceType: validated.serviceType,
      weightTier: validated.weightTier,
      zip: validated.zip,
      addons: validated.addons as any || {},
      promoCode: validated.promoCode,
    });
    
    return NextResponse.json(estimate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    const apiError = handleApiError(error);
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    );
  }
}
