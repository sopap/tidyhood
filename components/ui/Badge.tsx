import React from 'react';

export type BadgeColor = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  color?: BadgeColor;
  size?: BadgeSize;
  icon?: string;
  className?: string;
}

/**
 * Badge component for consistent status displays across the app
 * 
 * Usage:
 * <Badge color="green" icon="✅">Completed</Badge>
 * <Badge color="yellow" size="sm">Pending</Badge>
 */
export function Badge({ 
  children, 
  color = 'gray', 
  size = 'md', 
  icon, 
  className = '' 
}: BadgeProps) {
  const colorClasses = {
    blue: 'status-badge-blue',
    green: 'status-badge-green', 
    yellow: 'status-badge-yellow',
    red: 'status-badge-red',
    purple: 'status-badge-purple',
    gray: 'status-badge-gray'
  };

  const sizeClasses = {
    sm: 'status-badge-sm',
    md: 'status-badge-md', 
    lg: 'status-badge-lg'
  };

  return (
    <span 
      className={`
        status-badge 
        ${colorClasses[color]} 
        ${sizeClasses[size]} 
        ${className}
      `.trim()}
    >
      {icon && <span className="leading-none">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

/**
 * Helper function to get status-specific badge props
 * Maps common order statuses to appropriate colors and icons
 */
export function getStatusBadgeProps(status: string): { color: BadgeColor; icon: string } {
  const statusMap: Record<string, { color: BadgeColor; icon: string }> = {
    // Order statuses
    'pending': { color: 'yellow', icon: '⏳' },
    'confirmed': { color: 'blue', icon: '📅' },
    'assigned': { color: 'blue', icon: '✅' },
    'en_route': { color: 'blue', icon: '🚗' },
    'on_site': { color: 'blue', icon: '📍' },
    'in_progress': { color: 'blue', icon: '🔄' },
    'completed': { color: 'green', icon: '✅' },
    'awaiting_payment': { color: 'yellow', icon: '💳' },
    'paid': { color: 'green', icon: '✅' },
    'canceled': { color: 'red', icon: '❌' },
    'cancelled': { color: 'red', icon: '❌' },
    'refunded': { color: 'gray', icon: '💰' },
    'disputed': { color: 'red', icon: '⚠️' },
    
    // Cleaning specific
    'cleaner_no_show': { color: 'red', icon: '❌' },
    'customer_no_show': { color: 'yellow', icon: '⚠️' },
    
    // Generic states
    'active': { color: 'green', icon: '✅' },
    'inactive': { color: 'gray', icon: '⏸️' },
    'warning': { color: 'yellow', icon: '⚠️' },
    'error': { color: 'red', icon: '❌' },
    'success': { color: 'green', icon: '✅' },
    'info': { color: 'blue', icon: 'ℹ️' }
  };

  return statusMap[status.toLowerCase()] || { color: 'gray', icon: '•' };
}

/**
 * StatusBadge - Convenience component for order/service statuses
 */
interface StatusBadgeProps {
  status: string;
  size?: BadgeSize;
  className?: string;
  label?: string; // Override the displayed text
}

export function StatusBadge({ status, size = 'md', className, label }: StatusBadgeProps) {
  const { color, icon } = getStatusBadgeProps(status);
  const displayText = label || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  return (
    <Badge color={color} size={size} icon={icon} className={className}>
      {displayText}
    </Badge>
  );
}
