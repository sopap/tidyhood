import { getServiceClient } from './db'

/**
 * Fetch laundry pricing for marketing/display purposes
 * Returns current active pricing from database
 */
export async function getLaundryDisplayPricing() {
  const db = getServiceClient()
  
  try {
    // Fetch per-pound rate
    const { data: perLbRule } = await db
      .from('pricing_rules')
      .select('unit_price_cents')
      .eq('unit_key', 'LND_WF_PERLB')
      .eq('service_type', 'LAUNDRY')
      .eq('active', true)
      .single()
    
    // Fetch minimum weight in lbs
    const { data: minWeightRule } = await db
      .from('pricing_rules')
      .select('unit_price_cents')
      .eq('unit_key', 'LND_WF_MIN_LBS')
      .eq('service_type', 'LAUNDRY')
      .eq('active', true)
      .single()
    
    const perLbCents = perLbRule?.unit_price_cents || 215 // Default to $2.15
    const minWeightLbs = (minWeightRule?.unit_price_cents || 1500) / 100 // Weight stored as cents for consistency (15 lbs = 1500)
    const minOrderCents = Math.ceil(minWeightLbs * perLbCents) // Calculate minimum order price from weight
    
    return {
      perLbPrice: perLbCents / 100,
      perLbPriceFormatted: `$${(perLbCents / 100).toFixed(2)}`,
      minWeightLbs: minWeightLbs,
      minOrderPrice: minOrderCents / 100,
      minOrderPriceFormatted: `$${(minOrderCents / 100).toFixed(2)}`,
    }
  } catch (error) {
    console.error('Error fetching laundry pricing:', error)
    // Return defaults if database fails
    return {
      perLbPrice: 2.15,
      perLbPriceFormatted: '$2.15',
      minWeightLbs: 15,
      minOrderPrice: 32.25,
      minOrderPriceFormatted: '$32.25',
    }
  }
}

/**
 * Fetch cleaning pricing for marketing/display purposes
 * Returns current active pricing from database
 */
export async function getCleaningDisplayPricing() {
  const db = getServiceClient()
  
  try {
    // Fetch studio pricing
    const { data: studioRule } = await db
      .from('pricing_rules')
      .select('unit_price_cents')
      .eq('unit_key', 'CLN_STD_STUDIO')
      .eq('service_type', 'CLEANING')
      .eq('active', true)
      .single()
    
    // Fetch 1BR pricing
    const { data: oneBrRule } = await db
      .from('pricing_rules')
      .select('unit_price_cents')
      .eq('unit_key', 'CLN_STD_1BR')
      .eq('service_type', 'CLEANING')
      .eq('active', true)
      .single()
    
    // Fetch 2BR pricing
    const { data: twoBrRule } = await db
      .from('pricing_rules')
      .select('unit_price_cents')
      .eq('unit_key', 'CLN_STD_2BR')
      .eq('service_type', 'CLEANING')
      .eq('active', true)
      .single()
    
    const studioCents = studioRule?.unit_price_cents || 8900 // Default to $89
    const oneBrCents = oneBrRule?.unit_price_cents || 11900 // Default to $119
    const twoBrCents = twoBrRule?.unit_price_cents || 14900 // Default to $149
    
    return {
      studioPrice: studioCents / 100,
      studioPriceFormatted: `$${(studioCents / 100).toFixed(0)}`,
      oneBrPrice: oneBrCents / 100,
      oneBrPriceFormatted: `$${(oneBrCents / 100).toFixed(0)}`,
      twoBrPrice: twoBrCents / 100,
      twoBrPriceFormatted: `$${(twoBrCents / 100).toFixed(0)}`,
      startingFromPrice: Math.min(studioCents, oneBrCents, twoBrCents) / 100,
      startingFromPriceFormatted: `$${(Math.min(studioCents, oneBrCents, twoBrCents) / 100).toFixed(0)}`,
    }
  } catch (error) {
    console.error('Error fetching cleaning pricing:', error)
    // Return defaults if database fails
    return {
      studioPrice: 89,
      studioPriceFormatted: '$89',
      oneBrPrice: 119,
      oneBrPriceFormatted: '$119',
      twoBrPrice: 149,
      twoBrPriceFormatted: '$149',
      startingFromPrice: 89,
      startingFromPriceFormatted: '$89',
    }
  }
}
