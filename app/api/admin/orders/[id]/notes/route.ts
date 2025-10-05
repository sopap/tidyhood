import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { logAudit } from '@/lib/audit'

// Get all notes for an order
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const db = getServiceClient()
    const orderId = params.id

    const { data: notes, error } = await db
      .from('admin_notes')
      .select(`
        *,
        profiles:admin_id(email)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ notes: notes || [] })
  } catch (error) {
    console.error('Get notes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

// Add a new note to an order
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { note } = await request.json()

    if (!note || !note.trim()) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    const db = getServiceClient()
    const orderId = params.id

    // Verify order exists
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Create note
    const { data: newNote, error: noteError } = await db
      .from('admin_notes')
      .insert({
        order_id: orderId,
        admin_id: user.id,
        note: note.trim()
      })
      .select(`
        *,
        profiles:admin_id(email)
      `)
      .single()

    if (noteError) throw noteError

    // Log audit trail
    await logAudit({
      actor_id: user.id,
      actor_role: 'admin',
      action: 'add_note',
      entity_type: 'order',
      entity_id: orderId,
      changes: {
        note: note.trim()
      }
    })

    return NextResponse.json({
      success: true,
      note: newNote,
      message: 'Note added successfully'
    })
  } catch (error) {
    console.error('Add note error:', error)
    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    )
  }
}
