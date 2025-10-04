import { getServiceClient } from './db'

const NYC_TAX_RATE = parseFloat(process.env.NYC_TAX_RATE || '0.08875')
const LAUNDRY_MIN_LBS = parseInt(process.env.LAUNDRY_MIN_LBS || '15')

export interface PricingLineItem {
  key: string
  label: string
  quantity?: number
  unit_price_cents: number
  total_cents: number
  taxable: boolean
}

export interface PricingBreakdown {
  items: PricingLineItem[]
  subtotal_cents: number
  tax_cents: number
  delivery_cents: number
  total_cents: number
  tax_breakdown: {
    taxable_subtotal_cents: number
    tax_exempt_subtotal_cents: number
    tax_rate: number
  }
}

export interface LaundryQuoteParams {
  zip: string
  lbs: number
  addons?: string[]
}

export interface CleaningQuoteParams {
  zip: string
  bedrooms: number
  bathrooms: number
  deep?: boolean
  addons?: string[]
}

/**
 * Fetch active pricing rules for a service type and zone
 */
async function getPricingRules(serviceType: 'LAUNDRY' | 'CLEANING', zip: string) {
  const db = getServiceClient()
  
  const { data: rules, error } = await db
    .from('pricing_rules')
    .select('*')
    .eq('service_type', serviceType)
    .eq('active', true)
    .order('priority', { ascending: true })
  
  if (error) throw error
  
  // Filter by geozone (if specified)
  return rules.filter(rule => {
    if (!rule.geozone) return true
    const zones = rule.geozone.split(',').map((z: string) => z.trim())
    return zones.includes(zip)
  })
}

/**
 * Calculate laundry pricing
 */
export async function quoteLaundry(params: LaundryQuoteParams): Promise<PricingBreakdown> {
  const { zip, lbs, addons = [] } = params
  
  const rules = await getPricingRules('LAUNDRY', zip)
  const items: PricingLineItem[] = []
  
  // Find per-pound rate
  const perLbRule = rules.find(r => r.unit_type === 'PER_LB' && r.unit_key === 'LND_WF_PERLB')
  if (!perLbRule) {
    throw new Error('Laundry per-pound pricing not configured')
  }
  
  // Apply minimum weight
  const effectiveLbs = Math.max(lbs, LAUNDRY_MIN_LBS)
  const laundryTotal = effectiveLbs * perLbRule.unit_price_cents
  
  items.push({
    key: 'LND_WF_PERLB',
    label: `Wash & Fold (${effectiveLbs} lbs)`,
    quantity: effectiveLbs,
    unit_price_cents: perLbRule.unit_price_cents,
    total_cents: laundryTotal,
    taxable: false, // Laundry is tax-exempt
  })
  
  // Add-ons
  for (const addonKey of addons) {
    const addonRule = rules.find(r => r.unit_type === 'ADDON' && r.unit_key === addonKey)
    if (addonRule) {
      items.push({
        key: addonKey,
        label: formatAddonLabel(addonKey),
        unit_price_cents: addonRule.unit_price_cents,
        total_cents: addonRule.unit_price_cents,
        taxable: false,
      })
    }
  }
  
  // Delivery fee
  const deliveryRule = rules.find(r => r.unit_type === 'DELIVERY')
  const deliveryCents = deliveryRule?.unit_price_cents || 0
  
  if (deliveryCents > 0) {
    items.push({
      key: 'LND_DELIVERY_BASE',
      label: 'Delivery Fee',
      unit_price_cents: deliveryCents,
      total_cents: deliveryCents,
      taxable: false,
    })
  }
  
  // Calculate totals
  const subtotal_cents = items.reduce((sum, item) => sum + item.total_cents, 0)
  const taxable_subtotal = items.filter(i => i.taxable).reduce((sum, item) => sum + item.total_cents, 0)
  const tax_cents = Math.round(taxable_subtotal * NYC_TAX_RATE)
  const total_cents = subtotal_cents + tax_cents
  
  return {
    items,
    subtotal_cents,
    tax_cents,
    delivery_cents: deliveryCents,
    total_cents,
    tax_breakdown: {
      taxable_subtotal_cents: taxable_subtotal,
      tax_exempt_subtotal_cents: subtotal_cents - taxable_subtotal,
      tax_rate: NYC_TAX_RATE,
    },
  }
}

