'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PendingQuote {
  id: string
  service_type: string
  actual_weight_lbs: number
  quote_cents: number
  estimate_cents: number
  quoted_at: string
  profiles: {
    full_name: string
    email: string
    phone: string
  }
  partners: {
    name: string
  }
}

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<PendingQuote[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchPendingQuotes()
  }, [])

  async function fetchPendingQuotes() {
    try {
      const res = await fetch('/api/admin/orders?pending_approval=true')
      const data = await res.json()
      setQuotes(data.orders || [])
    } catch (error) {
      console.error('Failed to fetch pending quotes:', error)
    } finally {
      setLoading(false)
    }
  }

  async function approveQuote(orderId: string, amount: number) {
    if (!confirm(`Charge customer $${(amount / 100).toFixed(2)} and approve this quote?`)) {
      return
    }

    setApproving(orderId)
    
    try {
      const res = await fetch('/api/admin/quotes/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve quote')
      }

      alert('Quote approved and customer charged successfully!')
      
      // Refresh the list
      await fetchPendingQuotes()
    } catch (error: any) {
      alert(`Failed to approve quote: ${error.message}`)
    } finally {
      setApproving(null)
    }
  }

  function calculateVariance(estimate: number, quote: number): number {
    if (!estimate) return 0
    return ((quote - estimate) / estimate) * 100
  }

  function getVarianceColor(variance: number): string {
    if (Math.abs(variance) < 10) return 'text-green-600'
    if (Math.abs(variance) < 20) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Quote Approval Queue</h1>
        <p className="text-gray-600">
          Review and approve partner quotes. Approving will automatically charge the customer's saved card.
        </p>
      </div>

      {quotes.length === 0 ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No quotes pending approval</h3>
          <p className="mt-2 text-sm text-gray-500">
            All quotes have been processed. Check back later for new submissions.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => {
            const variance = calculateVariance(quote.estimate_cents, quote.quote_cents)
            const isApproving = approving === quote.id
            
            return (
              <div
                key={quote.id}
                className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {quote.profiles?.full_name || 'Unknown Customer'}
                        </h3>
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          {quote.service_type}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>📧 {quote.profiles?.email}</p>
                        <p>📱 {quote.profiles?.phone}</p>
                        <p>🏢 Partner: {quote.partners?.name || 'Unknown'}</p>
                        {quote.actual_weight_lbs && (
                          <p>⚖️ Weight: {quote.actual_weight_lbs} lbs</p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600 mb-1">
                        ${(quote.quote_cents / 100).toFixed(2)}
                      </div>
                      {quote.estimate_cents > 0 && (
                        <div className="text-sm text-gray-500">
                          <div>Estimate: ${(quote.estimate_cents / 100).toFixed(2)}</div>
                          <div className={`font-medium ${getVarianceColor(variance)}`}>
                            {variance > 0 ? '+' : ''}{variance.toFixed(1)}% variance
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Link
                      href={`/admin/orders/${quote.id}`}
                      className="flex-1 px-4 py-2 text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => approveQuote(quote.id, quote.quote_cents)}
                      disabled={isApproving}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                    >
                      {isApproving ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        '✓ Approve & Charge'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">ℹ️ How it works:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Partner submits quote after weighing items</li>
          <li>Quote appears here for admin review</li>
          <li>Clicking "Approve & Charge" will automatically charge the customer's saved card</li>
          <li>Customer receives receipt SMS after successful charge</li>
          <li>If charge fails, it's logged for retry and customer is notified</li>
        </ul>
      </div>
    </div>
  )
}
