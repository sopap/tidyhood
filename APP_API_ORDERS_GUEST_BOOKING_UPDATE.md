# app/api/orders/route.ts - Guest Booking Implementation

## Overview

Complete refactor of the order creation API to support guest bookings (no authentication required) and policy version locking.

---

## Step 1: Create Validation Helpers

**File:** `lib/validation/guestBooking.ts` (NEW FILE)

```typescript
/**
 * Guest booking validation helpers
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhone(phone: string): boolean {
  // E.164 format: +[country code][number]
  // Examples: +19171234567, +442071234567
  const e164Regex = /^\+[1-9]\d{10,14}$/
  return e164Regex.test(phone)
}

export function validateGuestInfo(
  guest_email?: string | null,
  guest_phone?: string | null,
  guest_name?: string | null
): { valid: boolean; error?: string } {
  if (!guest_email || !guest_phone || !guest_name) {
    return {
      valid: false,
      error: 'Guest bookings require email, phone, and name'
    }
  }
  
  if (!isValidEmail(guest_email)) {
    return {
      valid: false,
      error: 'Invalid email address format'
    }
  }
  
  if (!isValidPhone(guest_phone)) {
    return {
      valid: false,
      error: 'Phone must be in E.164 format (e.g., +19171234567)'
    }
  }
  
  if (guest_name.trim().length < 2) {
    return {
      valid: false,
      error: 'Guest name must be at least 2 characters'
    }
  }
  
  return { valid: true }
}
```

---

## Step 2: Update POST Function in app/api/orders/route.ts

### Change 1: Make Authentication Optional

**BEFORE (Line ~209):**
```typescript
export async function POST(request: NextRequest) {
  try {
    console.log('[POST /api/orders] Starting order creation')
    const user = await requireAuth()
    console.log('[POST /api/orders] User authenticated:', user.id)
```

**AFTER:**
```typescript
export async function POST(request: NextRequest) {
  try {
    console.log('[POST /api/orders] Starting order creation')
    
    // Authentication is optional for guest bookings (Migration 035)
    let user = null
    let isGuestOrder = false
    
    try {
      user = await requireAuth()
      console.log('[POST /api/orders] User authenticated:', user.id)
    } catch (authError) {
      // Not authenticated - might be a guest order
      console.log('[POST /api/orders] No authentication, checking for guest booking')
    }
```

### Change 2: Add Guest Validation

**INSERT AFTER** parsing the body (around line 215):

```typescript
    const body = await request.json()
    console.log('[POST /api/orders] Request body:', JSON.stringify(body, null, 2))
    
    // Determine if this is a guest order (Migration 035)
    isGuestOrder = !user && !!(body.guest_email && body.guest_phone)
    
    // Validate: must have EITHER user OR guest info
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
    
    // Validate guest contact info if provided
    if (isGuestOrder) {
      const { valid, error: validationError } = validateGuestInfo(
        body.guest_email,
        body.guest_phone,
        body.guest_name
      )
      
      if (!valid) {
        return NextResponse.json(
          { 
            error: validationError,
            code: 'INVALID_GUEST_INFO'
          },
          { status: 400 }
        )
      }
    }
    
    console.log('[POST /api/orders] Order type:', isGuestOrder ? 'GUEST' : 'AUTHENTICATED')
```

### Change 3: Fetch Active Policy

**INSERT AFTER** capacity reservation (around line 322):

```typescript
    console.log('[POST /api/orders] Capacity reserved:', reserved)
    
    if (!reserved) {
      throw new ConflictError('Selected time slot is no longer available', 'SLOT_FULL')
    }
    
    // Fetch active cancellation policy (Migration 035)
    console.log('[POST /api/orders] Fetching active cancellation policy...')
    const { data: activePolicy, error: policyError } = await db
      .from('cancellation_policies')
      .select('id, version')
      .eq('service_type', params.service_type)
      .eq('active', true)
      .order('effective_at', { ascending: false })
      .limit(1)
      .single()
    
    if (policyError || !activePolicy) {
      console.error('[POST /api/orders] No active policy found:', policyError)
      // Continue without policy (will log warning)
    } else {
      console.log('[POST /api/orders] Active policy:', {
        policy_id: activePolicy.id,
        version: activePolicy.version
      })
    }
    
    // Fetch user profile to get stripe_customer_id (only for authenticated users)
    let profile = null
    if (user) {
      const { data: profileData } = await db
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single()
      profile = profileData
    }
```

### Change 4: Update Order Data Construction

**REPLACE** the orderData object (around line 344):

