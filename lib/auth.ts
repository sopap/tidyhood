import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabase } from './db'
import { env } from './env'

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    
    const supabaseServer = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // Cookie setting can fail after headers are sent - ignore in these cases
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // Cookie removal can fail after headers are sent - ignore in these cases
            }
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseServer.auth.getUser()
    
    if (authError) {
      console.error('[getCurrentUser] Auth error:', authError)
      return null
    }
    
    if (!user) {
      return null
    }

    // Fetch profile with role
    const { data: profile, error: profileError } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[getCurrentUser] Profile fetch error:', profileError)
      // Continue with user data even if profile fetch fails
    }

    return {
      ...user,
      role: profile?.role || 'user',
      full_name: profile?.full_name,
      phone: profile?.phone,
    }
  } catch (error) {
    console.error('[getCurrentUser] Unexpected error:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    console.error('[requireAuth] No authenticated user found')
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireRole(role: 'user' | 'partner' | 'admin') {
  const user = await requireAuth()
  if (user.role !== role && user.role !== 'admin') {
    throw new Error(`Forbidden: requires ${role} role`)
  }
  return user
}

export async function requireAdmin() {
  return requireRole('admin')
}

export async function requirePartner() {
  return requireRole('partner')
}

// Client-side hook-like function
export async function signUp(email: string, password: string, fullName: string, phone: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone,
      },
    },
  })

  if (error) throw error

  // Create profile
  if (data.user) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      phone,
      role: 'user',
    })
  }

  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
