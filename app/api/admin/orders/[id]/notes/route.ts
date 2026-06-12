import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { getServiceClient } from '@/lib/db'
import { logAudit } from '@/lib/audit'

const addNoteSchema = z.object({
  note: z.string()
})

// Get all notes for an order
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const db = getServiceClient()
    const { id: orderId } = await params

    const { data: notes, error } = await db
      .from('admin_notes')
      .select(`
        *,
        profiles:author_id(email)
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ notes: notes || [] })
  } catch (error) {
    console.error('Get notes error:', error)

    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

// Add a new note to an order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin()

    const parsed = addNoteSchema.safeParse(await request.json())

    if (!parsed.success || !parsed.data.note.trim()) {
      return NextResponse.json(
        { error: 'Note content is required' },
        { status: 400 }
      )
    }

    const { note } = parsed.data

    const db = getServiceClient()
    const { id: orderId } = await params

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
        author_id: user.id,
        note: note.trim()
      })
      .select(`
        *,
        profiles:author_id(email)
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

    if (error instanceof Error && (error.message === 'Unauthorized' || error.message.includes('Forbidden'))) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    )
  }
}
