import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/settings/history
 * 
 * Fetches settings audit log with filtering
 * Query params:
 * - table_name: 'pricing_rules' | 'cancellation_policies'
 * - user_id: UUID
 * - date_from: ISO date
 * - date_to: ISO date
 * - limit: number (default 100, max 500)
 * - format: 'json' | 'csv'
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const tableName = searchParams.get('table_name')
    const userId = searchParams.get('user_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const format = searchParams.get('format') || 'json'

    const db = getServiceClient()
    
    // Build query with filters
    let query = db
      .from('settings_audit_log')
      .select(`
        *,
        changed_by_profile:profiles!settings_audit_log_changed_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .order('changed_at', { ascending: false })
      .limit(limit)

    if (tableName) {
      query = query.eq('table_name', tableName)
    }

    if (userId) {
      query = query.eq('changed_by', userId)
    }

    if (dateFrom) {
      query = query.gte('changed_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('changed_at', dateTo)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching audit history:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audit history' },
        { status: 500 }
      )
    }

    // Format for CSV if requested
    if (format === 'csv') {
      const csv = generateCSV(logs || [])
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="settings-audit-${Date.now()}.csv"`
        }
      })
    }

    return NextResponse.json({
      logs: logs || [],
      total: logs?.length || 0,
      limit,
      filters: {
        table_name: tableName,
        user_id: userId,
        date_from: dateFrom,
        date_to: dateTo
      }
    })
  } catch (error) {
    console.error('Audit history fetch error:', error)
    
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to generate CSV from audit logs
 */
function generateCSV(logs: any[]): string {
  const headers = [
    'Timestamp',
    'Table',
    'Action',
    'Field',
    'Old Value',
    'New Value',
    'Changed By',
    'Reason',
    'IP Address'
  ]

  const rows = logs.map(log => [
    new Date(log.changed_at).toISOString(),
    log.table_name,
    log.action,
    log.field_name || '',
    log.old_value || '',
    log.new_value || '',
    log.changed_by_profile?.full_name || log.changed_by_profile?.email || log.changed_by,
    log.change_reason || '',
    log.ip_address || ''
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => 
      // Escape cells with commas or quotes
      typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))
        ? `"${cell.replace(/"/g, '""')}"`
        : cell
    ).join(','))
  ].join('\n')

  return csvContent
}
