'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabaseClient } from './supabase-client'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async (maxRetries = 3, timeoutMs = 10000) => {
    let attempts = 0
    
    while (attempts < maxRetries) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        )
        
        // Race between getUser and timeout
        const userPromise = supabaseClient.auth.getUser()
        const { data: { user } } = await Promise.race([userPromise, timeoutPromise]) as any
        
        setUser(user)
        return // Success - exit retry loop
      } catch (error) {
        attempts++
        
        if (error instanceof Error && error.message === 'Timeout') {
          console.warn(`RefreshUser timeout (attempt ${attempts}/${maxRetries})`)
        } else {
          console.error(`Error fetching user (attempt ${attempts}/${maxRetries}):`, error)
        }
        
        if (attempts >= maxRetries) {
          console.error('Error fetching user after max retries')
          setUser(null)
          return
        }
        
        // Exponential backoff before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts))
      }
    }
  }

  useEffect(() => {
    // Get initial session
    refreshUser().finally(() => setLoading(false))

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      await supabaseClient.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
