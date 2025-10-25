'use client'

import { useState, useEffect } from 'react'
import { Toast } from '@/components/Toast'

interface PricingRule {
  id: string
  rule_name: string
  service_type: string
  unit_type: string
  unit_key: string
  unit_price_cents: number | null
  multiplier: number | null
  active: boolean
  updated_at: string
  updated_by: string | null
  change_reason: string | null
}

interface RuleMetadata {
  displayName: string
  description: string
  category: string
  example?: string
  usageNote?: string
}

interface CancellationPolicy {
  id: string
  service_type: string
  notice_hours: number
  cancellation_fee_percent: number
  reschedule_notice_hours: number
  reschedule_fee_percent: number
  allow_cancellation: boolean
  allow_rescheduling: boolean
  active: boolean
  notes: string | null
  updated_at: string
}

interface DeliveryTimePolicy {
  id: string
  service_type: string
  standard_minimum_hours: number
  rush_enabled: boolean
  rush_early_pickup_hours: number
  rush_late_pickup_hours: number
  rush_cutoff_hour: number
  same_day_earliest_hour: number
  active: boolean
  notes: string | null
  updated_at: string
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'pricing' | 'policies' | 'delivery' | 'history'>('pricing')
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [policies, setPolicies] = useState<CancellationPolicy[]>([])
  const [deliveryPolicies, setDeliveryPolicies] = useState<DeliveryTimePolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, number>>({})
  const [editingPolicy, setEditingPolicy] = useState<string | null>(null)
  const [policyFormValues, setPolicyFormValues] = useState<Partial<CancellationPolicy>>({})
  const [editingDeliveryPolicy, setEditingDeliveryPolicy] = useState<string | null>(null)
  const [deliveryFormValues, setDeliveryFormValues] = useState<Partial<DeliveryTimePolicy>>({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      // Add timestamp to prevent caching
      const timestamp = Date.now()
      const [pricingRes, policiesRes, deliveryRes] = await Promise.all([
        fetch(`/api/admin/settings/pricing?t=${timestamp}`, {
          cache: 'no-store'
        }),
        fetch(`/api/admin/settings/policies?t=${timestamp}`, {
          cache: 'no-store'
        }),
        fetch(`/api/admin/settings/delivery-policies?t=${timestamp}`, {
          cache: 'no-store'
        })
      ])

      const [pricingData, policiesData, deliveryData] = await Promise.all([
        pricingRes.json(),
        policiesRes.json(),
        deliveryRes.json()
      ])

      if (pricingData.rules) setPricingRules(pricingData.rules)
      if (policiesData.policies) setPolicies(policiesData.policies)
      if (deliveryData.policies) setDeliveryPolicies(deliveryData.policies)
    } catch (error) {
      console.error('Error loading settings:', error)
      showToast('Failed to load settings', 'error')
    } finally {
      setLoading(false)
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function startEditingPolicy(policy: CancellationPolicy) {
    setEditingPolicy(policy.id)
    setPolicyFormValues({
      notice_hours: policy.notice_hours,
      cancellation_fee_percent: policy.cancellation_fee_percent,
      reschedule_notice_hours: policy.reschedule_notice_hours,
      reschedule_fee_percent: policy.reschedule_fee_percent,
      allow_cancellation: policy.allow_cancellation,
      allow_rescheduling: policy.allow_rescheduling,
      notes: policy.notes || ''
    })
  }

  function cancelEditingPolicy() {
    setEditingPolicy(null)
    setPolicyFormValues({})
  }

  async function updatePolicy(policy: CancellationPolicy) {
    try {
      const res = await fetch(`/api/admin/settings/policies/${policy.service_type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...policyFormValues,
          change_reason: 'Updated via admin settings'
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Update failed')
      }

      const data = await res.json()
      showToast(data.message || 'Policy updated successfully', 'success')
      
      await loadData()
      
      setEditingPolicy(null)
      setPolicyFormValues({})
    } catch (error) {
      console.error('Error updating policy:', error)
      showToast(
        error instanceof Error ? error.message : 'Failed to update policy',
        'error'
      )
    }
  }

  function startEditingDeliveryPolicy(policy: DeliveryTimePolicy) {
    setEditingDeliveryPolicy(policy.id)
    setDeliveryFormValues({
      standard_minimum_hours: policy.standard_minimum_hours,
      rush_enabled: policy.rush_enabled,
      rush_early_pickup_hours: policy.rush_early_pickup_hours,
      rush_late_pickup_hours: policy.rush_late_pickup_hours,
      rush_cutoff_hour: policy.rush_cutoff_hour,
      same_day_earliest_hour: policy.same_day_earliest_hour,
      notes: policy.notes || ''
    })
  }

  function cancelEditingDeliveryPolicy() {
    setEditingDeliveryPolicy(null)
    setDeliveryFormValues({})
  }

  async function updateDeliveryPolicy(policy: DeliveryTimePolicy) {
    try {
      const res = await fetch(`/api/admin/settings/delivery-policies/${policy.service_type}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...deliveryFormValues,
          change_reason: 'Updated via admin settings'
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Update failed')
      }

      const data = await res.json()
      showToast(data.message || 'Delivery policy updated successfully', 'success')
      
      await loadData()
      
      setEditingDeliveryPolicy(null)
      setDeliveryFormValues({})
    } catch (error) {
      console.error('Error updating delivery policy:', error)
      showToast(
        error instanceof Error ? error.message : 'Failed to update delivery policy',
        'error'
      )
    }
  }

  async function updatePricingRule(ruleId: string, value: number) {
    try {
      const rule = pricingRules.find(r => r.id === ruleId)
      if (!rule) return

      const updateData = rule.unit_price_cents !== null 
        ? { unit_price_cents: value }
        : { multiplier: value }

      const res = await fetch(`/api/admin/settings/pricing/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updateData,
          change_reason: 'Updated via admin settings'
        })
      })

      if (!res.ok) throw new Error('Update failed')

      showToast('Pricing updated successfully', 'success')
      
      // Wait for data to refresh before clearing edit state
      await loadData()
      
      setEditingRule(null)
      setEditValues({})
    } catch (error) {
      showToast('Failed to update pricing', 'error')
    }
  }

  function formatPrice(cents: number | null): string {
    if (cents === null) return 'N/A'
    return `$${(cents / 100).toFixed(2)}`
  }

  function getRuleMetadata(rule: PricingRule): RuleMetadata {
    const metadata: Record<string, RuleMetadata> = {
      'LND_WF_PERLB': {
        displayName: 'Per Pound Rate',
        description: 'Foundation of all laundry orders (wash + fold + dry)',
        category: 'BASE_PRICING',
        example: '25-lbs × $1.75 = $43.75',
        usageNote: 'Applied to 89% of orders'
      },
      'LND_WF_MIN_LBS': {
        displayName: 'Minimum Order Charge',
        description: 'Minimum dollar amount charged for any laundry order',
        category: 'BASE_PRICING',
        example: 'Small orders (e.g. 5-lbs) are still charged $15.00 minimum',
        usageNote: 'Ensures profitability on small orders'
      },
      'LND_RUSH_24HR': {
        displayName: 'Rush Service (24-hour)',
        description: 'Flat fee for expedited 24-hour turnaround',
        category: 'ADD_ONS',
        usageNote: '12% adoption rate'
      },
      'LND_BULKY_ITEM': {
        displayName: 'Bulky Item Fee',
        description: 'Per item (comforters, blankets, sleeping bags)',
        category: 'ADD_ONS',
        usageNote: '6% of orders'
      },
      'LND_DELICATE': {
        displayName: 'Delicate Care',
        description: 'Special handling for delicate fabrics',
        category: 'ADD_ONS',
        usageNote: 'Optional add-on'
      },
      'LND_EXTRA_SOFTENER': {
        displayName: 'Extra Softener',
        description: 'Additional fabric softener treatment',
        category: 'ADD_ONS',
        usageNote: 'Optional add-on'
      },
      'LND_DELIVERY_BASE': {
        displayName: 'Pickup & Delivery',
        description: 'Covers both pickup and return delivery',
        category: 'DELIVERY',
        usageNote: 'Included in 100% of orders'
      },
      'CLN_STD_STUDIO': {
        displayName: 'Studio Apartment',
        description: 'Standard cleaning for studio apartments',
        category: 'BASE_PRICING',
        usageNote: '19% of cleaning orders'
      },
      'CLN_STD_1BR': {
        displayName: '1 Bedroom',
        description: 'Standard cleaning for 1-bedroom apartments',
        category: 'BASE_PRICING',
        usageNote: '38% of orders (most popular)'
      },
      'CLN_STD_2BR': {
        displayName: '2 Bedroom',
        description: 'Standard cleaning for 2-bedroom apartments',
        category: 'BASE_PRICING',
        usageNote: '29% of cleaning orders'
      },
      'CLN_STD_3BR': {
        displayName: '3 Bedroom',
        description: 'Standard cleaning for 3-bedroom apartments',
        category: 'BASE_PRICING',
        usageNote: '11% of cleaning orders'
      },
      'CLN_STD_4BR': {
        displayName: '4+ Bedroom',
        description: 'Standard cleaning for 4+ bedroom homes',
        category: 'BASE_PRICING',
        usageNote: '3% of cleaning orders'
      },
      'CLN_DEEP_MULTI': {
        displayName: 'Deep Clean Multiplier',
        description: 'More thorough cleaning, takes 2-3x longer',
        category: 'MULTIPLIERS',
        example: '2BR deep = $149 × 1.5 = $223.50',
        usageNote: '10% choose deep clean'
      },
      'CLN_MOVEOUT_MULTI': {
        displayName: 'Move-Out Clean Multiplier',
        description: 'Intensive clean for move-out inspections',
        category: 'MULTIPLIERS',
        example: '2BR move-out = $149 × 1.75 = $260.75',
        usageNote: '3% of cleanings'
      },
      'CLN_LAUNDRY_PICKUP': {
        displayName: 'Laundry Pickup During Clean',
        description: 'Pick up laundry during cleaning service',
        category: 'ADD_ONS',
        usageNote: 'Cross-service add-on'
      },
      'CLN_PET_HAIR': {
        displayName: 'Pet Hair Deep Clean',
        description: 'Extra time for homes with pets',
        category: 'ADD_ONS',
        usageNote: '38% adoption rate'
      },
      'CLN_INSIDE_CABINETS': {
        displayName: 'Inside Cabinets',
        description: 'Interior cabinet and drawer cleaning',
        category: 'ADD_ONS',
        usageNote: 'Optional add-on'
      },
      'CLN_WINDOWS_INSIDE': {
        displayName: 'Inside Windows',
        description: 'Interior window cleaning (all accessible)',
        category: 'ADD_ONS',
        usageNote: '45% adoption rate'
      },
      'CLN_SANITIZATION': {
        displayName: 'Deep Sanitization',
        description: 'Enhanced sanitization treatment',
        category: 'ADD_ONS',
        usageNote: 'Premium add-on'
      },
      'CLN_FRIDGE_OVEN_BUNDLE': {
        displayName: 'Fridge & Oven Bundle',
        description: 'Both fridge and oven deep clean (move-out)',
        category: 'ADD_ONS',
        usageNote: 'Move-out specific'
      },
      'CLN_WALL_WIPE': {
        displayName: 'Wall Wipe Down',
        description: 'Wipe down all walls (move-out)',
        category: 'ADD_ONS',
        usageNote: 'Move-out specific'
      },
      'CLN_SERVICE_FEE': {
        displayName: 'Service Fee',
        description: 'Included in base price',
        category: 'DELIVERY',
        usageNote: 'No additional charge'
      }
    }
    
    return metadata[rule.unit_key] || {
      displayName: rule.rule_name,
      description: 'Pricing rule',
      category: 'OTHER',
      usageNote: 'Active'
    }
  }
  
  function getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      'BASE_PRICING': 'Base Rates',
      'ADD_ONS': 'Add-On Services',
      'MULTIPLIERS': 'Service Type Multipliers',
      'DELIVERY': 'Fees & Delivery',
      'OTHER': 'Other Rules'
    }
    return labels[category] || category
  }
  
  function groupRulesByCategory(rules: PricingRule[]): Record<string, PricingRule[]> {
    const grouped: Record<string, PricingRule[]> = {}
    
    // De-duplicate rules by unit_key (some may appear multiple times in the database)
    const uniqueRules = rules.reduce((acc, rule) => {
      // Keep the first occurrence of each unit_key
      if (!acc.some(r => r.unit_key === rule.unit_key)) {
        acc.push(rule)
      }
      return acc
    }, [] as PricingRule[])
    
    uniqueRules.forEach(rule => {
      const metadata = getRuleMetadata(rule)
      if (!grouped[metadata.category]) {
        grouped[metadata.category] = []
      }
      grouped[metadata.category].push(rule)
    })
    
    return grouped
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900">Settings Management</h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pricing')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pricing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pricing Rules
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'policies'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cancellation Policies
          </button>
          <button
            onClick={() => setActiveTab('delivery')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'delivery'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Delivery Time Policies
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Change History
          </button>
        </nav>
      </div>

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* Important Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Pricing Updates Apply to New Bookings Only</h3>
                <p className="mt-1 text-sm text-blue-700">
                  Changes made here affect NEW orders starting immediately. Existing orders keep their original pricing.
                </p>
              </div>
            </div>
          </div>

          {/* Laundry Service Pricing */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <span className="text-2xl mr-3">💼</span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Laundry Service Pricing</h2>
                  <p className="text-sm text-gray-600">Wash & fold service rates and add-ons</p>
                </div>
              </div>
            </div>
            
            {Object.entries(groupRulesByCategory(pricingRules.filter(r => r.service_type === 'LAUNDRY'))).map(([category, rules]) => (
              <div key={category} className="border-b border-gray-100 last:border-b-0">
                <div className="px-6 py-3 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {getCategoryLabel(category)}
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {rules.map((rule) => {
                    const metadata = getRuleMetadata(rule)
                    return (
                      <div key={rule.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-base font-semibold text-gray-900">
                                {metadata.displayName}
                              </h4>
                              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                rule.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {rule.active ? '🟢 LIVE' : '⚪ INACTIVE'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{metadata.description}</p>
                            {metadata.example && (
                              <p className="mt-1 text-xs text-gray-500 font-mono bg-gray-50 inline-block px-2 py-1 rounded">
                                Example: {metadata.example}
                              </p>
                            )}
                            {metadata.usageNote && (
                              <p className="mt-1 text-xs text-blue-600">
                                📊 {metadata.usageNote}
                              </p>
                            )}
                            {rule.updated_at && (
                              <p className="mt-1 text-xs text-gray-400">
                                Last updated: {new Date(rule.updated_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 ml-6">
                            {editingRule === rule.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {rule.unit_price_cents !== null ? '$' : ''}
                                </span>
                                <input
                                  type="number"
                                  step={rule.unit_price_cents !== null ? "0.01" : "0.01"}
                                  defaultValue={
                                    rule.unit_price_cents !== null
                                      ? (rule.unit_price_cents / 100).toFixed(2)
                                      : rule.multiplier?.toFixed(2)
                                  }
                                  onChange={(e) => setEditValues({
                                    ...editValues,
                                    [rule.id]: parseFloat(e.target.value) * (rule.unit_price_cents !== null ? 100 : 1)
                                  })}
                                  className="w-24 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  autoFocus
                                />
                                <span className="text-sm text-gray-500">
                                  {rule.multiplier !== null ? 'x' : ''}
                                </span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">
                                  {rule.unit_price_cents !== null
                                    ? formatPrice(rule.unit_price_cents)
                                    : `${rule.multiplier}x`}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              {editingRule === rule.id ? (
                                <>
                                  <button
                                    onClick={() => updatePricingRule(rule.id, editValues[rule.id])}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRule(null)
                                      setEditValues({})
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setEditingRule(rule.id)}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors flex items-center gap-1"
                                >
                                  <span>✏️</span>
                                  Edit
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Cleaning Service Pricing */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center">
                <span className="text-2xl mr-3">🏠</span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Cleaning Service Pricing</h2>
                  <p className="text-sm text-gray-600">Standard, deep, and move-out cleaning rates</p>
                </div>
              </div>
            </div>
            
            {Object.entries(groupRulesByCategory(pricingRules.filter(r => r.service_type === 'CLEANING'))).map(([category, rules]) => (
              <div key={category} className="border-b border-gray-100 last:border-b-0">
                <div className="px-6 py-3 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {getCategoryLabel(category)}
                  </h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {rules.map((rule) => {
                    const metadata = getRuleMetadata(rule)
                    return (
                      <div key={rule.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-base font-semibold text-gray-900">
                                {metadata.displayName}
                              </h4>
                              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                rule.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}>
                                {rule.active ? '🟢 LIVE' : '⚪ INACTIVE'}
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">{metadata.description}</p>
                            {metadata.example && (
                              <p className="mt-1 text-xs text-gray-500 font-mono bg-gray-50 inline-block px-2 py-1 rounded">
                                Example: {metadata.example}
                              </p>
                            )}
                            {metadata.usageNote && (
                              <p className="mt-1 text-xs text-blue-600">
                                📊 {metadata.usageNote}
                              </p>
                            )}
                            {rule.updated_at && (
                              <p className="mt-1 text-xs text-gray-400">
                                Last updated: {new Date(rule.updated_at).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 ml-6">
                            {editingRule === rule.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">
                                  {rule.unit_price_cents !== null ? '$' : ''}
                                </span>
                                <input
                                  type="number"
                                  step={rule.unit_price_cents !== null ? "0.01" : "0.01"}
                                  defaultValue={
                                    rule.unit_price_cents !== null
                                      ? (rule.unit_price_cents / 100).toFixed(2)
                                      : rule.multiplier?.toFixed(2)
                                  }
                                  onChange={(e) => setEditValues({
                                    ...editValues,
                                    [rule.id]: parseFloat(e.target.value) * (rule.unit_price_cents !== null ? 100 : 1)
                                  })}
                                  className="w-24 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  autoFocus
                                />
                                <span className="text-sm text-gray-500">
                                  {rule.multiplier !== null ? 'x' : ''}
                                </span>
                              </div>
                            ) : (
                              <div className="text-right">
                                <div className="text-2xl font-bold text-gray-900">
                                  {rule.unit_price_cents !== null
                                    ? formatPrice(rule.unit_price_cents)
                                    : `${rule.multiplier}x`}
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              {editingRule === rule.id ? (
                                <>
                                  <button
                                    onClick={() => updatePricingRule(rule.id, editValues[rule.id])}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingRule(null)
                                      setEditValues({})
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setEditingRule(rule.id)}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors flex items-center gap-1"
                                >
                                  <span>✏️</span>
                                  Edit
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          {/* Important Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Policy Changes Affect Future Orders</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Changes to cancellation policies apply to NEW bookings only. Existing orders retain their original policy terms.
                </p>
              </div>
            </div>
          </div>

          {policies.map((policy) => (
            <div key={policy.id} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {policy.service_type === 'LAUNDRY' ? '💼 Laundry' : '🏠 Cleaning'} Service Policy
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Controls cancellation and rescheduling rules for {policy.service_type.toLowerCase()} orders
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                    policy.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {policy.active ? '🟢 ACTIVE' : '⚪ INACTIVE'}
                  </span>
                </div>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                {editingPolicy === policy.id ? (
                  // Edit Mode
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Cancellation Settings */}
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <span>🚫</span> Cancellation Policy
                        </h4>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notice Required (hours)
                            <span className="text-gray-500 ml-1">(0-168)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="168"
                            step="1"
                            value={policyFormValues.notice_hours || 0}
                            onChange={(e) => setPolicyFormValues({
                              ...policyFormValues,
                              notice_hours: parseInt(e.target.value) || 0
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Hours before service when customers can still cancel
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cancellation Fee (%)
                            <span className="text-gray-500 ml-1">(0-50)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            step="1"
                            value={(policyFormValues.cancellation_fee_percent || 0) * 100}
                            onChange={(e) => setPolicyFormValues({
                              ...policyFormValues,
                              cancellation_fee_percent: parseFloat(e.target.value) / 100
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Percentage charged if cancelled after notice period
                          </p>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`allow-cancel-${policy.id}`}
                            checked={policyFormValues.allow_cancellation ?? policy.allow_cancellation}
                            onChange={(e) => setPolicyFormValues({
                              ...policyFormValues,
                              allow_cancellation: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`allow-cancel-${policy.id}`} className="ml-2 text-sm text-gray-700">
                            Allow cancellations
                          </label>
                        </div>
                      </div>

                      {/* Rescheduling Settings */}
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                          <span>📅</span> Reschedule Policy
                        </h4>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Notice Required (hours)
                            <span className="text-gray-500 ml-1">(0-168)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="168"
                            step="1"
                            value={policyFormValues.reschedule_notice_hours || 0}
                            onChange={(e) => setPolicyFormValues({
                              ...policyFormValues,
                              reschedule_notice_hours: parseInt(e.target.value) || 0
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Hours before service when customers can still reschedule
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reschedule Fee (%)
                            <span className="text-gray-500 ml-1">(0-50)</span>
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            step="1"
                            value={(policyFormValues.reschedule_fee_percent || 0) * 100}
                            onChange={(e) => setPolicyFormValues({
                              ...policyFormValues,
                              reschedule_fee_percent: parseFloat(e.target.value) / 100
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Percentage charged if rescheduled after notice period
                          </p>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`allow-reschedule-${policy.id}`}
                            checked={policyFormValues.allow_rescheduling ?? policy.allow_rescheduling}
                            onChange={(e) => setPolicyFormValues({
                              ...policyFormValues,
                              allow_rescheduling: e.target.checked
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`allow-reschedule-${policy.id}`} className="ml-2 text-sm text-gray-700">
                            Allow rescheduling
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Policy Notes (optional)
                      </label>
                      <textarea
                        value={policyFormValues.notes || ''}
                        onChange={(e) => setPolicyFormValues({
                          ...policyFormValues,
                          notes: e.target.value
                        })}
                        rows={3}
                        placeholder="Add any additional context or notes about this policy..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => updatePolicy(policy)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                      >
                        <span>💾</span>
                        Save Changes
                      </button>
                      <button
                        onClick={cancelEditingPolicy}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      {/* Cancellation Display */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                          <span>🚫</span> Cancellation Policy
                        </h4>
                        <div className="space-y-3 pl-6">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Notice Required
                            </label>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {policy.notice_hours} hours
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {policy.notice_hours >= 24 
                                ? `${(policy.notice_hours / 24).toFixed(1)} days`
                                : `${policy.notice_hours} hours`} before service
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Cancellation Fee
                            </label>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {(policy.cancellation_fee_percent * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {policy.cancellation_fee_percent === 0 
                                ? 'No fee if cancelled on time'
                                : 'Fee applied for late cancellations'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {policy.allow_cancellation ? (
                              <span className="text-green-600 flex items-center gap-1 text-sm">
                                ✓ Cancellations allowed
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-1 text-sm">
                                ✗ Cancellations disabled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rescheduling Display */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                          <span>📅</span> Reschedule Policy
                        </h4>
                        <div className="space-y-3 pl-6">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Notice Required
                            </label>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {policy.reschedule_notice_hours} hours
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {policy.reschedule_notice_hours >= 24 
                                ? `${(policy.reschedule_notice_hours / 24).toFixed(1)} days`
                                : `${policy.reschedule_notice_hours} hours`} before service
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Reschedule Fee
                            </label>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {(policy.reschedule_fee_percent * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {policy.reschedule_fee_percent === 0 
                                ? 'No fee if rescheduled on time'
                                : 'Fee applied for late reschedules'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {policy.allow_rescheduling ? (
                              <span className="text-green-600 flex items-center gap-1 text-sm">
                                ✓ Rescheduling allowed
                              </span>
                            ) : (
                              <span className="text-red-600 flex items-center gap-1 text-sm">
                                ✗ Rescheduling disabled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {policy.notes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700 font-medium mb-1">📝 Policy Notes:</p>
                        <p className="text-sm text-blue-900">{policy.notes}</p>
                      </div>
                    )}
                    
                    {policy.updated_at && (
                      <p className="text-xs text-gray-400">
                        Last updated: {new Date(policy.updated_at).toLocaleString()}
                      </p>
                    )}
                    
                    <div className="pt-2 border-t border-gray-200">
                      <button 
                        onClick={() => startEditingPolicy(policy)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                      >
                        <span>✏️</span>
                        Edit Policy
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delivery Time Policies Tab */}
      {activeTab === 'delivery' && (
        <div className="space-y-6">
          {/* Important Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Controls Earliest Available Delivery Dates</h3>
                <p className="mt-1 text-sm text-blue-700">
                  These settings determine how far in advance customers must book laundry services and enable rush/same-day options. (Cleaning services do not use delivery time policies)
                </p>
              </div>
            </div>
          </div>

          {deliveryPolicies.filter(p => p.service_type === 'LAUNDRY').map((policy) => (
            <div key={policy.id} className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {policy.service_type === 'LAUNDRY' ? '💼 Laundry' : '🏠 Cleaning'} Delivery Time Policy
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Controls earliest available pickup/delivery slots for {policy.service_type.toLowerCase()} bookings
                    </p>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                    policy.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {policy.active ? '🟢 ACTIVE' : '⚪ INACTIVE'}
                  </span>
                </div>
              </div>
              
              <div className="px-6 py-4 space-y-4">
                {editingDeliveryPolicy === policy.id ? (
                  // Edit Mode
                  <div className="space-y-6">
                    {/* Standard Service */}
                    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span>📅</span> Standard Service Timing
                      </h4>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Minimum Lead Time (hours)
                          <span className="text-gray-500 ml-1">(24-168)</span>
                        </label>
                        <input
                          type="number"
                          min="24"
                          max="168"
                          step="1"
                          value={deliveryFormValues.standard_minimum_hours || 48}
                          onChange={(e) => setDeliveryFormValues({
                            ...deliveryFormValues,
                            standard_minimum_hours: parseInt(e.target.value) || 48
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Minimum hours from booking to earliest available slot (e.g., 48 = 2 days)
                        </p>
                      </div>
                    </div>

                    {/* Rush Service */}
                    <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span>⚡</span> Rush Service Configuration
                      </h4>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`rush-enabled-${policy.id}`}
                          checked={deliveryFormValues.rush_enabled ?? policy.rush_enabled}
                          onChange={(e) => setDeliveryFormValues({
                            ...deliveryFormValues,
                            rush_enabled: e.target.checked
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`rush-enabled-${policy.id}`} className="ml-2 text-sm font-medium text-gray-700">
                          Enable Rush/Same-Day Service
                        </label>
                      </div>

                      {(deliveryFormValues.rush_enabled ?? policy.rush_enabled) && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Rush Cutoff Hour (NY timezone)
                              <span className="text-gray-500 ml-1">(0-23)</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="23"
                              step="1"
                              value={deliveryFormValues.rush_cutoff_hour ?? 11}
                              onChange={(e) => setDeliveryFormValues({
                                ...deliveryFormValues,
                                rush_cutoff_hour: parseInt(e.target.value)
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Hour determining early vs late rush (e.g., 11 = 11 AM cutoff)
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Early Rush Lead Time (hours)
                              <span className="text-gray-500 ml-1">(0-48)</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="48"
                              step="1"
                              value={deliveryFormValues.rush_early_pickup_hours ?? 0}
                              onChange={(e) => setDeliveryFormValues({
                                ...deliveryFormValues,
                                rush_early_pickup_hours: parseInt(e.target.value)
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Hours from booking to earliest slot if pickup ends before cutoff (0 = same-day)
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Late Rush Lead Time (hours)
                              <span className="text-gray-500 ml-1">(0-48)</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="48"
                              step="1"
                              value={deliveryFormValues.rush_late_pickup_hours ?? 24}
                              onChange={(e) => setDeliveryFormValues({
                                ...deliveryFormValues,
                                rush_late_pickup_hours: parseInt(e.target.value)
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Hours from booking to earliest slot if pickup ends after cutoff (24 = next day)
                            </p>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Same-Day Earliest Delivery Hour
                              <span className="text-gray-500 ml-1">(0-23)</span>
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="23"
                              step="1"
                              value={deliveryFormValues.same_day_earliest_hour ?? 18}
                              onChange={(e) => setDeliveryFormValues({
                                ...deliveryFormValues,
                                same_day_earliest_hour: parseInt(e.target.value)
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Earliest hour for same-day delivery slots (e.g., 18 = 6 PM)
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Policy Notes (optional)
                      </label>
                      <textarea
                        value={deliveryFormValues.notes || ''}
                        onChange={(e) => setDeliveryFormValues({
                          ...deliveryFormValues,
                          notes: e.target.value
                        })}
                        rows={3}
                        placeholder="Add any additional context or notes about this policy..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => updateDeliveryPolicy(policy)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                      >
                        <span>💾</span>
                        Save Changes
                      </button>
                      <button
                        onClick={cancelEditingDeliveryPolicy}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      {/* Standard Service Display */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                          <span>📅</span> Standard Service
                        </h4>
                        <div className="space-y-3 pl-6">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                              Minimum Lead Time
                            </label>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              {policy.standard_minimum_hours} hours
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {policy.standard_minimum_hours >= 24 
                                ? `${(policy.standard_minimum_hours / 24).toFixed(1)} days`
                                : `${policy.standard_minimum_hours} hours`} in advance
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Rush Service Display */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                          <span>⚡</span> Rush Service
                        </h4>
                        <div className="space-y-3 pl-6">
                          <div className="flex items-center gap-2">
                            {policy.rush_enabled ? (
                              <span className="text-green-600 flex items-center gap-1 text-sm font-medium">
                                ✓ Rush Enabled
                              </span>
                            ) : (
                              <span className="text-gray-600 flex items-center gap-1 text-sm">
                                ✗ Rush Disabled
                              </span>
                            )}
                          </div>
                          
                          {policy.rush_enabled && (
                            <>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Rush Cutoff
                                </label>
                                <p className="text-lg font-bold text-gray-900 mt-1">
                                  {policy.rush_cutoff_hour}:00 {policy.rush_cutoff_hour >= 12 ? 'PM' : 'AM'}
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Early/Late Rush
                                </label>
                                <p className="text-sm text-gray-900 mt-1">
                                  {policy.rush_early_pickup_hours}h / {policy.rush_late_pickup_hours}h
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                                  Same-Day Delivery From
                                </label>
                                <p className="text-lg font-bold text-gray-900 mt-1">
                                  {policy.same_day_earliest_hour}:00 {policy.same_day_earliest_hour >= 12 ? 'PM' : 'AM'}
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {policy.notes && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-gray-700 font-medium mb-1">📝 Policy Notes:</p>
                        <p className="text-sm text-blue-900">{policy.notes}</p>
                      </div>
                    )}
                    
                    {policy.updated_at && (
                      <p className="text-xs text-gray-400">
                        Last updated: {new Date(policy.updated_at).toLocaleString()}
                      </p>
                    )}
                    
                    <div className="pt-2 border-t border-gray-200">
                      <button 
                        onClick={() => startEditingDeliveryPolicy(policy)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                      >
                        <span>✏️</span>
                        Edit Policy
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Change History</h2>
            <p className="text-sm text-gray-600 mt-1">
              View all changes made to pricing and policies.
            </p>
          </div>
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <p>History viewer coming soon</p>
              <p className="text-sm mt-2">Use GET /api/admin/settings/history?format=csv to export</p>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={true}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
