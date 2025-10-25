# Migration 035: API Implementation Guide

## Overview

This guide provides step-by-step instructions for updating `app/api/orders/route.ts` to support guest bookings and cancellation policy versioning introduced in Migration 035.

---

## Changes Required to `app/api/orders/route.ts`

### 1. Update Schema Validation

**Location:** Around line 176, replace `createOrderSchema` with:

```typescript
const createOrderSchema = z.object({
  service_type: z.enum(['LAUNDRY', 'CLEANING']),
  phone: z.string().optional(),
  
  // Guest booking fields (Migration 035)
  guest_name: z.string().optional(),
  guest_email: z.string().email().optional(),
  guest_phone: z.string()
    .regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +19171234567)')
    .optional(),
  
  // UTM tracking (Migration 035)
  utm_params: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
    term: z.string().optional(),
    content: z.string().optional(),
  }).optional(),
  
  slot: z.object({
    partner_id: z.string().uuid(),
    slot_start: z.string(),
    slot_end: z.string(),
  }),
  delivery_slot: z.object({
    slot_start: z.string(),
    slot_end: z.string(),
  }).optional(),
  address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    zip: z.string().length(5),
    buzzer: z.string().optional(),
    notes: z.string().optional(),
  }),
  details: z.object({
    serviceType: z.enum(['washFold', 'dryClean', 'mixed']).optional(),
    weightTier: z.enum(['small', 'medium', 'large']).optional(),
    lbs: z.number().optional(),
    bedrooms: z.number().optional(),
    bathrooms: z.number().optional(),
    deep: z.boolean().optional(),
    addons: z.array(z.string()).optional(),
  }),
}).refine(
  // Guest orders must have both email and phone
  (data) => {
    const hasGuestFields = data.guest_email || data.guest_phone || data.guest_name
    if (hasGuestFields) {
      return data.guest_email && data.guest_phone
    }
    return true
  },
  {
    message: 'Guest orders require both email and phone number',
    path: ['guest_email'],
  }
)
```

### 2. Update POST Function - Authentication Handling

**Location:** Around line 209, modify the auth check to be optional:

```typescript
export async function POST(request: NextRequest) {
  try {
    console.log('[POST /api/orders] Starting order creation')
    
    // Auth is optional for guest orders (Migration 035)
    let user = null
    let isGuestOrder = false
    
    try {
      user = await requireAuth()
      console.log('[POST /api/orders] User authenticated:', user.id)
    } catch (authError) {
      // Not authenticated - check if this is a guest order
      console.log('[POST /api/orders] No authentication, checking for guest order')
    }
    
    const body = await request.json()
    console.log('[POST /api/orders] Request body:', JSON.stringify(body, null, 2))
    
    // Determine if this is a guest order
    isGuestOrder = !!(body.guest_email && body.guest_phone)
    
    // Require auth if not a guest order
    if (!user && !isGuestOrder) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHENTICATED',
          message: 'Please log in or provide guest contact information'
        },
        { status: 401 }
      )
    }
    
    console.log('[POST /api/orders] Order type:', isGuestOrder ? 'GUEST' : 'AUTHENTICATED')
```

### 3. Fetch Active Cancellation Policy

**Location:** After capacity reservation (around line 322), add:

```typescript
// Fetch active cancellation policy (Migration 035)
console.log('[POST /api/orders] Fetching active cancellation policy...')
const { data: activePolicy, error: policyError } = await db
  .from('cancellation_policies')
  .select('id, version')
  .eq('service_type', params.service_type)
  .eq('active', true)
  .single()

if (policyError || !activePolicy) {
  console.warn('[POST /api/orders] No active policy found, proceeding without policy tracking')
}

console.log('[POST /api/orders] Active policy:', activePolicy)
```

### 4. Update Order Data Construction

**Location:** Around line 344, modify `orderData` to include new fields:

```typescript
const orderData: any = {
  // User or guest identification (Migration 035)
  user_id: user?.id || null,
  guest_name: params.guest_name || null,
  guest_email: params.guest_email || null,
  guest_phone: params.guest_phone || null,
  
  // Policy tracking (Migration 035)
  policy_id: activePolicy?.id || null,
  policy_version: activePolicy?.version || null,
  
  // UTM tracking (Migration 035)
  utm_params: params.utm_params || {},
  
  // Existing fields
  service_type: params.service_type,
  partner_id: params.slot.partner_id,
  slot_start: params.slot.slot_start,
  slot_end: params.slot.slot_end,
  delivery_slot_start: params.delivery_slot?.slot_start || null,
  delivery_slot_end: params.delivery_slot?.slot_end || null,
  status: initialStatus,
  subtotal_cents: pricing.subtotal_cents,
  tax_cents: pricing.tax_cents,
  delivery_cents: pricing.delivery_cents,
  total_cents: pricing.total_cents,
  stripe_customer_id: profile?.stripe_customer_id || null,
  idempotency_key: idempotencyKey,
  order_details: params.service_type === 'LAUNDRY' 
    ? { ...params.details, _deprecated_payment_flow: true, _created_via_deprecated_endpoint: new Date().toISOString() }
    : params.details,
  address_snapshot: {
    ...params.address,
    // Use guest phone or authenticated user phone
    phone: params.guest_phone || params.phone || user?.phone || undefined
  },
}
```

### 5. Update Order Event Logging

**Location:** Around line 378, update event logging:

