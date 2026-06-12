-- Migration: Pricing unification — $1.75/lb wash & fold, +25% rush
-- Created: 2026-06-11
-- Purpose: Marketing pages, JSON-LD, and checkout previously disagreed
--          ($1.75 vs $2.15 per lb; flat $10 vs +25% rush). Decision:
--          $1.75/lb and percentage-based rush (+25%, applied in code via
--          quoteLaundry's rushService flag) are canonical.

-- 1) Ensure wash & fold per-pound rate is $1.75 (175 cents)
UPDATE pricing_rules
SET unit_price_cents = 175
WHERE unit_key = 'LND_WF_PERLB'
  AND service_type = 'LAUNDRY'
  AND active = true
  AND unit_price_cents <> 175;

-- 2) Deactivate the legacy flat $10 rush ADDON rule.
--    Rush is charged as +25% of subtotal in lib/pricing.ts (rushService flag);
--    leaving this addon active risks double-charging or contradictory pricing.
UPDATE pricing_rules
SET active = false
WHERE unit_key = 'LND_RUSH_24HR'
  AND unit_type = 'ADDON'
  AND active = true;

-- Verification (run manually):
-- SELECT unit_key, unit_type, unit_price_cents, active
-- FROM pricing_rules
-- WHERE unit_key IN ('LND_WF_PERLB', 'LND_RUSH_24HR');
