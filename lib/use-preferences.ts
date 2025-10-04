'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './auth-context'

export interface UserPreferences {
  last_service?: 'LAUNDRY' | 'CLEANING'
  last_address_id?: string
  laundry?: {
    default_weight?: number
    default_addons?: string[]
    detergent_preference?: string
    water_temp?: string
    folding_style?: string
  }
  cleaning?: {
    default_bedrooms?: number
    default_bathrooms?: number
    default_deep?: boolean
    default_addons?: string[]
    supplies_preference?: string
    pets?: boolean
    shoes_off?: boolean
    special_surfaces?: string[]
  }
}

export function usePreferences() {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/preferences')
        if (response.ok) {
          const data = await response.json()
          setPreferences(data.preferences || {})
        }
      } catch (err) {
        console.error('Failed to fetch preferences:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPreferences()
  }, [user])

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user) return

    try {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences || {})
      }
    } catch (err) {
      console.error('Failed to update preferences:', err)
    }
  }

  return {
    preferences,
    loading,
    updatePreferences
  }
}