```typescript
// Create order event
await db.from('order_events').insert({
  order_id: order.id,
  actor: user?.id || null,
  actor_role: isGuestOrder ? 'guest' : 'user',
  event_type: 'order_created',
  payload_json: { 
    pricing,
    policy_id: activePolicy?.id,
    policy_version: activePolicy?.version,
    is_guest: isGuestOrder,
  },
})
```

### 6. Update SMS Notification Logic

**Location:** Around line 430, handle guest orders:

```typescript
// Send SMS notification
const phoneToNotify = params.guest_phone || user?.phone
if (phoneToNotify) {
  await sendOrderCreatedSMS(
    phoneToNotify,
    order.id,
    params.service_type,
    params.slot.slot_start
  )
}
```

---

## Testing Checklist

### 1. Authenticated User Orders
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-auth-$(date +%s)" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "service_type": "CLEANING",
    "phone": "+19171234567",
    "slot": {
      "partner_id": "partner-uuid",
      "slot_start": "2025-11-01T10:00:00Z",
      "slot_end": "2025-11-01T12:00:00Z"
    },
    "address": {
      "line1": "123 Main St",
      "city": "New York",
      "zip": "10001"
    },
    "details": {
      "bedrooms": 2,
      "bathrooms": 1
    }
  }'
```

**Expected:** Order created with `user_id`, `policy_id`, and `policy_version`

### 2. Guest Orders
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-guest-$(date +%s)" \
  -d '{
    "service_type": "CLEANING",
    "guest_name": "Jane Doe",
    "guest_email": "jane@example.com",
    "guest_phone": "+19171234567",
    "utm_params": {
      "source": "google",
      "campaign": "fall2024"
    },
    "slot": {
      "partner_id": "partner-uuid",
      "slot_start": "2025-11-01T14:00:00Z",
      "slot_end": "2025-11-01T16:00:00Z"
    },
    "address": {
      "line1": "456 Broadway",
      "city": "New York",
      "zip": "10001"
    },
    "details": {
      "bedrooms": 1,
      "bathrooms": 1
    }
  }'
```

**Expected:** Order created with `user_id` NULL, guest fields populated, `policy_id`, `policy_version`, and `utm_params`

### 3. Invalid Guest Order (Missing Phone)
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-invalid-$(date +%s)" \
  -d '{
    "service_type": "CLEANING",
    "guest_name": "Jane Doe",
    "guest_email": "jane@example.com",
    "slot": {...},
    "address": {...},
    "details": {...}
  }'
```

**Expected:** 400 error with message "Guest orders require both email and phone number"

### 4. Verify Database

After running tests, verify in database:

```sql
-- Check guest order
SELECT 
  id, 
  user_id, 
  guest_name, 
  guest_email, 
  guest_phone,
  policy_id,
  policy_version,
  utm_params
FROM orders 
WHERE guest_email = 'jane@example.com';

-- Verify policy reference
SELECT 
  o.id as order_id,
  o.service_type,
  o.policy_version,
  cp.version as current_policy_version,
  cp.cancellation_fee_percent
FROM orders o
LEFT JOIN cancellation_policies cp ON o.policy_id = cp.id
WHERE o.guest_email = 'jane@example.com';
```

---

## Error Handling

### Common Issues

1. **Missing Policy**: If no active policy exists, order creation should still proceed but log a warning
2. **Invalid Phone Format**: Zod validation will catch E.164 format violations
3. **Missing Guest Info**: Schema refinement ensures both email and phone are present for guest orders
4. **Constraint Violation**: Database will enforce `orders_user_or_guest_required` constraint

### Logging

Add comprehensive logging:
```typescript
console.log('[POST /api/orders] Order type:', isGuestOrder ? 'GUEST' : 'AUTHENTICATED')
console.log('[POST /api/orders] Policy tracking:', { 
  policy_id: activePolicy?.id, 
  version: activePolicy?.version 
})
console.log('[POST /api/orders] UTM params:', params.utm_params)
```

---

## Rollback Plan

If issues arise:

1. **Revert API changes**: Use git to revert `app/api/orders/route.ts`
2. **Run rollback migration**: 
   ```bash
   psql <connection-string> < supabase/migrations/035_guest_booking_rollback.sql
   ```
3. **Clear failed orders**: Clean up any test orders created during development

---

## Next Steps After API Update

1. **Update Frontend Forms**
   - Add guest checkout form components
   - Implement phone number validation (E.164)
   - Add UTM parameter capture from URL

2. **Create Guest Order Lookup**
   - New API endpoint: `GET /api/orders/guest/lookup?email=...&order_id=...`
   - Secure token-based access
   - Email verification flow

3. **Update Admin Interface**
   - Display guest contact info in order details
   - Show policy version used
   - Filter by guest vs. authenticated orders

4. **Update Cancellation Logic**
   - Modify `lib/cancellationFees.ts` to read policy from database
   - Use `order.policy_id` instead of hardcoded values
   - Respect policy version that was active at order creation

---

## Implementation Timeline

- **Phase 1** (1-2 hours): Update schema and POST function
- **Phase 2** (1 hour): Add policy fetching and tracking
- **Phase 3** (1 hour): Testing and verification
- **Phase 4** (2-3 hours): Frontend integration

**Total Estimated Time**: 5-7 hours

---

## Support & Questions

For issues:
1. Check migration verification: `node scripts/run-migration-035.js`
2. Review database constraints: `\d orders` in psql
3. Test with sample data before production deployment
4. Monitor logs for policy tracking and guest order creation

---

**Status**: Ready for implementation after Migration 035 is applied to database.
