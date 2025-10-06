import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabase } from './db'

export async function getCurrentUser() {
  const cookieStore = await cookies()
  
  const supabaseServer = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: { user } } = await supabaseServer.auth.getUser()
  
  if (!user) {
    return null
  }

  // Fetch profile with role
  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    ...user,
    role: profile?.role || 'user',
    full_name: profile?.full_name,
    phone: profile?.phone,
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
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
