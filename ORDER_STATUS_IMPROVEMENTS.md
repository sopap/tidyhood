# Order Status Improvements

## Problem Statement

Orders were being marked as "Completed" too early in the lifecycle, before actual service completion. Specifically:

- **Laundry orders** appeared as "Completed" after payment, even though items hadn't been cleaned or delivered yet
- **Cleaning orders** appeared as "Completed" when they were just awaiting payment
- This confused customers who saw "Completed" for orders that were still in progress

## Root Cause

The order grouping logic in `lib/orders.ts` incorrectly treated both `completed` AND `awaiting_payment` statuses as completed:

```typescript
// OLD (INCORRECT) LOGIC
else if ((order.status === 'completed' || order.status === 'awaiting_payment') && isRecent) {
  grouped.completed.push(order);
}
```

This didn't align with the actual business logic - orders should only be "complete" when:
- **LAUNDRY**: Items are delivered back to the customer
- **CLEANING**: Service is finished at the location

## Solution Overview

### 1. New Order Statuses Added

**For Laundry:**
- `in_progress` - For cleaning services actively being performed (primarily for cleaning, but available for laundry)
- `out_for_delivery` - Clean laundry is being delivered back to customer
- `delivered` - **ACTUAL COMPLETION** - Items returned to customer

**For Cleaning:**
- `in_progress` - Cleaner is actively working on the job
- `completed` - **ACTUAL COMPLETION** - Service is finished

### 2. Complete Order Lifecycle

#### Laundry Flow:
```
pending 
  → pending_pickup (scheduled)
  → at_facility (received items)
  → awaiting_payment (weighed, quote ready)
  → paid_processing (payment received, processing items)
  → out_for_delivery (clean items on the way)
  → delivered ✓ (COMPLETE - items back with customer)
```

#### Cleaning Flow:
```
pending
  → pending_pickup (scheduled visit)
  → in_progress (cleaner actively working)
  → completed ✓ (COMPLETE - service finished)
```

## Files Changed

### 1. `lib/types.ts`
- **Change**: Added `in_progress`, `out_for_delivery`, `delivered` to `OrderStatus` type
- **Why**: TypeScript needs to know about the new statuses

### 2. `lib/orders.ts`

#### `statusToUI()` Function
- **Change**: Added UI labels and colors for new statuses
- **Why**: Display proper labels in the UI

#### `groupOrders()` Function
- **Change**: Complete rewrite of order grouping logic
- **Key Logic**:
  ```typescript
  // Completed: ONLY when actually delivered/finished
  else if (
    ((isLaundry && order.status === 'delivered') || 
     (!isLaundry && order.status === 'completed')) &&
    isRecent
  ) {
    grouped.completed.push(order);
  }
  ```
- **Why**: Orders only appear as "Completed" when service is truly done

### 3. `app/api/partner/orders/[id]/status/route.ts`

#### Status Validation Schema
- **Change**: Added new statuses to the validation enum
- **Why**: API needs to accept the new status values

#### SMS Notifications
- **Change**: Added SMS messages for `in_progress`, `out_for_delivery`, `delivered`
- **Why**: Keep customers informed at every step

#### Recurring Subscription Logic
- **Change**: Fixed visit counter to only increment on true completion
- **Before**:
  ```typescript
  if (status === 'completed' && order.subscription_id)
  ```
- **After**:
  ```typescript
  const isLaundry = order.service_type === 'LAUNDRY'
  const isTrulyComplete = (isLaundry && status === 'delivered') || 
                          (!isLaundry && status === 'completed')
  
  if (isTrulyComplete && order.subscription_id)
  ```
- **Why**: Prevent double-counting visits, only count when truly complete

### 4. `supabase/migrations/009_order_status_improvements.sql`
- **Change**: Updated database CHECK constraint to allow new statuses
- **Why**: Database needs to accept the new status values
- **Backward Compatibility**: Kept legacy uppercase statuses during transition period

## Testing Checklist

- [ ] Test laundry order flow through all statuses
- [ ] Test cleaning order flow through all statuses
- [ ] Verify "Completed" section only shows delivered/finished orders
- [ ] Verify "In Progress" section shows orders being worked on
- [ ] Test recurring subscription visit counter increments correctly
- [ ] Test SMS notifications for each status
- [ ] Test backward compatibility with existing orders

## Deployment Notes

### Database Migration
```bash
# Run the migration
npx supabase migration up
```

### Backward Compatibility
- The migration includes legacy status values for backward compatibility
- Existing orders with old statuses will still work
- New orders should use the new lowercase status values

### Partner Communication
Partners using the status update API should be notified that:
- New statuses are available: `in_progress`, `out_for_delivery`, `delivered`
- For laundry orders, they should now use `delivered` when items are returned to customer
- For cleaning orders, they should continue using `completed` when service is finished

## Benefits

1. **Clarity for Customers**: Orders only show as "Completed" when actually done
2. **Better Tracking**: More granular status updates throughout the order lifecycle
3. **Accurate Analytics**: Recurring subscription visit counters now accurate
4. **Improved Communication**: SMS notifications at each step keep customers informed

## Future Improvements

1. **Status Transition Validation**: Add state machine to prevent invalid status transitions
2. **Partner Dashboard**: Update partner interface to use new statuses
3. **Analytics Dashboard**: Update reports to use new completion criteria
4. **Customer Notifications**: Add push notifications in addition to SMS
