import { useState, useEffect } from 'react'

export interface CancellationPolicy {
  id: string
  service_type: 'LAUNDRY' | 'CLEANING'
  notice_hours: number
  cancellation_fee_percent: number
  reschedule_notice_hours: number
  reschedule_fee_percent: number
  allow_cancellation: boolean
  allow_rescheduling: boolean
  active: boolean
  notes?: string
}

interface UseCancellationPolicyReturn {
  policy: CancellationPolicy | null
  loading: boolean
  error: string | null
}

// Cache for policies to avoid repeated API calls
const policyCache = new Map<string, CancellationPolicy>()
let policiesPromise: Promise<CancellationPolicy[]> | null = null

async function fetchPolicies(): Promise<CancellationPolicy[]> {
  // Return existing promise if already fetching
  if (policiesPromise) {
    return policiesPromise
  }

  // Create new fetch promise
  policiesPromise = fetch('/api/admin/settings/policies')
    .then(async (res) => {
      if (!res.ok) {
        throw new Error('Failed to fetch cancellation policies')
      }
      const data = await res.json()
      return data.policies || []
    })
    .finally(() => {
      // Clear promise after completion (success or failure)
      policiesPromise = null
    })

  return policiesPromise
}

/**
 * Hook to fetch and manage cancellation policy data for a specific service type
 * 
 * @param serviceType - The service type (LAUNDRY or CLEANING)
 * @returns Policy data, loading state, and error state
 * 
 * @example
 * ```tsx
 * const { policy, loading, error } = useCancellationPolicy('LAUNDRY')
 * 
 * if (loading) return <div>Loading...</div>
 * if (error) return <div>Error: {error}</div>
 * if (policy) {
 *   return <div>Cancellation fee: {policy.cancellation_fee_percent * 100}%</div>
 * }
 * ```
 */
export function useCancellationPolicy(
  serviceType: 'LAUNDRY' | 'CLEANING'
): UseCancellationPolicyReturn {
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check cache first
    const cached = policyCache.get(serviceType)
    if (cached) {
      setPolicy(cached)
      setLoading(false)
      return
    }

    // Fetch from API
    fetchPolicies()
      .then((policies) => {
        const servicePolicy = policies.find(p => p.service_type === serviceType)
        
        if (servicePolicy) {
          // Cache the policy
          policyCache.set(serviceType, servicePolicy)
          setPolicy(servicePolicy)
        } else {
          setError(`No policy found for ${serviceType}`)
        }
      })
      .catch((err) => {
        console.error('Error fetching cancellation policy:', err)
        setError(err.message || 'Failed to load cancellation policy')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [serviceType])

  return { policy, loading, error }
}

/**
 * Clear the policy cache (useful after policy updates)
 */
export function clearPolicyCache() {
  policyCache.clear()
}
