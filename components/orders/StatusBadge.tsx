import React from 'react';

export type StatusTone = 'blue' | 'indigo' | 'green' | 'yellow' | 'gray';

interface StatusBadgeProps {
  tone?: StatusTone;
  children: React.ReactNode;
}

export default function StatusBadge({ tone = 'gray', children }: StatusBadgeProps) {
  const map: Record<StatusTone, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${map[tone]}`}>
      {children}
    </span>
  );
}
