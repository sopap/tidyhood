import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'

// Force dynamic rendering (uses cookies for auth)
export const dynamic = 'force-dynamic'

// GET /api/preferences - Fetch user preferences
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = getServiceClient()
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching preferences:', error)
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      preferences: profile?.preferences || {}
    })
  } catch (error) {
    console.error('Preferences GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/preferences - Update user preferences
export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth()
    const updates = await request.json()
    const supabase = getServiceClient()

    // Get current preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    // Merge with new updates
    const currentPrefs = profile?.preferences || {}
    const updatedPrefs = {
      ...currentPrefs,
      ...updates,
      // Deep merge for nested objects
      laundry: {
        ...(currentPrefs.laundry || {}),
        ...(updates.laundry || {})
      },
      cleaning: {
        ...(currentPrefs.cleaning || {}),
        ...(updates.cleaning || {})
      }
    }

    // Update preferences
    const { data, error } = await supabase
      .from('profiles')
      .update({ preferences: updatedPrefs })
      .eq('id', user.id)
      .select('preferences')
      .single()

    if (error) {
      console.error('Error updating preferences:', error)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      preferences: data?.preferences || {}
    })
  } catch (error) {
    console.error('Preferences PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
