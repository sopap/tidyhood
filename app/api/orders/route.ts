import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { quoteLaundry, quoteCleaning } from '@/lib/pricing'
import { reserveCapacity, calculateCleaningMinutes, validateZipCode } from '@/lib/capacity'
import { generateLabelCode } from '@/lib/ids'
import { sendOrderCreatedSMS } from '@/lib/sms'
import { ValidationError, ConflictError, handleApiError } from '@/lib/errors'

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic'

/**
 * GET /api/orders - Fetch user's orders with filtering and pagination
 * 
 * Query Parameters:
 * - limit: number (1-100, default: 50) - Number of orders per page
 * - cursor: string (optional) - Cursor for pagination (order ID)
 * - status: string (optional) - Filter by order status
 * - service_type: 'LAUNDRY' | 'CLEANING' (optional) - Filter by service type
 * - from_date: ISO string (optional) - Filter orders from this date
 * - to_date: ISO string (optional) - Filter orders until this date
 * - sort: 'created_at' | 'slot_start' (default: 'created_at') - Sort field
 * - order: 'asc' | 'desc' (default: 'desc') - Sort order
 * 
 * Response includes pagination metadata for cursor-based navigation
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const db = getServiceClient()
    
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get('limit') || '50')),
      100
    )
    const cursor = searchParams.get('cursor')
    const statusFilter = searchParams.get('status')
    const serviceTypeFilter = searchParams.get('service_type')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const sortField = searchParams.get('sort') === 'slot_start' ? 'slot_start' : 'created_at'
    const sortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc'
    
    // Build query
    let query = db
      .from('orders')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
    
    // Apply filters
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }
    
    if (serviceTypeFilter && (serviceTypeFilter === 'LAUNDRY' || serviceTypeFilter === 'CLEANING')) {
      query = query.eq('service_type', serviceTypeFilter)
    }
    
    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }
    
    if (toDate) {
      query = query.lte('created_at', toDate)
    }
    
    // Apply cursor-based pagination
    if (cursor) {
      // Cursor pagination: fetch orders after/before the cursor
      if (sortOrder === 'desc') {
        query = query.lt(sortField, cursor)
      } else {
        query = query.gt(sortField, cursor)
      }
    }
    
    // Apply sorting and limit
    query = query.order(sortField, { ascending: sortOrder === 'asc' })
    query = query.limit(limit + 1) // Fetch one extra to determine if there's a next page
    
    const { data: orders, error, count } = await query
    
    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }
    
    // Determine if there are more pages
    const hasMore = orders ? orders.length > limit : false
    const returnOrders = hasMore ? orders.slice(0, limit) : orders || []
    
    // Generate next cursor if there are more results
    const nextCursor = hasMore && returnOrders.length > 0
      ? returnOrders[returnOrders.length - 1][sortField]
      : null
    
    return NextResponse.json({
      orders: returnOrders,
      pagination: {
        limit,
        hasMore,
        nextCursor,
        total: count || 0,
      },
    })
  } catch (error) {
    console.error('Orders GET error:', error)
    const apiError = handleApiError(error)
    return NextResponse.json(
      { error: apiError.error, code: apiError.code },
      { status: apiError.statusCode }
    )
  }
}

const createOrderSchema = z.object({
  service_type: z.enum(['LAUNDRY', 'CLEANING']),
  phone: z.string().optional(),
  slot: z.object({
    partner_id: z.string().uuid(),
    slot_start: z.string(),
    slot_end: z.string(),
  }),
  delivery_slot: z.object({
    slot_start: z.string(),
    slot_end: z.string(),
  }).optional(),
  address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    zip: z.string().length(5),
    buzzer: z.string().optional(),
    notes: z.string().optional(),
  }),
  details: z.object({
    serviceType: z.enum(['washFold', 'dryClean', 'mixed']).optional(), // For LAUNDRY orders
    weightTier: z.enum(['small', 'medium', 'large']).optional(), // For washFold/mixed
    lbs: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    deep: z.boolean().optional(),
    addons: z.array(z.string()).optional(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    console.log('[POST /api/orders] Starting order creation')
    const user = await requireAuth()
    console.log('[POST /api/orders] User authenticated:', user.id)
    const body = await request.json()
    console.log('[POST /api/orders] Request body:', JSON.stringify(body, null, 2))
    
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
    console.log('[POST /api/orders] Calculating pricing...')
    let pricing
    let units = 1 // For laundry, 1 order = 1 unit
    
    if (params.service_type === 'LAUNDRY') {
      const serviceType = params.details.serviceType || 'washFold'; // Default to washFold for backward compatibility
      
      // Validate based on service type
      if (serviceType === 'washFold' || serviceType === 'mixed') {
        if (!params.details.weightTier && !params.details.lbs) {
          throw new ValidationError('Weight tier or lbs required for wash & fold orders');
        }
        // Convert weight tier to lbs if needed
        if (params.details.weightTier && !params.details.lbs) {
          const tierToLbs: Record<string, number> = { small: 15, medium: 25, large: 35 };
          params.details.lbs = tierToLbs[params.details.weightTier];
        }
      }
      // For dryClean, no weight validation needed - will be quoted after inspection
      
      pricing = await quoteLaundry({
        zip: params.address.zip,
        lbs: params.details.lbs || 0, // 0 for dry clean only orders
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
    
    // Reserve capacity
    console.log('[POST /api/orders] Reserving capacity...', {
      partner_id: params.slot.partner_id,
      service_type: params.service_type,
      slot_start: params.slot.slot_start,
      units
    })
    const reserved = await reserveCapacity(
      params.slot.partner_id,
      params.service_type,
      params.slot.slot_start,
      units
    )
    console.log('[POST /api/orders] Capacity reserved:', reserved)
    
    if (!reserved) {
      throw new ConflictError('Selected time slot is no longer available', 'SLOT_FULL')
    }
    
    // Create order
    console.log('[POST /api/orders] Creating order in database...')
    
    // Set initial status based on service type
    // LAUNDRY: pay after pickup → pending_pickup
    // CLEANING: pay upfront → starts as pending, moves to paid_processing after payment
    const initialStatus = params.service_type === 'LAUNDRY' ? 'pending_pickup' : 'pending'
    
    const orderData = {
        user_id: user.id,
        service_type: params.service_type,
        partner_id: params.slot.partner_id,
        slot_start: params.slot.slot_start,
        slot_end: params.slot.slot_end,
        delivery_slot_start: params.delivery_slot?.slot_start || null,
        delivery_slot_end: params.delivery_slot?.slot_end || null,
        status: initialStatus,
        subtotal_cents: pricing.subtotal_cents,
        tax_cents: pricing.tax_cents,
        delivery_cents: pricing.delivery_cents,
        total_cents: pricing.total_cents,
        idempotency_key: idempotencyKey,
        order_details: params.details,
        address_snapshot: {
          ...params.address,
          phone: params.phone || user.phone || undefined
        },
      }
    console.log('[POST /api/orders] Order data:', JSON.stringify(orderData, null, 2))
    
    const { data: order, error: orderError } = await db
      .from('orders')
      .insert(orderData)
      .select()
      .single()
    
    if (orderError) {
      console.error('[POST /api/orders] Database error creating order:', orderError)
      throw orderError
    }
    console.log('[POST /api/orders] Order created successfully:', order.id)
    
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
      const serviceType = params.details.serviceType || 'washFold';
      const bags = []
      
      if (serviceType === 'washFold' || serviceType === 'mixed') {
        // Create W&F bags based on weight
        const numWFBags = Math.ceil((params.details.lbs || 0) / 20); // One bag per 20 lbs
        for (let i = 0; i < Math.max(1, numWFBags); i++) {
          bags.push({
            order_id: order.id,
            label_code: generateLabelCode(),
            service_type: 'LAUNDRY',
          });
        }
      }
      
      if (serviceType === 'dryClean' || serviceType === 'mixed') {
        // Create at least one bag for dry clean items (will be itemized after inspection)
        bags.push({
          order_id: order.id,
          label_code: generateLabelCode(),
          service_type: 'LAUNDRY',
        });
      }
      
      if (bags.length > 0) {
        await db.from('bags').insert(bags);
      }
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
    
    console.log('[POST /api/orders] Order creation complete')
    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('[POST /api/orders] Error:', error)
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
