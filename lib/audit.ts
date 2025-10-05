/**
 * Audit Logging Service
 * Logs all admin and partner actions for compliance and debugging
 */

import { getServiceClient } from './db'

export interface AuditLogEntry {
  actor_id: string
  actor_role: 'admin' | 'partner' | 'user'
  action: string
  entity_type: string
  entity_id: string
  changes?: Record<string, any>
  ip_address?: string
  user_agent?: string
}

/**
 * Log an action to the audit trail
 * 
 * @example
 * await logAudit({
 *   actor_id: user.id,
 *   actor_role: 'admin',
 *   action: 'order.force_status',
 *   entity_type: 'order',
 *   entity_id: orderId,
 *   changes: { from: 'processing', to: 'delivered', reason: 'Customer confirmed' }
 * })
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const db = getServiceClient()
    
    const { error } = await db
      .from('audit_logs')
      .insert({
        actor_id: entry.actor_id,
        actor_role: entry.actor_role,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        changes: entry.changes || null,
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
      })
    
    if (error) {
      console.error('Failed to log audit entry:', error)
      // Don't throw - audit logging failure shouldn't break the app
    }
  } catch (error) {
    console.error('Audit logging error:', error)
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogs(
  entity_type: string,
  entity_id: string,
  limit: number = 50
) {
  const db = getServiceClient()
  
  const { data, error } = await db
    .from('audit_logs')
    .select('*')
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Failed to fetch audit logs:', error)
    return []
  }
  
  return data || []
}

/**
 * Get audit logs for a specific actor
 */
export async function getAuditLogsByActor(
  actor_id: string,
  limit: number = 50
) {
  const db = getServiceClient()
  
  const { data, error } = await db
    .from('audit_logs')
    .select('*')
    .eq('actor_id', actor_id)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    console.error('Failed to fetch audit logs:', error)
    return []
  }
  
  return data || []
}

/**
 * Extract IP address and user agent from Next.js request
 */
export function getRequestMetadata(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return {
    ip_address: ip,
    user_agent: userAgent
  }
}
