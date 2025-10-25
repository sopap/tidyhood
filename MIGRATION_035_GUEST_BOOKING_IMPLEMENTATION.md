# Migration 035: Guest Booking and Cancellation Policy Versioning

## Overview

This migration enables guest checkout functionality (no login required) and implements cancellation policy versioning to track which policy was active when each order was created.

**Date:** October 25, 2025  
**Status:** ✅ Complete - Ready for deployment  
**Migration Files:**
- `supabase/migrations/035_guest_booking_and_policy_versioning.sql`
- `supabase/migrations/035_guest_booking_rollback.sql`
- `scripts/run-migration-035.js`

---

## Changes Summary

### 1. Orders Table Modifications

#### New Columns
- **`guest_name`** (TEXT): Full name of guest customer
- **`guest_email`** (TEXT): Email address for order notifications
- **`guest_phone`** (TEXT): Phone number in E.164 format (e.g., +19171234567)
- **`policy_id`** (UUID): Foreign key to `cancellation_policies.id`
- **`policy_version`** (INT): Version number of policy at order creation time
- **`utm_params`** (JSONB): Marketing attribution parameters

#### Constraints
- **`orders_user_or_guest_required`**: Ensures order has EITHER `user_id` OR both `guest_email` AND `guest_phone`
- **`orders_guest_phone_e164_format`**: Validates phone format: `^\+[1-9]\d{1,14}$`

#### Indexes
- `idx_orders_guest_email` - Partial index for guest email lookups
- `idx_orders_guest_email_created` - Composite index for guest order history
- `idx_orders_policy_id` - Policy reference lookups
- `idx_orders_policy_version` - Policy version queries

### 2. Cancellation Policies Table Updates

#### New Columns
- **`version`** (INT, NOT NULL, DEFAULT 1): Policy version number

#### Constraint Changes
- Replaced `unique_active_policy_per_service` with `unique_active_policy_service_version`
- Ensures only one active policy per service type at a time

#### Indexes
- `idx_cancellation_policies_version` - Version-based queries

### 3. Helper Functions

#### `get_active_policy_with_version(service_type TEXT)`
Returns the currently active policy with version for a given service type.

```sql
SELECT * FROM get_active_policy_with_version('CLEANING');
```

#### `is_guest_order(order_row orders)`
Boolean function to check if an order is a guest order.

```sql
SELECT is_guest_order(orders.*) FROM orders WHERE id = 'order-uuid';
```

### 4. RLS Policy Updates

- Modified `orders_read_own` → `orders_read_own_or_guest`
- Maintains security while preparing for guest access (requires application-layer token validation)

### 5. Audit Trigger

- Automatically logs policy changes to `order_events` table
- Tracks when `policy_id` or `policy_version` changes on orders

---

## Running the Migration

### Option 1: Supabase CLI (Recommended)
```bash
supabase db push
```

### Option 2: Supabase Dashboard
1. Go to SQL Editor
2. Copy contents of `supabase/migrations/035_guest_booking_and_policy_versioning.sql`
3. Execute

### Option 3: Direct PostgreSQL
```bash
psql <connection-string> < supabase/migrations/035_guest_booking_and_policy_versioning.sql
```

### Verification
```bash
node scripts/run-migration-035.js
```

This script will:
- Verify schema changes were applied
- Test constraint enforcement
- Display example usage
- Provide next steps

---

## Usage Examples

### Creating Orders

#### Authenticated User Order
```sql
INSERT INTO orders (
  user_id,
  service_type,
  slot_start,
  slot_end,
  status,
  total_cents,
  policy_id,
  policy_version
) VALUES (
  'user-uuid',
  'CLEANING',
  NOW(),
  NOW() + INTERVAL '2 hours',
  'PENDING',
  15000,
  (SELECT id FROM cancellation_policies WHERE service_type = 'CLEANING' AND active = true),
  (SELECT version FROM cancellation_policies WHERE service_type = 'CLEANING' AND active = true)
);
```

#### Guest Order
```sql
INSERT INTO orders (
  guest_name,
  guest_email,
  guest_phone,
  service_type,
  slot_start,
  slot_end,
  status,
  total_cents,
  policy_id,
  policy_version,
  utm_params
) VALUES (
  'Jane Doe',
  'jane@example.com',
  '+19171234567',
  'CLEANING',
  NOW(),
  NOW() + INTERVAL '2 hours',
  'PENDING',
  15000,
  (SELECT id FROM cancellation_policies WHERE service_type = 'CLEANING' AND active = true),
  (SELECT version FROM cancellation_policies WHERE service_type = 'CLEANING' AND active = true),
  '{"source": "google", "campaign": "fall2024"}'::JSONB
);
```

### Querying Orders

#### Find Guest Orders by Email
```sql
SELECT * FROM orders 
WHERE guest_email = 'jane@example.com'
ORDER BY created_at DESC;
```

#### Find Orders Using Specific Policy Version
```sql
SELECT o.*, cp.cancellation_fee_percent 
FROM orders o
JOIN cancellation_policies cp ON o.policy_id = cp.id
WHERE o.policy_version = 2;
```

#### Check Guest vs Authenticated Orders
```sql
SELECT 
  COUNT(*) FILTER (WHERE user_id IS NULL) as guest_orders,
  COUNT(*) FILTER (WHERE user_id IS NOT NULL) as auth_orders
FROM orders;
```

---

## Constraint Validation

### ✅ Valid Orders