/**
 * Calculate cleaning pricing
 */
export async function quoteCleaning(params: CleaningQuoteParams): Promise<PricingBreakdown> {
  const { zip, bedrooms, bathrooms, deep = false, addons = [] } = params
  
  const rules = await getPricingRules('CLEANING', zip)
  const items: PricingLineItem[] = []
  
  // Determine flat rate key
  let unitKey: string
  if (bedrooms === 0) unitKey = 'CLN_STD_STUDIO'
  else if (bedrooms === 1) unitKey = 'CLN_STD_1BR'
  else if (bedrooms === 2) unitKey = 'CLN_STD_2BR'
  else if (bedrooms === 3) unitKey = 'CLN_STD_3BR'
  else unitKey = 'CLN_STD_4BR'
  
  const baseRule = rules.find(r => r.unit_type === 'FLAT' && r.unit_key === unitKey)
  if (!baseRule) {
    throw new Error('Cleaning pricing not configured for this unit size')
  }
  
  let baseCents = baseRule.unit_price_cents
  
  // Apply deep clean multiplier
  if (deep) {
    const deepMultRule = rules.find(r => r.unit_type === 'MULTIPLIER' && r.unit_key === 'CLN_DEEP_MULTI')
    if (deepMultRule) {
      baseCents = Math.round(baseCents * deepMultRule.multiplier)
    }
  }
  
  items.push({
    key: unitKey,
    label: `${deep ? 'Deep' : 'Standard'} Cleaning (${formatUnitSize(bedrooms, bathrooms)})`,
    unit_price_cents: baseCents,
    total_cents: baseCents,
    taxable: true, // Cleaning services are taxable
  })
  
  // Add-ons
  for (const addonKey of addons) {
    const addonRule = rules.find(r => r.unit_type === 'ADDON' && r.unit_key === addonKey)
    if (addonRule) {
      items.push({
        key: addonKey,
        label: formatAddonLabel(addonKey),
        unit_price_cents: addonRule.unit_price_cents,
        total_cents: addonRule.unit_price_cents,
        taxable: true,
      })
    }
  }
  
  // Service fee (usually $0, included in base)
  const serviceRule = rules.find(r => r.unit_type === 'DELIVERY' && r.unit_key === 'CLN_SERVICE_FEE')
  const serviceCents = serviceRule?.unit_price_cents || 0
  
  // Calculate totals
  const subtotal_cents = items.reduce((sum, item) => sum + item.total_cents, 0)
  const taxable_subtotal = items.filter(i => i.taxable).reduce((sum, item) => sum + item.total_cents, 0)
  const tax_cents = Math.round(taxable_subtotal * NYC_TAX_RATE)
  const total_cents = subtotal_cents + tax_cents
  
  return {
    items,
    subtotal_cents,
    tax_cents,
    delivery_cents: serviceCents,
    total_cents,
    tax_breakdown: {
      taxable_subtotal_cents: taxable_subtotal,
      tax_exempt_subtotal_cents: subtotal_cents - taxable_subtotal,
      tax_rate: NYC_TAX_RATE,
    },
  }
}

/**
 * Format addon labels from keys
 */
function formatAddonLabel(key: string): string {
  const labels: Record<string, string> = {
    // Laundry
    'LND_RUSH_24HR': 'Rush Service (24hr)',
    'LND_BULKY_ITEM': 'Bulky Item Fee',
    'LND_DELICATE': 'Delicate Care',
    'LND_EXTRA_SOFTENER': 'Extra Softener',
    // Cleaning
    'CLN_FRIDGE_INSIDE': 'Refrigerator Interior',
    'CLN_OVEN_INSIDE': 'Oven Interior',
    'CLN_WINDOWS_INSIDE': 'Interior Windows',
    'CLN_LAUNDRY_WASH': 'Laundry Service',
    'CLN_EXTRA_BATHROOM': 'Additional Bathroom',
  }
  return labels[key] || key
}

/**
 * Format unit size display
 */
function formatUnitSize(bedrooms: number, bathrooms: number): string {
  if (bedrooms === 0) return 'Studio'
  return `${bedrooms}BR / ${bathrooms}BA`
}

/**
 * Format cents to dollars
 */
export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
