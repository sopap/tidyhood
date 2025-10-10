# Partner SMS Agent Integration Guide

This guide shows you exactly where to add calls to trigger agent-initiated SMS messages.

## Overview

The SMS agent automatically sends messages when order statuses change. You need to add notification calls in your existing API routes that update order status.

## Integration Points

### 1. When Admin Assigns Partner to Order

**File**: `app/api/admin/orders/[id]/assign-partner/route.ts` (or wherever you assign partners)

```typescript
import { notifyPartnerNewOrder, getPartnerForOrder } from '@/lib/partner-sms/notifications';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { partnerId } = await request.json();
  
  // Your existing code to assign partner
  await db
    .from('orders')
    .update({ partner_id: partnerId })
    .eq('id', params.id);
  
  // ✅ NEW: Send SMS to partner
  const partner = await getPartnerForOrder(params.id);
  const order = await db.from('orders').select('*').eq('id', params.id).single();
  
  if (partner && order.data) {
    await notifyPartnerNewOrder(order.data, partner);
  }
  
  return NextResponse.json({ success: true });
}
```

### 2. When Quote is Approved (Ready for Delivery)

**File**: `app/api/admin/quotes/approve/route.ts` (or similar)

```typescript
import { notifyPartnerReadyForDelivery, getPartnerForOrder } from '@/lib/partner-sms/notifications';

export async function POST(request: Request) {
  const { orderId } = await request.json();
  
  // Your existing code to approve quote & charge customer
  await db
    .from('orders')
    .update({ 
      status: 'ready_for_delivery',
      quote_approved: true 
    })
    .eq('id', orderId);
  
  // Charge customer here...
  
  // ✅ NEW: Notify partner order is ready for delivery
  const partner = await getPartnerForOrder(orderId);
  const order = await db.from('orders').select('*').eq('id', orderId).single();
  
  if (partner && order.data) {
    await notifyPartnerReadyForDelivery(order.data, partner);
  }
  
  return NextResponse.json({ success: true });
}
```

### 3. When Order is Completed

**File**: `app/api/orders/[id]/complete/route.ts` (or similar)

```typescript
import { notifyPartnerOrderComplete, getPartnerForOrder } from '@/lib/partner-sms/notifications';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // Your existing code to mark order complete
  await db
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', params.id);
  
  // ✅ NEW: Notify partner order is complete
  const partner = await getPartnerForOrder(params.id);
  const order = await db.from('orders').select('*').eq('id', params.id).single();
  
  if (partner && order.data) {
    await notifyPartnerOrderComplete(order.data, partner);
  }
  
  return NextResponse.json({ success: true });
}
```

## Alternative: Use a Single Hook Function

If you want cleaner code, create a single function that handles all status changes:

**File**: `lib/partner-sms/hooks.ts`

```typescript
import { 
  notifyPartnerNewOrder, 
  notifyPartnerReadyForDelivery, 
  notifyPartnerOrderComplete,
  getPartnerForOrder 
} from './notifications';
import { getServiceClient } from '@/lib/db';

/**
 * Call this whenever order status changes
 * It will automatically send the right SMS based on status
 */
export async function handleOrderStatusChange(
  orderId: string,
  newStatus: string,
  oldStatus?: string
): Promise<void> {
  const db = getServiceClient();
  
  // Get order and partner
  const { data: order } = await db
    .from('orders')
    .select('*, pickup_slot:pickup_slots(*), delivery_slot:delivery_slots(*), service_address:addresses(*)')
    .eq('id', orderId)
    .single();
  
  if (!order) return;
  
  const partner = await getPartnerForOrder(orderId);
  if (!partner) return;
  
  // Trigger appropriate notification based on status
  switch (newStatus) {
    case 'assigned_to_partner':
    case 'pending_pickup':
      await notifyPartnerNewOrder(order, partner);
      break;
      
    case 'ready_for_delivery':
    case 'scheduled_for_delivery':
      await notifyPartnerReadyForDelivery(order, partner);
      break;
      
    case 'completed':
    case 'delivered':
      await notifyPartnerOrderComplete(order, partner);
      break;
  }
}
```

Then in any API route that changes status:

```typescript
import { handleOrderStatusChange } from '@/lib/partner-sms/hooks';

// After updating status in database:
await handleOrderStatusChange(orderId, 'ready_for_delivery');
```

## Testing Without SMS

For testing, you can log messages instead of sending:

```typescript
// In lib/partner-sms/notifications.ts, add this flag at the top:
const DRY_RUN = process.env.SMS_DRY_RUN === 'true';

// Then in each notify function, wrap the sendAgentMessage call:
if (DRY_RUN) {
  console.log('[DRY RUN] Would send SMS:', { phone: partner.phone, message });
} else {
  await sendAgentMessage(partner.phone, messageType, data);
}
```

Set `SMS_DRY_RUN=true` in your `.env.local` for testing.

## Checklist

- [ ] Add notification call when partner is assigned to order
- [ ] Add notification call when quote is approved
- [ ] Add notification call when order is completed
- [ ] Test with `SMS_DRY_RUN=true` to see console logs
- [ ] Configure Twilio webhook URL
- [ ] Test full flow with real SMS

## Example Flow

1. Admin assigns order to partner → Partner receives: "🧺 New laundry order..."
2. Partner texts "CONFIRM" → Agent: "✅ Pickup confirmed..."
3. Partner texts "PICKED UP" → Agent: "📊 What's the actual weight?"
4. Partner texts "18" → Agent: "💰 Quote: $31.50 for 18 lbs. Reply OK..."
5. Partner texts "OK" → Agent: "✅ Quote submitted..."
6. Admin approves quote → Partner receives: "🚗 Ready for delivery..."
7. Partner texts "CONFIRM" → Agent: "✅ Delivery confirmed..."
8. After delivery → Partner receives: "🎉 Order complete!"

That's it! The agent handles the conversation automatically between these trigger points.