```sql
-- Authenticated user
INSERT INTO orders (user_id, ...) VALUES ('uuid', ...);

-- Guest with both email and phone
INSERT INTO orders (guest_email, guest_phone, ...) VALUES ('email@example.com', '+19171234567', ...);
```

### ❌ Invalid Orders (Will Fail)

```sql
-- No user_id and no guest info
INSERT INTO orders (service_type, ...) VALUES ('CLEANING', ...);

-- Guest with only email
INSERT INTO orders (guest_email, ...) VALUES ('email@example.com', ...);

-- Guest with only phone
INSERT INTO orders (guest_phone, ...) VALUES ('+19171234567', ...);

-- Invalid phone format
INSERT INTO orders (guest_email, guest_phone, ...) 
VALUES ('email@example.com', '917-123-4567', ...); -- Missing +1, has dashes
```

---

## Rollback Procedure

If you need to revert this migration:

```bash
psql <connection-string> < supabase/migrations/035_guest_booking_rollback.sql
```

**Warning:** This will:
- Remove all guest order fields
- Remove policy versioning columns
- Drop all new indexes and constraints
- Restore original schema

---

## Next Steps

### 1. Update Order Creation API

Modify `app/api/orders/route.ts` to:
- Accept guest contact information
- Capture active policy ID and version
- Store UTM parameters

```typescript
// When creating order, fetch active policy
const { data: policy } = await supabase
  .from('cancellation_policies')
  .select('id, version')
  .eq('service_type', serviceType)
  .eq('active', true)
  .single();

// Include in order creation
const orderData = {
  ...baseOrderData,
  policy_id: policy.id,
  policy_version: policy.version,
  // For guest orders:
  guest_name: req.body.guestName,
  guest_email: req.body.guestEmail,
  guest_phone: req.body.guestPhone,
  utm_params: req.body.utmParams || {}
};
```

### 2. Update Cancellation Logic

Modify `lib/cancellationFees.ts` to read from database instead of hardcoded values:

```typescript
export async function getCancellationPolicy(order: Order): Promise<CancellationPolicy> {
  // Use order's stored policy_id instead of hardcoded logic
  const { data: policy } = await supabase
    .from('cancellation_policies')
    .select('*')
    .eq('id', order.policy_id)
    .single();
    
  // Calculate based on policy.cancellation_fee_percent, policy.notice_hours, etc.
}
```

### 3. Implement Guest Checkout Flow

Create components:
- `components/booking/GuestCheckoutForm.tsx` - Collect guest contact info
- `components/booking/GuestOrderLookup.tsx` - Find orders by email + order ID

Update booking flow:
- `app/book/[service]/page.tsx` - Add guest checkout option
- Add phone number validation (E.164 format)
- Email verification for guest orders

### 4. Guest Order Management

Create API endpoints:
- `app/api/orders/guest/lookup/route.ts` - Find guest orders
- Implement secure token-based access for guest order viewing
- Email confirmation with order lookup link

### 5. Admin Interface Updates

Update admin order views:
- Display guest name/email/phone for guest orders
- Show policy version used for each order
- Filter orders by guest status

### 6. Analytics & UTM Tracking

Implement UTM parameter capture:
- Parse URL parameters on booking page
- Store in `utm_params` JSONB field
- Report on marketing attribution

### 7. Testing

Create tests:
- Guest order creation with valid data
- Constraint violation tests
- Guest order lookup functionality
- Policy versioning edge cases

---

## Database Schema Reference

### Orders Table (Relevant Columns)
```sql
orders (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),  -- Can be NULL for guest orders
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,                       -- E.164 format
  policy_id UUID REFERENCES cancellation_policies(id),
  policy_version INT,
  utm_params JSONB DEFAULT '{}'::JSONB,
  ...
  CONSTRAINT orders_user_or_guest_required CHECK (
    user_id IS NOT NULL OR 
    (guest_email IS NOT NULL AND guest_phone IS NOT NULL)
  )
)
```

### Cancellation Policies Table
```sql
cancellation_policies (
  id UUID PRIMARY KEY,
  service_type TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  notice_hours INT NOT NULL DEFAULT 24,
  cancellation_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 0.15,
  reschedule_notice_hours INT NOT NULL DEFAULT 24,
  reschedule_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  allow_cancellation BOOLEAN NOT NULL DEFAULT TRUE,
  allow_rescheduling BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  ...
  CONSTRAINT unique_active_policy_service_version 
    UNIQUE(service_type, active) WHERE active = TRUE
)
```

---

## Migration Metadata

- **Migration Number:** 035
- **Dependencies:** Migration 033 (Admin Settings Infrastructure)
- **Breaking Changes:** None (backward compatible)
- **Data Migration:** Existing orders populated with policy_id and policy_version = 1
- **Performance Impact:** Minimal (new indexes improve query performance)

---

## Security Considerations

1. **Guest Order Access:** RLS policies updated but guest access requires application-layer token validation
2. **Phone Validation:** E.164 format enforced at database level
3. **Email Validation:** Should be enforced at application layer
4. **PII Protection:** Guest contact info should be handled according to privacy policy
5. **Rate Limiting:** Implement rate limiting on guest order creation endpoints

---

## Support

For issues or questions:
1. Check migration verification output: `node scripts/run-migration-035.js`
2. Review Supabase dashboard logs
3. Test constraints with sample data
4. Refer to existing migration patterns (033_admin_settings_infrastructure.sql)

---

**Migration completed successfully! 🎉**

All files created and ready for deployment.
