import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { quoteLaundry, quoteCleaning } from '@/lib/pricing'
import { reserveCapacity, calculateCleaningMinutes, validateZipCode } from '@/lib/capacity'
import { generateLabelCode } from '@/lib/ids'
import { sendOrderCreatedSMS } from '@/lib/sms'
import { ValidationError, ConflictError, handleApiError } from '@/lib/errors'

const createOrderSchema = z.object({
  service_type: z.enum(['LAUNDRY', 'CLEANING']),
  slot: z.object({
    partner_id: z.string().uuid(),
    slot_start: z.string(),
    slot_end: z.string(),
  }),
  address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    zip: z.string().length(5),
    buzzer: z.string().optional(),
    notes: z.string().optional(),
  }),
  details: z.object({
    lbs: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    deep: z.boolean().optional(),
    addons: z.array(z.string()).optional(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    // Check for idempotency key
    const idempotencyKey = request.headers.get('idempotency-key')
    if (!idempotencyKey) {
      throw new ValidationError('Missing Idempotency-Key header')
    }
    
    const params = createOrderSchema.parse(body)
    const db = getServiceClient()
    
    // Check if order already exists with this idempotency key
    const { data: existingOrder } = await db
      .from('orders')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .single()
    
    if (existingOrder) {
      return NextResponse.json(existingOrder)
    }
    
    // Validate ZIP code
    if (!validateZipCode(params.address.zip)) {
      throw new ValidationError('Service not available in this area')
    }
    
    // Calculate pricing
    let pricing
    let units = 1 // For laundry, 1 order = 1 unit
    
    if (params.service_type === 'LAUNDRY') {
      if (!params.details.lbs) {
        throw new ValidationError('Weight (lbs) required for laundry orders')
      }
      pricing = await quoteLaundry({
        zip: params.address.zip,
        lbs: params.details.lbs,
        addons: params.details.addons,
      })
    } else {
      if (params.details.bedrooms === undefined || !params.details.bathrooms) {
        throw new ValidationError('Bedrooms and bathrooms required for cleaning orders')
      }
      pricing = await quoteCleaning({
        zip: params.address.zip,
        bedrooms: params.details.bedrooms,
        bathrooms: params.details.bathrooms,
        deep: params.details.deep,
        addons: params.details.addons,
      })
      units = calculateCleaningMinutes(
        params.details.bedrooms,
        params.details.bathrooms,
        params.details.deep || false,
        params.details.addons || []
      )
    }
    
    // Check first order cap
    const { data: orderCount } = await db
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    
    const isFirstOrder = (orderCount || 0) === 0
    const firstOrderCap = parseInt(process.env.FIRST_ORDER_CAP_CENTS || '12000')
    
    if (isFirstOrder && pricing.total_cents > firstOrderCap) {
      throw new ValidationError(
        `First order limited to $${firstOrderCap / 100}. Please contact support for higher amounts.`
      )
    }
    
    // Reserve capacity
    const reserved = await reserveCapacity(
      params.slot.partner_id,
      params.service_type,
      params.slot.slot_start,
      units
    )
    
    if (!reserved) {
      throw new ConflictError('Selected time slot is no longer available', 'SLOT_FULL')
    }
    
    // Create order
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        user_id: user.id,
        service_type: params.service_type,
        partner_id: params.slot.partner_id,
        slot_start: params.slot.slot_start,
        slot_end: params.slot.slot_end,
        status: 'PENDING',
        subtotal_cents: pricing.subtotal_cents,
        tax_cents: pricing.tax_cents,
        delivery_cents: pricing.delivery_cents,
        total_cents: pricing.total_cents,
        idempotency_key: idempotencyKey,
        order_details: params.details,
        address_snapshot: params.address,
      })
      .select()
      .single()
    
    if (orderError) throw orderError
    
    // Create order event
    await db.from('order_events').insert({
      order_id: order.id,
      actor: user.id,
      actor_role: 'user',
      event_type: 'order_created',
      payload_json: { pricing },
    })
    
    // Create bags for laundry orders
    if (params.service_type === 'LAUNDRY') {
      const numBags = Math.ceil((params.details.lbs || 0) / 20) // One bag per 20 lbs
      const bags = []
      
      for (let i = 0; i < Math.max(1, numBags); i++) {
        bags.push({
          order_id: order.id,
          label_code: generateLabelCode(),
          service_type: 'LAUNDRY',
        })
      }
      
      await db.from('bags').insert(bags)
    }
    
    // Create cleaning checklist
    if (params.service_type === 'CLEANING') {
      const rooms = ['Kitchen', 'Bathroom', 'Living Room']
      if (params.details.bedrooms && params.details.bedrooms > 0) {
        for (let i = 1; i <= params.details.bedrooms; i++) {
          rooms.push(`Bedroom ${i}`)
        }
      }
      
      const checklists = rooms.map(room => ({
        order_id: order.id,
        room,
        tasks_json: getDefaultRoomTasks(room),
      }))
      
      await db.from('cleaning_checklist').insert(checklists)
    }
    
    // Send SMS notification
    if (user.phone) {
      await sendOrderCreatedSMS(
        user.phone,
        order.id,
        params.service_type,
        params.slot.slot_start
      )
    }
    
    return NextResponse.json(order, { status: 201 })
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

function getDefaultRoomTasks(room: string): string[] {
  const tasks: Record<string, string[]> = {
    'Kitchen': ['Wipe counters', 'Clean sink', 'Clean stovetop', 'Sweep/mop floor', 'Take out trash'],
    'Bathroom': ['Clean toilet', 'Clean sink', 'Clean shower/tub', 'Wipe mirrors', 'Sweep/mop floor'],
    'Living Room': ['Dust surfaces', 'Vacuum/sweep floor', 'Wipe down furniture', 'Empty trash'],
  }
  
  if (room.startsWith('Bedroom')) {
    return ['Change linens', 'Dust surfaces', 'Vacuum/sweep floor', 'Wipe down furniture', 'Empty trash']
  }
  
  return tasks[room] || ['Clean and organize']
}
