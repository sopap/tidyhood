/**
 * Database Client Configuration
 * 
 * Provides Supabase client instances with proper configuration.
 * 
 * Query Timeouts:
 * - Supabase handles timeouts at the project level (default: 8 seconds)
 * - Configure in Supabase Dashboard → Settings → API → Statement Timeout
 * - Recommended: 5000ms for API queries, 30000ms for background jobs
 * 
 * Best Practices:
 * - Use getServiceClient() for server-side operations with elevated privileges
 * - Always handle timeout errors gracefully
 * - Add indexes for slow queries
 * - Monitor query performance in Supabase Dashboard
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Default timeout for database operations (milliseconds)
 * This is a client-side timeout, Supabase also has server-side timeouts
 */
const DEFAULT_QUERY_TIMEOUT = 10000 // 10 seconds

// Client for browser/server components
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
    global: {
      headers: {
        'x-client-info': 'tidyhood-web',
      },
    },
  }
)

/**
 * Admin client with service role (server-side only)
 * Use this for operations that require elevated privileges
 */
export function getServiceClient(): SupabaseClient {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          'x-client-info': 'tidyhood-server',
        },
      },
    }
  )
}

/**
 * Execute a query with timeout protection
 * Wraps Supabase queries with a client-side timeout
 * 
 * @param queryFn The query function to execute
 * @param timeoutMs Timeout in milliseconds (default: 10000)
 * @returns Promise that resolves with query result or rejects on timeout
 * 
 * @example
 * const result = await withTimeout(
 *   () => supabase.from('orders').select('*').eq('id', orderId).single(),
 *   5000
 * )
 */
export async function withTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = DEFAULT_QUERY_TIMEOUT
): Promise<T> {
  return Promise.race([
    queryFn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Query timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ])
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
