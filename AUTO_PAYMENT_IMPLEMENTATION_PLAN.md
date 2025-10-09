# Automatic Payment Collection - Implementation Plan

**Date:** October 8, 2025  
**Goal:** Enable automatic payment collection after quotes with minimal code changes

---

## Summary

Transform payment flow from manual customer action to automatic charging:
- **Partner quotes** → Admin approval required → Auto-charge
- **Admin quotes** → Auto-charge immediately
- **Customer experience** → Receives receipt (no manual payment)

---

## Files to Modify/Create (8 Total)

### New Files (4)
1. `supabase/migrations/029_auto_payment.sql` - Database changes
2. `app/api/admin/quotes/approve/route.ts` - Approval endpoint
3. `app/admin/quotes/page.tsx` - Approval queue UI
4. `AUTO_PAYMENT_IMPLEMENTATION_PLAN.md` - This file

### Modified Files (4)
5. `app/api/partner/orders/[id]/quote/route.ts` - Change to pending approval
6. `app/api/admin/orders/[id]/update-quote/route.ts` - Add auto-charge
7. `app/api/admin/orders/route.ts` - Add approval filter
8. `app/orders/[id]/pay/page.tsx` - Redirect only
9. `app/terms/page.tsx` - Add payment authorization language

---

## Implementation Steps

- [ ] 1. Create database migration
- [ ] 2. Modify partner quote endpoint (remove SMS payment link)
- [ ] 3. Modify admin quote endpoint (add auto-charge)
- [ ] 4. Create admin approval endpoint
- [ ] 5. Create admin approval queue UI
- [ ] 6. Update admin orders API (add filter)
- [ ] 7. Update terms & conditions
- [ ] 8. Update payment page (redirect)
- [ ] 9. Test implementation
- [ ] 10. Deploy to production

---

## Testing Checklist

- [ ] Partner submits quote → Order shows in approval queue
- [ ] Admin approves quote → Customer charged automatically
- [ ] Admin sets quote directly → Customer charged immediately
- [ ] Receipt SMS sent after charge
- [ ] Payment failure logged properly
- [ ] Old payment page redirects correctly

---

## Rollback Plan

If issues arise:
1. Revert code: `git revert HEAD`
2. Change one line in partner quote: `status: 'awaiting_payment'`
3. Re-enable manual payment flow

---

## Key Changes

**Before:**
```
Partner Quote → awaiting_payment → SMS with link → Customer clicks → Payment
Admin Quote → awaiting_payment → SMS with link → Customer clicks → Payment
```

**After:**
```
Partner Quote → pending_admin_approval → Admin approves → Auto-charge → Receipt
Admin Quote → Auto-charge immediately → Receipt
```

---

## Database Schema Changes

```sql
ALTER TABLE orders ADD:
  - pending_admin_approval BOOLEAN
  - approved_by UUID
  - auto_charged_at TIMESTAMP

CREATE TABLE payment_retry_log:
  - order_id
  - error
  - retry_at
```

---

## API Changes

**New Endpoint:**
- `POST /api/admin/quotes/approve` - Approve and auto-charge

**Modified Endpoints:**
- Partner quote: Sets `pending_admin_approval` instead of `awaiting_payment`
- Admin quote: Auto-charges after setting quote
- Admin orders: Filters for pending approval

---

## Next Steps

Ready to implement! Starting with database migration...
