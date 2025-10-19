# Capacity UX Redesign - Implementation Guide

**Start Date:** October 18, 2025  
**Status:** In Progress  
**Goal:** Fix critical UX issues and add bulk management tools

## Confirmed Features

Based on user requirements:
- ✅ Allow wizard editing after preview
- ✅ Add capacity templates (Standard Week, Busy Week, etc.)
- ✅ Include bulk delete functionality

## Implementation Phases

### Phase 1: Customer-Facing Fixes (PRIORITY 0)
**Goal:** Remove confusion, show only available slots

**Files to Modify:**
- `components/booking/SlotPicker.tsx` - Remove capacity badges
- `app/api/slots/route.ts` - Filter out full slots
- `lib/slots.ts` - Update utility functions

**Changes:**
1. Remove all capacity indicators (the "30", badge warnings)
2. Filter slots where `available_units === 0`
3. Clean time slot buttons only
4. Better empty state message

**Status:** 🔄 In Progress

---

### Phase 2: Admin-Facing Fixes (PRIORITY 1)
**Goal:** Clear capacity display, better scannability

**Files to Modify:**
- `app/admin/capacity/page.tsx` - Redesign table/cards
- `app/api/admin/capacity/slots/route.ts` - Update response format
- `lib/capacity.ts` - Add helper functions

**Changes:**
1. Fix capacity format: "X/Y booked" instead of confusing "0 / 10 orders" + "30"
2. Color coding: Green (available), Red (full)
3. Group slots by date
4. Add inline quick actions (Increase, Edit, Delete)

**Status:** ⏳ Pending

---

### Phase 3: Bulk Creation Wizard (PRIORITY 1)
**Goal:** 60x faster slot creation (30 min → 30 sec)

**Files to Create:**
- `app/admin/capacity/quick-setup/page.tsx` - Wizard UI
- `app/api/admin/capacity/bulk-create/route.ts` - Bulk API
- `lib/capacity-templates.ts` - Template definitions

**Features:**
- Multi-step wizard (5 steps)
- Partner multi-select
- Date range picker
- Time slot patterns (all-day, morning-afternoon, custom)
- Capacity templates (Standard Week, Busy Week, Weekend, Holiday)
- Preview with edit capability
- Bulk creation in transaction

**Status:** ⏳ Pending

---

### Phase 4: Bulk Delete & Data Fixes (PRIORITY 2)
**Goal:** Admin efficiency and data consistency

**Files to Modify:**
- `app/admin/capacity/page.tsx` - Add checkboxes & bulk actions
- `app/api/admin/capacity/bulk-delete/route.ts` - New endpoint
- `supabase/migrations/034_fix_partner_defaults.sql` - Data migration

**Changes:**
1. Checkbox selection system
2. Bulk delete with confirmation
3. Fix partner defaults (set to 1 order/slot)
4. Audit existing slot data

**Status:** ⏳ Pending

---

## Success Metrics

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Customer UX Clarity | 3/10 | 9/10 | 🔄 |
| Admin Setup Time | 30 min | 30 sec | ⏳ |
| Data Consistency | 3 sources | 1 source | ⏳ |
| User Satisfaction | Low | High | ⏳ |

---

## Implementation Log

### 2025-10-18 23:25 - Started Phase 1
- Beginning with customer-facing fixes
- Removing capacity display from SlotPicker
- Filtering full slots from API response

---

## Testing Checklist

### Phase 1 - Customer View
- [ ] No capacity numbers visible to customers
- [ ] Full slots don't appear in slot list
- [ ] Clean time slot buttons (no badges)
- [ ] Empty state shows clear message
- [ ] Mobile responsive

### Phase 2 - Admin View  
- [ ] Capacity shows "X/Y booked" format
- [ ] No mysterious "30"
- [ ] Color coding works (green/red)
- [ ] Slots grouped by date
- [ ] Quick actions functional
- [ ] Mobile responsive

### Phase 3 - Bulk Creation
- [ ] Multi-partner selection works
- [ ] Date range validation
- [ ] Time patterns generate correctly
- [ ] Templates load properly
- [ ] Preview calculation accurate
- [ ] Can edit before creating
- [ ] Bulk creation successful
- [ ] Transaction rollback on error
- [ ] Mobile responsive

### Phase 4 - Data & Bulk Delete
- [ ] Partner defaults updated to 1
- [ ] Existing data audited
- [ ] Checkbox selection works
- [ ] Bulk delete validates (no bookings)
- [ ] Confirmation dialog clear
- [ ] Successful deletion

---

## Rollback Plan

If issues arise:
1. **Phase 1**: Revert SlotPicker.tsx, restore original API filter
2. **Phase 2**: Revert admin page, use original table
3. **Phase 3**: Remove wizard route, keep manual creation
4. **Phase 4**: Restore original partner values

---

## Notes

- All datetime operations use ET timezone (lib/timezone.ts)
- LAUNDRY uses "orders", CLEANING uses "minutes"
- Maintain accessibility throughout
- Test on mobile devices
- Consider performance with 100+ slots