```typescript
    const orderData: any = {
      // User or guest identification (Migration 035)
      user_id: user?.id || null,
      guest_name: body.guest_name || null,
      guest_email: body.guest_email || null,
      guest_phone: body.guest_phone || null,
      
      // Policy tracking (Migration 035)
      policy_id: activePolicy?.id || null,
      policy_version: activePolicy?.version || null,
      
      // UTM tracking (Migration 035)
      utm_params: body.utm_params || {},
      
      // Service details
      service_type: params.service_type,
      partner_id: params.slot.partner_id,
      slot_start: params.slot.slot_start,
      slot_end: params.slot.slot_end,
      delivery_slot_start: params.delivery_slot?.slot_start || null,
      delivery_slot_end: params.delivery_slot?.slot_end || null,
      
      // Status
      status: initialStatus,
      
      // Pricing
      subtotal_cents: pricing.subtotal_cents,
      tax_cents: pricing.tax_cents,
      delivery_cents: pricing.delivery_cents,
      total_cents: pricing.total_cents,
      
      // Payment (only for authenticated users)
      stripe_customer_id: profile?.stripe_customer_id || null,
      
      // Metadata
      idempotency_key: idempotencyKey,
      order_details: params.service_type === 'LAUNDRY' 
        ? { 
            ...params.details, 
            _deprecated_payment_flow: true, 
            _created_via_deprecated_endpoint: new Date().toISOString(),
            _is_guest_order: isGuestOrder
          }
        : { 
            ...params.details,
            _is_guest_order: isGuestOrder
          },
      address_snapshot: {
        ...params.address,
        // Use guest phone or authenticated user phone
        phone: body.guest_phone || params.phone || user?.phone || undefined
      },
    }
    
    // Set cleaning_status for cleaning orders
    if (params.service_type === 'CLEANING') {
      orderData.cleaning_status = 'scheduled'
    }
```

### Change 5: Update Order Event Logging

**REPLACE** the order event creation (around line 378):

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
        guest_email: isGuestOrder ? body.guest_email : undefined,
      },
    })
```

### Change 6: Update SMS Notification

**REPLACE** SMS notification (around line 430):

```typescript
    // Send SMS notification (to guest_phone or user phone)
    const phoneToNotify = body.guest_phone || user?.phone
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

## Step 3: Update Schema Definition

**UPDATE** `createOrderSchema` (around line 176) - Already done in previous attempt, keep:

```typescript
const createOrderSchema = z.object({
  service_type: z.enum(['LAUNDRY', 'CLEANING']),
  phone: z.string().optional(),
  
  // Guest booking fields (Migration 035)
  guest_name: z.string().optional(),
  guest_email: z.string().email().optional(),
  guest_phone: z.string()
    .regex(/^\+[1-9]\d{10,14}$/, 'Phone must be in E.164 format')
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
})
```

---

## Step 4: Add Import

**ADD** at top of file:

```typescript
import { validateGuestInfo } from '@/lib/validation/guestBooking'
```

---

## Testing

### Test 1: Authenticated User Order (Existing Behavior)
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Cookie: session-cookie" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{
    "service_type": "CLEANING",
    "slot": {
      "partner_id": "uuid",
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

Expected: Order created with user_id, policy_id, policy_version

### Test 2: Guest Order
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
      "partner_id": "uuid",
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

Expected: Order created with user_id NULL, guest fields populated

### Test 3: Invalid Guest Order (Missing Phone)
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-invalid-$(date +%s)" \
  -d '{
    "service_type": "CLEANING",
    "guest_name": "Jane Doe",
    "guest_email": "jane@example.com",
    ...
  }'
```

Expected: 400 error "Guest bookings require email, phone, and name"

### Test 4: Invalid Email Format
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-invalid-email-$(date +%s)" \
  -d '{
    "service_type": "CLEANING",
    "guest_name": "Jane Doe",
    "guest_email": "invalid-email",
    "guest_phone": "+19171234567",
    ...
  }'
```

Expected: 400 error "Invalid email address format"

---

## Database Verification

After creating orders, verify in database:

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
  utm_params,
  created_at
FROM orders 
WHERE guest_email = 'jane@example.com';

-- Verify policy locking
SELECT 
  o.id,
  o.service_type,
  o.policy_version as order_policy_version,
  cp.version as current_policy_version,
  cp.cancellation_fee_percent
FROM orders o
LEFT JOIN cancellation_policies cp ON o.policy_id = cp.id
WHERE o.guest_email = 'jane@example.com';

-- Count guest vs authenticated orders
SELECT 
  COUNT(*) FILTER (WHERE user_id IS NULL) as guest_orders,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as auth_orders
FROM orders;
```

---

## Complete Code Changes Summary

### Files to Create:
1. `lib/validation/guestBooking.ts` - Validation helpers

### Files to Modify:
1. `app/api/orders/route.ts` - Main changes:
   - Make authentication optional
   - Add guest validation
   - Fetch active policy
   - Update orderData to include guest fields, policy tracking, UTM params
   - Update event logging
   - Update SMS notification logic

### Key Changes in Order Data:
```typescript
{
  user_id: user?.id || null,           // ← Can be NULL
  guest_name: body.guest_name || null, // ← NEW
  guest_email: body.guest_email || null, // ← NEW
  guest_phone: body.guest_phone || null, // ← NEW
  policy_id: activePolicy?.id || null,  // ← NEW
  policy_version: activePolicy?.version || null, // ← NEW
  utm_params: body.utm_params || {},    // ← NEW
  // ... existing fields
}
```

---

## Rollback Plan

If issues arise:
1. Revert `app/api/orders/route.ts` via git
2. Remove `lib/validation/guestBooking.ts`
3. Guest bookings will be disabled (auth required again)
4. Database migration stays (doesn't need rollback)

---

## Next Steps After Implementation

1. Test all scenarios (authenticated, guest, invalid data)
2. Verify policy_id and policy_version are stored
3. Test with old code paths (backward compatibility)
4. Create integration tests
5. Update frontend to support guest checkout flow
6. Add guest order lookup functionality

---

**Implementation Complexity: Medium-High**
**Estimated Time: 2-3 hours**
**Risk Level: Medium (affects order creation)**

**Recommendation:** Implement in feature branch, test thoroughly before merging to main.
