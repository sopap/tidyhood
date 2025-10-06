import { getServiceClient } from './db'

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
 * Get available time slots for a service type, zip, and date
 */
export async function getAvailableSlots(
  serviceType: 'LAUNDRY' | 'CLEANING',
  zip: string,
  date: string
): Promise<TimeSlot[]> {
  const db = getServiceClient()
  
  // Parse date to get date range
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)
  
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
  
  // Filter out full slots
  const availableSlots = slots.filter(slot => slot.reserved_units < slot.max_units)
  
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
 * Check if a slot is in the past
 */
export function isSlotInPast(slotStart: string): boolean {
  return new Date(slotStart) < new Date()
}

/**
 * Format slot time for display
 */
export function formatSlotTime(slotStart: string, slotEnd: string): string {
  const start = new Date(slotStart)
  const end = new Date(slotEnd)
  
  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  const endTime = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  
  return `${startTime} - ${endTime}`
}
