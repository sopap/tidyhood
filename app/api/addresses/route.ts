import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'

// GET /api/addresses - Fetch user's saved addresses
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = getServiceClient()

    const { data: addresses, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching addresses:', error)
      return NextResponse.json(
        { error: 'Failed to fetch addresses' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      addresses: addresses || []
    })
  } catch (error) {
    console.error('Addresses GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/addresses - Create a new address
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const supabase = getServiceClient()

    const { line1, line2, city, zip, buzzer, notes, is_default } = body

    if (!line1 || !city || !zip) {
      return NextResponse.json(
        { error: 'Missing required fields: line1, city, zip' },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults
    if (is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
    }

    const { data: address, error } = await supabase
      .from('addresses')
      .insert({
        user_id: user.id,
        line1,
        line2,
        city,
        zip,
        buzzer,
        notes,
        is_default: is_default || false,
        last_used_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating address:', error)
      return NextResponse.json(
        { error: 'Failed to create address' },
        { status: 500 }
      )
    }

    return NextResponse.json({ address }, { status: 201 })
  } catch (error) {
    console.error('Addresses POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
