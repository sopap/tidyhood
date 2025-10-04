import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Client for browser/server components
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Admin client with service role (server-side only)
export function getServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing env.SUPABASE_SERVICE_ROLE_KEY')
  }
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          role: 'user' | 'partner' | 'admin'
          created_at: string
          updated_at: string
        }
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          service_type: 'LAUNDRY' | 'CLEANING'
          partner_id: string | null
          building_id: string | null
          slot_start: string
          slot_end: string
          status: string
          subtotal_cents: number
          tax_cents: number
          delivery_cents: number
          total_cents: number
          credit_cents: number
          payment_id: string | null
          payment_method: string | null
          idempotency_key: string | null
          source_channel: string
          late_minutes: number
          cancellation_code: string | null
          order_details: any
          address_snapshot: any
          created_at: string
          updated_at: string
        }
      }
      partners: {
        Row: {
          id: string
          name: string
          service_type: 'LAUNDRY' | 'CLEANING'
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          payout_percent: number
          max_orders_per_slot: number
          max_minutes_per_slot: number
          scorecard_json: any
          coi_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
      }
      capacity_calendar: {
        Row: {
          id: string
          partner_id: string
          service_type: 'LAUNDRY' | 'CLEANING'
          slot_start: string
          slot_end: string
          max_units: number
          reserved_units: number
          created_at: string
        }
      }
      pricing_rules: {
        Row: {
          id: string
          service_type: 'LAUNDRY' | 'CLEANING'
          geozone: string | null
          unit_type: 'PER_LB' | 'FLAT' | 'ADDON' | 'MULTIPLIER' | 'DELIVERY'
          unit_key: string
          unit_price_cents: number
          multiplier: number
          priority: number
          active: boolean
          created_at: string
        }
      }
    }
  }
}
