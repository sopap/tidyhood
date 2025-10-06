'use client'

import { CleaningStatus, getCleaningStatusDisplay } from '@/lib/cleaningStatus'

interface CleaningStatusBadgeProps {
  status: CleaningStatus
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-2'
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200'
}

export function CleaningStatusBadge({ status, size = 'md', className = '' }: CleaningStatusBadgeProps) {
  const config = getCleaningStatusDisplay(status)
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${sizeClasses[size]} ${colorClasses[config.color]} ${className}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  )
}
