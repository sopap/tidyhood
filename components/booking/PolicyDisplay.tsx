'use client'

import { useState, useEffect } from 'react'

interface CancellationPolicy {
  id: string
  version: number
  service_type: string
  notice_hours: number
  cancellation_fee_percent: number
  summary_html: string
  details_html: string
}

interface PolicyDisplayProps {
  serviceType: 'LAUNDRY' | 'CLEANING'
  onPolicyAccepted: (policyId: string, policyVersion: number) => void
  required?: boolean
}

export default function PolicyDisplay({
  serviceType,
  onPolicyAccepted,
  required = true
}: PolicyDisplayProps) {
  const [policy, setPolicy] = useState<CancellationPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  
  // Fetch policy from API
  const fetchPolicy = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(
        `/api/policies/cancellation?service=${serviceType}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to load cancellation policy')
      }
      
      const data = await response.json()
      setPolicy(data)
    } catch (err) {
      console.error('Error fetching policy:', err)
      setError('Unable to load cancellation policy. Please try again.')
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch on mount and when service type changes
  useEffect(() => {
    fetchPolicy()
  }, [serviceType])
  
  // Handle checkbox change
  const handleAcceptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked
    setAccepted(isChecked)
    
    if (isChecked && policy) {
      onPolicyAccepted(policy.id, policy.version)
    }
  }
  
  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }
  
  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-sm text-red-800 mb-2">
          {error}
        </div>
        <button 
          onClick={fetchPolicy}
          className="text-sm text-red-600 underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    )
  }
  
  // No policy found
  if (!policy) {
    return null
  }
  
  return (
    <div className="space-y-3">
      {/* Checkbox + Label */}
      <label className="flex items-start gap-3 cursor-pointer group">
        <input 
          type="checkbox" 
          required={required}
          checked={accepted}
          onChange={handleAcceptChange}
          className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          aria-label="Accept cancellation policy"
        />
        <div className="flex-1 text-sm text-gray-700">
          I agree to the{' '}
          <button 
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-blue-600 underline hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-expanded={expanded}
            aria-controls="policy-summary"
          >
            Cancellation Policy (v{policy.version})
          </button>
          {' '}and{' '}
          <a 
            href="/terms" 
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-700"
          >
            Terms of Service
          </a>
          {required && <span className="text-red-500 ml-1">*</span>}
        </div>
      </label>

      {/* Expandable Summary */}
      {expanded && (
        <div 
          id="policy-summary"
          className="pl-7 animate-slide-down"
          role="region"
          aria-label="Policy summary"
        >
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            {/* Summary HTML */}
            <div 
              className="text-sm text-gray-700 space-y-2 policy-content"
              dangerouslySetInnerHTML={{ __html: policy.summary_html }}
            />
            
            {/* Policy Details */}
            <div className="pt-3 border-t border-gray-200 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span>Policy Version: {policy.version}</span>
                <a 
                  href={`/policies/cancellation/${serviceType.toLowerCase()}?v=${policy.version}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  View full policy →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Visual feedback when not accepted */}
      {!accepted && required && (
        <div className="pl-7 text-xs text-gray-500">
          You must accept the policy to continue
        </div>
      )}
    </div>
  )
}
