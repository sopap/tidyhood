import { getServiceClient } from './db'
import { getNYTime, isSlotWithin6Hours, formatTimeWindow, isSlotInPast } from './timezone'

export interface TimeSlot {
  partner_id: string
  partner_name: string
  slot_start: string
  slot_end: string
  available_units: number
  max_units: number
  service_type: 'LAUNDRY' | 'CLEANING'
}

/**
 * Generate time slot windows for a given date (Mon-Sat, 10am-10pm, 2-hour windows)
 */
function generateTimeSlotWindows(date: string): Array<{ start: string; end: string }> {
  const slots: Array<{ start: string; end: string }> = []
  const [year, month, day] = date.split('-').map(Number)
  
  // Check if it's Sunday (skip)
  const dateObj = new Date(year, month - 1, day)
  if (dateObj.getDay() === 0) {
    return []
  }
  
  // Generate 6 time slots from 10am to 10pm (2-hour windows)
  const hours = [10, 12, 14, 16, 18, 20]
  
  for (const hour of hours) {
    const startDate = new Date(year, month - 1, day, hour, 0, 0)
    const endDate = new Date(year, month - 1, day, hour + 2, 0, 0)
    
    slots.push({
      start: startDate.toISOString(),
      end: endDate.toISOString()
    })
  }
  
  return slots
}

/**
 * Ensure delivery slots exist for a given date (on-demand generation)
 * Creates them if missing - idempotent and safe to call multiple times
 */
export async function ensureSlotsExist(
  serviceType: 'LAUNDRY' | 'CLEANING',
  zip: string,
  date: string
): Promise<void> {
  const db = getServiceClient()
  
  // Parse date to check day of week
  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  
  // Skip Sundays - no delivery on Sundays
  if (dateObj.getDay() === 0) {
    return
  }
  
  // Check if slots already exist for this date
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)
  
  const { data: existingSlots, error: checkError } = await db
    .from('capacity_calendar')
    .select('id')
    .eq('service_type', serviceType)
    .gte('slot_start', startOfDay.toISOString())
    .lte('slot_start', endOfDay.toISOString())
    .limit(1)
  
  if (checkError) {
    console.error('[ensureSlotsExist] Error checking existing slots:', checkError)
    throw checkError
  }
  
  // If slots exist, no need to create more
  if (existingSlots && existingSlots.length > 0) {
    console.log(`[ensureSlotsExist] Slots already exist for ${serviceType} on ${date}`)
    return
  }
  
  // Get active partners serving this ZIP code
  const { data: partners, error: partnersError } = await db
    .from('partners')
    .select('id, name')
    .eq('service_type', serviceType)
    .eq('active', true)
  
  if (partnersError) {
    console.error('[ensureSlotsExist] Error fetching partners:', partnersError)
    throw partnersError
  }
  
  if (!partners || partners.length === 0) {
    console.log(`[ensureSlotsExist] No active partners found for ${serviceType} in ZIP ${zip}`)
    return
  }
  
  // Generate time slots for the date
  const timeSlots = generateTimeSlotWindows(date)
  
  if (timeSlots.length === 0) {
    console.log(`[ensureSlotsExist] No time slots to generate for ${date}`)
    return
  }
  
  // Create slots for each partner and each time window
  const slotsToInsert = []
  
  for (const partner of partners) {
    for (const slot of timeSlots) {
      slotsToInsert.push({
        partner_id: partner.id,
        service_type: serviceType,
        slot_start: slot.start,
        slot_end: slot.end,
        max_units: 10, // Default capacity per 2-hour window
        reserved_units: 0
      })
    }
  }
  
  // Batch insert all slots (ignore conflicts if slots were created concurrently)
  const { error: insertError } = await db
    .from('capacity_calendar')
    .insert(slotsToInsert)
    .select()
  
  if (insertError) {
    // Ignore duplicate key errors (23505) - slots may have been created by concurrent request
    if (insertError.code === '23505') {
      console.log(`[ensureSlotsExist] Slots already created by concurrent request for ${date}`)
      return
    }
    console.error('[ensureSlotsExist] Error inserting slots:', insertError)
    throw insertError
  }
  
  console.log(`[ensureSlotsExist] Created ${slotsToInsert.length} slots for ${serviceType} on ${date}`)
}


/**
 * Get available time slots for a service type, zip, and date
 */
