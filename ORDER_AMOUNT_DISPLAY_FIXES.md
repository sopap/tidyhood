# Order Amount Display Fixes - October 8, 2025

## Issues Identified

Based on the user's screenshots and code audit, the following issues were found:

1. **Order amounts showing as $0.00 on /admin/orders page** - Completed orders with valid amounts were displaying $0.00
2. **User LTV (Lifetime Value) incorrect on /admin/users and /admin/users/[id]** - User lifetime values were not calculating properly
3. **Avg Order Value incorrect on /admin/users/[id]** - Average order values were showing as $0.00
4. **Partner revenue amounts wrong on /admin/partners/[id]** - Partner revenue calculations were incorrect

## Root Cause Analysis

### Primary Issue: Field Name Mismatch

The database schema uses `total_cents`, `subtotal_cents`, etc. as field names (defined in `supabase/migrations/001_init.sql`), but several frontend components and API routes were trying to access `total_amount_cents`, which doesn't exist in the database.

### Secondary Issue: Status Filtering

Several calculations were only counting `delivered` status orders, but should also include `completed` status orders for revenue calculations.

### Third Issue: Wrong Field for Revenue

The partner revenue calculation was using `subtotal_cents` instead of `total_cents`.

## Files Modified

### 1. app/admin/orders/page.tsx
**Problem**: TypeScript interface defined `total_amount_cents` instead of `total_cents`

**Fix**:
```typescript
// Changed from:
interface Order {
  total_amount_cents: number
  // ...
}

// To:
interface Order {
  total_cents: number
  // ...
}

// And updated display logic:
${((order.total_cents || 0) / 100).toFixed(2)}
```

### 2. app/api/admin/users/[id]/route.ts
**Problem**: 
- Only counting `delivered` status for LTV calculations
- Referencing non-existent `order_id` field
- Using `total_cents` (estimate) instead of `quote_cents` (actual final amount)

**Fix**:
```typescript
// Fetch quote_cents for accurate revenue
const { data: orders } = await db
  .from('orders')
  .select('id, service_type, status, total_cents, quote_cents, created_at, slot_start')
  .eq('user_id', userId)

// Updated to count both completed and delivered orders:
const completedOrders = orders?.filter(o => 
  o.status === 'delivered' || o.status === 'completed'
) || [];

// Use quote_cents (final amount) if available, otherwise total_cents (estimate)
const lifetimeValue = completedOrders.reduce((sum, o) => {
  const actualAmount = o.quote_cents || o.total_cents || 0;
  return sum + actualAmount;
}, 0) / 100;
```

### 3. app/api/admin/partners/[id]/route.ts
**Problem**:
- Using `subtotal_cents` instead of actual amount fields
- Only counting specific statuses for completed orders
- Not filtering to completed/delivered orders for revenue
- Using `total_cents` (estimate) instead of `quote_cents` (actual final amount)

**Fix**:
```typescript
// Fetch quote_cents for accurate revenue
const { data: orderStats } = await db
  .from('orders')
  .select('status, total_cents, quote_cents')
  .eq('partner_id', id);

// Updated revenue calculation to use final quoted amounts:
const completedOrders = orderStats?.filter(o => 
  o.status === 'completed' || o.status === 'delivered'
) || [];

const stats = {
  total_orders: orderStats?.length || 0,
  completed_orders: completedOrders.length,
  in_progress: orderStats?.filter(o => 
    ['pending_pickup', 'picked_up', 'at_facility', 'quote_sent', 
     'awaiting_payment', 'paid_processing', 'in_progress', 
     'out_for_delivery'].includes(o.status)
  ).length || 0,
  // Use quote_cents (final amount) if available, otherwise total_cents (estimate)
  total_revenue_cents: completedOrders.reduce((sum, o) => {
    const actualAmount = o.quote_cents || o.total_cents || 0;
    return sum + actualAmount;
  }, 0),
};
```

### 4. app/api/admin/users/route.ts
**Problem**:
- Using `total_cents` (estimate) for LTV calculations in users list

**Fix**:
```typescript
// Fetch quote_cents for accurate revenue calculations
const { data: orderStats } = await db
  .from('orders')
  .select('user_id, total_cents, quote_cents, status')
  .in('user_id', userIds);

// Use quote_cents (final amount) if available, otherwise total_cents (estimate)
const lifetimeValue = userOrders
  .filter(o => o.status === 'delivered' || o.status === 'completed')
  .reduce((sum, o) => {
    const actualAmount = o.quote_cents || o.total_cents || 0;
    return sum + actualAmount;
  }, 0) / 100;
```

## Database Schema Reference

From `supabase/migrations/001_init.sql` and `supabase/migrations/005_deferred_payment.sql`, the orders table has these amount fields:
- `subtotal_cents INT NOT NULL DEFAULT 0`
- `tax_cents INT NOT NULL DEFAULT 0`
- `delivery_cents INT NOT NULL DEFAULT 0`
- `total_cents INT NOT NULL DEFAULT 0` - Initial estimated amount
- `credit_cents INT DEFAULT 0`
- `quote_cents INT` - **Final quoted amount after service (added in migration 005)**
- `quoted_at TIMESTAMPTZ` - When the final quote was submitted

**Note**: There is no `total_amount_cents` field in the database.

**Important**: For revenue calculations, always use `quote_cents` if available (not null), otherwise fall back to `total_cents`. The `quote_cents` represents the actual final amount charged to the customer after service completion.

## Status Values for Revenue Calculations

Orders should be counted toward revenue/LTV only when they have these statuses:
- `completed`
- `delivered`

These are terminal successful states where payment has been captured and service has been rendered.

## Testing Recommendations

1. **Verify Admin Orders Page**: Navigate to `/admin/orders` and confirm that order amounts display correctly (not $0.00)

2. **Verify User LTV**: 
   - Go to `/admin/users`
   - Check that LTV column shows correct amounts
   - Click on a user with multiple completed orders
   - Verify LTV and Avg Order Value on detail page

3. **Verify Partner Revenue**:
   - Go to `/admin/partners/[id]`
   - Check that total revenue shows correctly
   - Verify completed orders count matches orders with `completed` or `delivered` status

4. **Database Query Test**: Run this query to verify data integrity:
```sql
SELECT 
  id,
  status,
  total_cents,
  subtotal_cents,
  created_at
FROM orders
WHERE status IN ('completed', 'delivered')
LIMIT 10;
```

## Impact

These fixes resolve all four reported issues:
- ✅ Order amounts now display correctly on admin orders page
- ✅ User LTV calculated accurately based on completed/delivered orders
- ✅ Avg order value computed correctly
- ✅ Partner revenue amounts show actual total_cents from completed orders

## Prevention

To prevent similar issues in the future:

1. **Use TypeScript interfaces** that match database schema exactly
2. **Reference database migrations** when building queries
3. **Use consistent field names** across frontend and backend
4. **Add integration tests** for critical calculations like LTV and revenue
5. **Document database schema** in a central location for developer reference