export async function getAvailableSlots(
  serviceType: 'LAUNDRY' | 'CLEANING',
  zip: string,
  date: string
): Promise<TimeSlot[]> {
  const db = getServiceClient()
  
  // Parse date in local timezone (browser's timezone, which should be ET)
  // date format is YYYY-MM-DD
  const [year, month, day] = date.split('-').map(Number)
  
  // Create Date objects at midnight and end-of-day in local time
  // toISOString() will automatically convert to UTC for the database query
  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)
  
  // Get partners serving this zip
  const { data: partners, error: partnersError } = await db
    .from('partners')
    .select('id, name')
    .eq('service_type', serviceType)
    .eq('active', true)
  
  if (partnersError) throw partnersError
  if (!partners || partners.length === 0) {
    return []
  }
  
  const partnerIds = partners.map(p => p.id)
  
  // Get capacity calendar for these partners
  const { data: slots, error: slotsError } = await db
    .from('capacity_calendar')
    .select('*')
    .in('partner_id', partnerIds)
    .eq('service_type', serviceType)
    .gte('slot_start', startOfDay.toISOString())
    .lte('slot_start', endOfDay.toISOString())
    .order('slot_start', { ascending: true })
  
  if (slotsError) throw slotsError
  if (!slots) return []
  
  // Filter out full slots and slots within 6 hours or in the past
  const now = getNYTime()
  const availableSlots = slots.filter(slot => {
    const slotTime = new Date(slot.slot_start)
    const isFull = slot.reserved_units >= slot.max_units
    const isInPast = slotTime <= now
    const isTooSoon = isSlotWithin6Hours(slot.slot_start)
    
    return !isFull && !isInPast && !isTooSoon
  })
  
  // Consolidate slots by time window (hide partner info)
  const consolidatedMap = new Map<string, TimeSlot>()
  
  for (const slot of availableSlots) {
    const timeKey = `${slot.slot_start}-${slot.slot_end}`
    
    if (consolidatedMap.has(timeKey)) {
      // Add capacity to existing time slot
      const existing = consolidatedMap.get(timeKey)!
      existing.available_units += (slot.max_units - slot.reserved_units)
      existing.max_units += slot.max_units
    } else {
      // Create new consolidated slot
      consolidatedMap.set(timeKey, {
        partner_id: slot.partner_id, // Keep first partner_id for booking
        partner_name: 'Available', // Hide partner name
        slot_start: slot.slot_start,
        slot_end: slot.slot_end,
        available_units: slot.max_units - slot.reserved_units,
        max_units: slot.max_units,
        service_type: slot.service_type as 'LAUNDRY' | 'CLEANING',
      })
    }
  }
  
  return Array.from(consolidatedMap.values())
}

/**
 * Reserve capacity for an order
 */
export async function reserveCapacity(
  partnerId: string,
  serviceType: 'LAUNDRY' | 'CLEANING',
  slotStart: string,
  units: number
): Promise<boolean> {
  const db = getServiceClient()
  
  // Get current capacity
  const { data: slot, error: fetchError } = await db
    .from('capacity_calendar')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('service_type', serviceType)
    .eq('slot_start', slotStart)
    .single()
  
  if (fetchError || !slot) {
    throw new Error('Slot not found')
  }
  
  // Check if capacity is available
  if (slot.reserved_units + units > slot.max_units) {
    return false
  }
  
  // Reserve capacity
  const { error: updateError } = await db
    .from('capacity_calendar')
    .update({ reserved_units: slot.reserved_units + units })
    .eq('id', slot.id)
  
  if (updateError) throw updateError
  
  return true
}

/**
 * Release capacity when an order is canceled
 */
export async function releaseCapacity(
  partnerId: string,
  serviceType: 'LAUNDRY' | 'CLEANING',
  slotStart: string,
  units: number
): Promise<void> {
  const db = getServiceClient()
  
  const { data: slot, error: fetchError } = await db
    .from('capacity_calendar')
    .select('*')
    .eq('partner_id', partnerId)
    .eq('service_type', serviceType)
    .eq('slot_start', slotStart)
    .single()
  
  if (fetchError || !slot) {
    throw new Error('Slot not found')
  }
  
  // Release capacity (ensure we don't go below 0)
  const newReserved = Math.max(0, slot.reserved_units - units)
  
  const { error: updateError } = await db
    .from('capacity_calendar')
    .update({ reserved_units: newReserved })
    .eq('id', slot.id)
  
  if (updateError) throw updateError
}

/**
 * Calculate required units for a cleaning order
 */
export function calculateCleaningMinutes(
  bedrooms: number,
  bathrooms: number,
  deep: boolean,
  addons: string[]
): number {
  // Base minutes by unit size
  let baseMinutes = 60 // Studio
  if (bedrooms === 1) baseMinutes = 90
  else if (bedrooms === 2) baseMinutes = 120
  else if (bedrooms === 3) baseMinutes = 150
  else if (bedrooms >= 4) baseMinutes = 180
  
  // Add time for bathrooms (after first)
  baseMinutes += Math.max(0, bathrooms - 1) * 15
  
  // Deep clean takes 1.5x longer
  if (deep) {
    baseMinutes = Math.round(baseMinutes * 1.5)
  }
  
  // Add time for addons
  const addonMinutes: Record<string, number> = {
    'CLN_FRIDGE_INSIDE': 30,
    'CLN_OVEN_INSIDE': 30,
    'CLN_WINDOWS_INSIDE': 45,
    'CLN_LAUNDRY_WASH': 60,
    'CLN_EXTRA_BATHROOM': 20,
  }
  
  for (const addon of addons) {
    baseMinutes += addonMinutes[addon] || 0
  }
  
  return baseMinutes
}

/**
 * Validate ZIP code is in allowed areas
 */
export function validateZipCode(zip: string): boolean {
  // TEMPORARY FIX: Hardcoding allowed ZIPs due to Vercel env var issues
  const allowedZipsEnv = '10025,10026,10027,10029,10030,10031,10032,10035,10037,10039,10128'
  console.log('[validateZipCode] NEXT_PUBLIC_ALLOWED_ZIPS:', allowedZipsEnv)
  const allowedZips = allowedZipsEnv.split(',').map(z => z.trim()).filter(z => z.length > 0)
  console.log('[validateZipCode] Parsed allowed ZIPs:', allowedZips)
  console.log('[validateZipCode] Checking ZIP:', zip)
  const isValid = allowedZips.includes(zip)
  console.log('[validateZipCode] Is valid:', isValid)
  return isValid
}

/**
 * Format slot time for display (uses NY ET timezone)
 */
export function formatSlotTime(slotStart: string, slotEnd: string): string {
  return formatTimeWindow(slotStart, slotEnd)
}
